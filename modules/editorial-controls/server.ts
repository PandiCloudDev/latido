import { z } from "zod";
import { sql, type Db } from "@aihot/backend/db";
import { audit, Conflict } from "@aihot/backend/audit";
import { actorOf } from "@aihot/backend/admin/auth";
import { CATEGORY_TAGS, TOPIC_TAGS } from "@aihot/backend/editorial/vocabulary";
import { defineServerModule } from "@aihot/backend/modules";
import { TOPICS } from "@aihot/backend/publication/topics";
import { adminHandler } from "../../apps/api/src/routes/admin-auth.ts";
import { smtpConfigured } from "./mail.ts";
import {
  canSubscribe, confirmationSchema, confirmSubscription, emailSchema, emptyNewsletter, listSubscribers, NEWSLETTER_KEY,
  newsletterCounts, newsletterFrequencySchema, newsletterSettings, purgeNewsletter, requestSubscription,
  sendLatestDaily, sendLatestEdition, sendTestEdition, unsubscribe, unsubscribeSchema, updatePreferences,
} from "./newsletter.ts";
import { ADSENSE_PUBLISHER, type AdSettings, type EditorialDisplay, type EditorialSettings, type ManagedTopic, type NewsletterSettings } from "./types.ts";

const keys = {
  ad: "editorial.ad.home",
  topics: "editorial.topics",
} as const;

const tags = [...new Set<string>([...CATEGORY_TAGS, ...TOPIC_TAGS])].sort((a, b) => a.localeCompare(b, "es"));
const allowedTags = new Set(tags);
const staticSlugs = new Set(TOPICS.map((topic) => topic.slug));

const emptyAd: AdSettings = { enabled: false, mode: "fixed", advertiser: "", text: "", url: "", action: "", adsenseSlot: "" };

const text = (max: number) => z.string().trim().max(max);
const httpsUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !!u.hostname && !u.username && !u.password;
  } catch {
    return false;
  }
};
const optionalUrl = text(1000).refine((v) => v === "" || httpsUrl(v), "Usa una dirección HTTPS sin credenciales.");
const newsletterSchema = z.object({
  enabled: z.boolean(),
  verified: z.boolean(),
}).refine((v) => !v.enabled || v.verified, "Antes de activar, verifica el formulario, la confirmación, la baja y el aviso de privacidad.");
const adSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["fixed", "adsense"]).default("fixed"),
  advertiser: text(80),
  text: text(220),
  url: optionalUrl,
  action: text(45),
  adsenseSlot: text(20).refine((v) => v === "" || /^\d{1,20}$/.test(v), "Escribe solo el número que aparece en data-ad-slot.").default(""),
}).refine((v) => !v.enabled || v.mode !== "fixed" || !!(v.advertiser && v.text && v.url && v.action), "Completa los campos del anuncio fijo antes de mostrarlo.")
  .refine((v) => !v.enabled || v.mode !== "adsense" || !!v.adsenseSlot, "Agrega el número de la unidad de AdSense antes de mostrarla.");
const topicSchema = z.object({
  slug: text(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones."),
  name: text(80).min(1),
  group: z.enum(["field", "genre"]),
  definition: text(260).min(1),
  tags: z.array(z.string().refine((v) => allowedTags.has(v), "Elige una etiqueta editorial existente.")).min(1).max(12).transform((v) => [...new Set(v)]),
  enabled: z.boolean(),
});

async function setting<T>(key: string, fallback: T, db: Db = sql): Promise<T> {
  const [row] = await db<{ value: T }[]>`SELECT value FROM settings WHERE key = ${key}`;
  return row?.value ?? fallback;
}

async function adSettings(): Promise<AdSettings> {
  const result = adSchema.safeParse(await setting(keys.ad, emptyAd));
  return result.success ? result.data : emptyAd;
}

async function update<T>(key: string, initial: T, actor: string, change: (before: T) => T): Promise<T> {
  const result = await sql.begin(async (tx) => {
    await tx`INSERT INTO settings (key, value) VALUES (${key}, ${tx.json(initial as never)}) ON CONFLICT DO NOTHING`;
    const [row] = await tx<{ value: T }[]>`SELECT value FROM settings WHERE key = ${key} FOR UPDATE`;
    const before = row!.value;
    const after = change(before);
    await tx`UPDATE settings SET value = ${tx.json(after as never)}, updated_at = now(), updated_by = ${actor} WHERE key = ${key}`;
    await audit(actor, "editorial.update", key, null, before, after, { db: tx });
    return { after };
  });
  return result.after;
}

export function saveNewsletter(input: unknown, actor: string) {
  const { enabled } = newsletterSchema.parse(input);
  if (enabled && !smtpConfigured()) throw new Conflict("Configura y prueba un remitente SMTP antes de habilitar las suscripciones.");
  return update<NewsletterSettings>(NEWSLETTER_KEY, emptyNewsletter, actor, (before) => ({
    enabled, enabledAt: enabled ? before.enabledAt ?? new Date().toISOString() : null,
  }));
}

export function saveAd(input: unknown, actor: string) {
  const value = adSchema.parse(input);
  return update(keys.ad, emptyAd, actor, () => value);
}

export function saveTopic(input: unknown, actor: string, create: boolean) {
  const value = topicSchema.parse(input);
  if (staticSlugs.has(value.slug)) throw new Conflict("Esta dirección ya pertenece a un tema del catálogo.");
  return update(keys.topics, [] as ManagedTopic[], actor, (before) => {
    const exists = before.some((t) => t.slug === value.slug);
    if (create && exists) throw new Conflict("Ya existe un tema con esa dirección.");
    if (!create && !exists) throw new Conflict("Ese tema ya no está disponible.");
    if (!exists && before.length >= 100) throw new Conflict("Se alcanzó el límite de temas del panel.");
    return exists ? before.map((t) => t.slug === value.slug ? value : t) : [...before, value];
  });
}

export async function readEditorialDisplay(): Promise<EditorialDisplay> {
  const [newsletter, ad] = await Promise.all([newsletterSettings(), adSettings()]);
  const { enabled, mode, advertiser, text, url, action, adsenseSlot } = ad;
  const placement: EditorialDisplay["ad"] = !enabled ? null : mode === "fixed"
    ? { mode, advertiser, text, url, action } : { mode, slot: adsenseSlot };
  return { signupUrl: canSubscribe(newsletter) ? "/boletin" : null, ad: placement };
}

export const EDITORIAL_SERVER = defineServerModule({
  name: "editorial-controls",
  schedules: [
    { name: "editorial-controls.newsletter", cron: "*/5 * * * *", run: sendLatestEdition, when: smtpConfigured },
    { name: "editorial-controls.daily", cron: "*/5 * * * *", run: sendLatestDaily, when: smtpConfigured },
    { name: "editorial-controls.retention", cron: "45 3 * * *", missed: "once", run: purgeNewsletter },
  ],
  topics: {
    additional: async () => (await setting<ManagedTopic[]>(keys.topics, [])).filter((t) => t.enabled).map((t) => ({
      slug: t.slug, name: t.name, group: t.group, definition: t.definition, tags: t.tags, entityId: null, pattern: null, aliases: [],
    })),
  },
  http(app) {
    app.get("/ads.txt", (_req, reply) => reply.type("text/plain; charset=utf-8").header("Cache-Control", "public, max-age=3600")
      .send(`google.com, ${ADSENSE_PUBLISHER}, DIRECT, f08c47fec0942fa0\n`));
    app.get("/api/site/editorial-display", async (_req, reply) => {
      reply.header("Cache-Control", "public, max-age=30, s-maxage=30, must-revalidate");
      return readEditorialDisplay();
    });
    app.post("/api/site/newsletter/signup", { bodyLimit: 2048 }, async (req, reply) => {
      reply.header("Cache-Control", "no-store");
      if (!canSubscribe(await newsletterSettings())) return reply.code(503).send({ ok: false });
      const parsed = z.object({
        email: emailSchema,
        frequency: newsletterFrequencySchema.default("daily"),
        website: z.string().max(300).optional(),
      }).safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ ok: false });
      if (!parsed.data.website) await requestSubscription(parsed.data.email, undefined, parsed.data.frequency);
      return reply.code(202).send({ ok: true });
    });
    app.post("/api/site/newsletter/preferences", { bodyLimit: 2048 }, async (req, reply) => {
      reply.header("Cache-Control", "no-store");
      const parsed = z.object({ token: unsubscribeSchema, frequency: newsletterFrequencySchema }).safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ ok: false });
      return { ok: await updatePreferences(parsed.data.token, parsed.data.frequency) };
    });
    app.post("/api/site/newsletter/confirm", { bodyLimit: 2048 }, async (req, reply) => {
      reply.header("Cache-Control", "no-store");
      const parsed = z.object({ token: confirmationSchema }).safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ ok: false });
      return { ok: await confirmSubscription(parsed.data.token) };
    });
    app.post("/api/site/newsletter/unsubscribe", { bodyLimit: 2048 }, async (req, reply) => {
      reply.header("Cache-Control", "no-store");
      const parsed = z.object({ token: unsubscribeSchema }).safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ ok: false });
      await unsubscribe(parsed.data.token);
      return { ok: true };
    });
    app.get("/api/admin/editorial", adminHandler(async (): Promise<EditorialSettings> => {
      const [newsletter, ad, topics, counts] = await Promise.all([
        newsletterSettings(), adSettings(), setting<ManagedTopic[]>(keys.topics, []), newsletterCounts(),
      ]);
      return { newsletter: { ...newsletter, smtpConfigured: smtpConfigured(), counts }, ad, topics, tags };
    }));
    app.get("/api/admin/editorial/newsletter/subscribers", adminHandler(async (_req, reply) => {
      reply.header("Cache-Control", "no-store");
      return { subscribers: await listSubscribers() };
    }));
    app.post("/api/admin/editorial/newsletter/test", adminHandler(async (req) => {
      const { email, kind } = z.object({
        email: emailSchema,
        kind: z.enum(["daily", "weekly"]).default("weekly"),
      }).parse(req.body);
      if (!smtpConfigured()) throw new Conflict("Falta configurar el remitente SMTP.");
      try {
        // Sends the newest edition of the chosen kind as subscribers will get it, so the format itself is what gets checked.
        await sendTestEdition(email, kind);
      } catch {
        throw new Conflict("El servidor de correo no aceptó la prueba. Revisa la configuración del remitente.");
      }
      return { ok: true };
    }));
    app.put("/api/admin/editorial/newsletter", adminHandler(async (req, _reply, admin) => saveNewsletter(req.body, actorOf(admin))));
    app.put("/api/admin/editorial/ad", adminHandler(async (req, _reply, admin) => saveAd(req.body, actorOf(admin))));
    app.post("/api/admin/editorial/topics", adminHandler(async (req, _reply, admin) => ({ topics: await saveTopic(req.body, actorOf(admin), true) })));
    app.put("/api/admin/editorial/topics/:slug", adminHandler(async (req, _reply, admin) => {
      const { slug } = req.params as { slug: string };
      const body = z.record(z.string(), z.unknown()).parse(req.body);
      return { topics: await saveTopic({ ...body, slug }, actorOf(admin), false) };
    }));
  },
});
