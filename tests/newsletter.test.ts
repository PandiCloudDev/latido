import "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { CATEGORY_TAGS } from "@aihot/backend/editorial/vocabulary";
import { installModules } from "@aihot/backend/modules";
import { listTopicDefinitions } from "@aihot/backend/publication/topics";
import { buildApp } from "../apps/api/src/app.ts";
import { EDITORIAL_SERVER, readEditorialDisplay, saveAd, saveTopic } from "../modules/editorial-controls/server.ts";
import type { Mail } from "../modules/editorial-controls/mail.ts";
import { renderIssueEmail, type EmailEntry, type EmailIssue } from "../modules/editorial-controls/issue-email.ts";
import { confirmSubscription, deliverIssue, listSubscribers, newsletterCounts, purgeNewsletter, requestSubscription, selectEmailSections, unsubscribe, updatePreferences } from "../modules/editorial-controls/newsletter.ts";

after(closeDb);

test("weekly email requires confirmation, delivers at most once, and respects unsubscribe", async () => {
  const out: Mail[] = [];
  const mailer = async (mail: Mail) => { out.push(mail); };
  await Promise.all([
    requestSubscription(" Reader@Example.test ", mailer),
    requestSubscription("reader@example.test", mailer),
  ]);
  await requestSubscription("pending@example.test", mailer);
  assert.equal(out.length, 2);
  assert.equal(out[0]?.to, "reader@example.test");
  const token = out[0]!.text.match(/\/confirmar#([\w-]+)/)?.[1];
  const expired = out[1]!.text.match(/\/confirmar#([\w-]+)/)?.[1];
  assert.ok(token && expired);
  const [stored] = await sql<{ confirmation_hash: string }[]>`SELECT confirmation_hash FROM newsletter_subscribers WHERE email = 'reader@example.test'`;
  assert.notEqual(stored?.confirmation_hash, token);
  await sql`UPDATE newsletter_subscribers SET requested_at = now() - interval '49 hours' WHERE email = 'pending@example.test'`;
  assert.equal(await confirmSubscription(expired), false);
  assert.equal(await confirmSubscription(token), true);
  assert.equal(await confirmSubscription(token), false);
  await requestSubscription("reader@example.test", mailer);
  await purgeNewsletter();
  const issue = { key: "2026-W47", generatedAt: new Date(Date.now() + 1000), headline: "La semana en Latido", leadParagraph: null, sections: [] };
  await Promise.all([deliverIssue(issue, mailer), deliverIssue(issue, mailer)]);
  assert.deepEqual(out.map((m) => m.to), ["reader@example.test", "pending@example.test", "reader@example.test"]);
  assert.deepEqual(await newsletterCounts(), { active: 1, pending: 0, sent: 1, failed: 0 });
  assert.deepEqual((await listSubscribers()).map((s) => [s.email, !!s.confirmedAt, s.sent, !!s.lastSentAt]), [["reader@example.test", true, 1, true]]);
  const optOut = out[2]!.text.match(/\/baja#([\w-]+)/)?.[1];
  assert.ok(optOut);
  await unsubscribe(optOut);
  await unsubscribe(optOut);
  assert.deepEqual(await deliverIssue({ ...issue, key: "2026-W48" }, mailer), { sent: 0, failed: 0 });
  const [remaining] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM newsletter_subscribers`;
  assert.equal(remaining?.count, 0);
});

test("daily and weekly subscriptions only receive the edition they chose, and preferences change", async () => {
  const out: Mail[] = [];
  const mailer = async (mail: Mail) => { out.push(mail); };
  await requestSubscription("daily@example.test", mailer, "daily");
  await requestSubscription("weekly@example.test", mailer, "weekly");
  for (const mail of out) {
    const token = mail.text.match(/\/confirmar#([\w-]+)/)?.[1];
    assert.ok(token);
    assert.equal(await confirmSubscription(token), true);
  }
  out.length = 0;
  const daily = { key: "2026-11-10", generatedAt: new Date(Date.now() + 1000), headline: "El día en Latido", leadParagraph: "Resumen del día.", sections: [] };
  assert.deepEqual(await deliverIssue(daily, mailer, null, "daily"), { sent: 1, failed: 0 });
  assert.deepEqual(out.map((m) => m.to), ["daily@example.test"]);
  assert.match(out[0]!.subject, /^Latido diario:/);
  out.length = 0;
  const weekly = { key: "2026-W46", generatedAt: new Date(Date.now() + 1000), headline: "La semana en Latido", leadParagraph: null, sections: [] };
  assert.deepEqual(await deliverIssue(weekly, mailer, null, "weekly"), { sent: 1, failed: 0 });
  assert.deepEqual(out.map((m) => m.to), ["weekly@example.test"]);
  assert.match(out[0]!.subject, /^Latido semanal:/);

  const [dailyRow] = await sql<{ unsubscribe_key: string }[]>`SELECT unsubscribe_key FROM newsletter_subscribers WHERE email = 'daily@example.test'`;
  assert.equal(await updatePreferences(dailyRow!.unsubscribe_key, "weekly"), true);
  const [changed] = await sql<{ frequency: string }[]>`SELECT frequency FROM newsletter_subscribers WHERE email = 'daily@example.test'`;
  assert.equal(changed?.frequency, "weekly");
  await unsubscribe(dailyRow!.unsubscribe_key);
  const [weeklyRow] = await sql<{ unsubscribe_key: string }[]>`SELECT unsubscribe_key FROM newsletter_subscribers WHERE email = 'weekly@example.test'`;
  await unsubscribe(weeklyRow!.unsubscribe_key);
});

test("the weekly email is an HTML newsletter with every theme and its pictures", () => {
  const themes = ["Inteligencia artificial", "Productos y gadgets", "Negocios y startups", "Regulación y política digital", "Ciberseguridad", "Videojuegos"];
  const entry = (theme: number, n: number): EmailEntry => ({
    id: `item-${theme}-${n}`,
    title: `Tema ${theme} · nota ${n}`,
    summary: `Resumen de la nota ${n} del tema ${theme}.`,
    sourceName: `Fuente ${theme}`,
    url: `https://latido.news/items/item-${theme}-${n}`,
    imageUrl: `https://latido.news/api/img-proxy?u=https%3A%2F%2Fexample.test%2F${theme}${n}.jpg&mode=card&exp=1&sig=abc`,
    publishedAt: new Date("2026-11-06T15:00:00Z"),
    firstParty: n === 1,
    highlight: n === 1 && theme === 1,
  });
  const sections = themes.map((label, t) => ({ label, entries: [1, 2, 3, 4, 5].map((n) => entry(t + 1, n)) }));
  const lead = sections[0]!.entries[0]!;
  const picked = selectEmailSections(sections.flatMap((s) => s.entries.map((entry) => ({ label: s.label, entry }))), lead.id);
  assert.equal(picked.length, themes.length, "todos los temas deben llegar al correo");
  assert.equal(picked.reduce((n, s) => n + s.entries.length, 0), 19, "además de la portada, 19 notas");
  assert.ok(!picked.some((s) => s.entries.some((e) => e.id === lead.id)), "la portada no se repite en las listas");
  assert.ok(!picked.some((s) => s.entries.some((e) => e.id === "item-2-4")), "el correo se corta en 20 notas");
  const issue: EmailIssue = {
    key: "2026-W45",
    number: 1,
    headline: lead.title,
    overview: "La semana en tecnología, negocios y movilidad.",
    leadUrl: lead.url,
    coverUrl: "https://latido.news/api/img-proxy?u=https%3A%2F%2Fexample.test%2Fcover.jpg&mode=full&exp=1&sig=abc",
    coverCaption: null,
    generatedAt: new Date("2026-11-09T16:00:00Z"),
    readingMinutes: 8,
    editionUrl: "https://latido.news/weekly/2026-W45",
    entryCount: 20,
    sections: picked,
  };
  const { subject, html, text } = renderIssueEmail(issue, { unsubscribeUrl: "https://latido.news/boletin/baja#token" });
  assert.match(subject, /^Latido semanal: Tema 1 · nota 1/);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /LATIDO/);
  assert.match(html, /Boletín semanal/);
  for (const label of themes) assert.ok(html.includes(label), `falta el tema ${label}`);
  // One entry per theme each round; the lead is the cover, so 19 more fill the 20.
  assert.equal((html.match(/Tema \d · nota /g) ?? []).length, 20);
  assert.ok(!html.includes("Tema 2 · nota 4"), "el correo no debe pasar de 20 notas");
  assert.ok(html.includes("https://latido.news/api/img-proxy?u=https%3A%2F%2Fexample.test%2Fcover.jpg&amp;mode=full"));
  assert.ok(html.includes("https://latido.news/api/img-proxy?u=https%3A%2F%2Fexample.test%2F21.jpg&amp;mode=card"));
  assert.ok(html.includes("https://latido.news/items/item-1-1"));
  assert.match(html, /Cancelar suscripción/);
  assert.match(html, /https:\/\/latido\.news\/boletin\/baja#token/);
  assert.match(text, /Tema 6 · nota 3/);
  assert.match(text, /Cancelar suscripción/);
  const unsafe = renderIssueEmail({ ...issue, headline: '<script>alert("x")</script>' }, { unsubscribeUrl: "https://latido.news/boletin/baja#token" });
  assert.ok(!unsafe.html.includes("<script>"));
  assert.ok(unsafe.html.includes("&lt;script&gt;"));
});

test("the daily email uses daily labels and offers the preferences link", () => {
  const issue: EmailIssue = {
    kind: "daily",
    key: "2026-11-10",
    number: null,
    headline: "Lo que pasó ayer",
    overview: "El resumen del día anterior.",
    leadUrl: "https://latido.news/daily/2026-11-10",
    coverUrl: null,
    coverCaption: null,
    generatedAt: new Date("2026-11-10T14:00:00Z"),
    readingMinutes: 5,
    editionUrl: "https://latido.news/daily/2026-11-10",
    entryCount: 1,
    sections: [{ label: "Energía", entries: [{
      id: "item-1",
      title: "Una nota del día",
      summary: "Resumen de la nota.",
      sourceName: "Fuente",
      url: "https://latido.news/items/item-1",
      imageUrl: null,
      publishedAt: new Date("2026-11-10T13:00:00Z"),
      firstParty: false,
      highlight: true,
    }] }],
  };
  const { subject, html, text } = renderIssueEmail(issue, {
    unsubscribeUrl: "https://latido.news/boletin/baja#token",
    preferencesUrl: "https://latido.news/boletin/preferencias#token",
  });
  assert.match(subject, /^Latido diario: Lo que pasó ayer/);
  assert.match(html, /Boletín diario/);
  assert.match(html, /Lo más importante del día/);
  assert.match(html, /Cambiar preferencias/);
  assert.match(html, /https:\/\/latido\.news\/boletin\/preferencias#token/);
  assert.match(text, /LATIDO · BOLETÍN DIARIO/);
  assert.match(text, /Cambiar preferencias: https:\/\/latido\.news\/boletin\/preferencias#token/);
});

test("public signup starts closed and the editorial controls require authentication", async () => {
  installModules([EDITORIAL_SERVER]);
  const app = await buildApp();
  try {
    assert.equal((await app.inject({ method: "POST", url: "/api/site/newsletter/signup", payload: { email: "test@example.test" } })).statusCode, 503);
    assert.equal((await app.inject({ method: "GET", url: "/api/site/newsletter/unsubscribe?token=fake" })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: "/api/admin/editorial" })).statusCode, 401);
    assert.equal((await app.inject({ method: "GET", url: "/api/admin/editorial/newsletter/subscribers" })).statusCode, 401);
    assert.deepEqual(await readEditorialDisplay(), { signupUrl: null, ad: null });
    const ads = await app.inject({ method: "GET", url: "/ads.txt" });
    assert.equal(ads.statusCode, 200);
    assert.match(ads.headers["content-type"]!, /^text\/plain/);
    assert.equal(ads.body, "google.com, pub-7039079143625258, DIRECT, f08c47fec0942fa0\n");
    const topic = { enabled: true, slug: "test-editorial-topic", name: "Prueba", definition: "Cobertura de prueba", group: "field", tags: [CATEGORY_TAGS[0]] };
    // The same choice the admin presents works with both site profiles.
    await saveTopic(topic, "test", true);
    assert.ok((await listTopicDefinitions()).some((t) => t.slug === topic.slug));
    await saveTopic({ ...topic, enabled: false }, "test", false);
    assert.ok(!(await listTopicDefinitions()).some((t) => t.slug === topic.slug));
  } finally {
    await app.close();
  }
});

test("the homepage serves just the chosen ad and keeps the other format as a draft", async () => {
  const fixed = { advertiser: "Ejemplo", text: "Mensaje", url: "https://example.test", action: "Leer" };
  const legacy = { enabled: true, ...fixed };
  await sql`INSERT INTO settings (key, value) VALUES ('editorial.ad.home', ${sql.json(legacy)})`;
  assert.deepEqual((await readEditorialDisplay()).ad, { mode: "fixed", ...fixed });
  assert.throws(() => saveAd({ ...legacy, url: "javascript:alert(1)" }, "test"));
  assert.throws(() => saveAd({ ...legacy, mode: "adsense", adsenseSlot: "" }, "test"));
  assert.throws(() => saveAd({ ...legacy, mode: "adsense", adsenseSlot: "<script>" }, "test"));
  const saved = await saveAd({ ...legacy, mode: "adsense", adsenseSlot: "0012345678" }, "test");
  assert.deepEqual((await readEditorialDisplay()).ad, { mode: "adsense", slot: "0012345678" });
  await saveAd({ ...saved, mode: "fixed" }, "test");
  assert.deepEqual((await readEditorialDisplay()).ad, { mode: "fixed", ...fixed });
  await saveAd({ ...saved, enabled: false }, "test");
  assert.equal((await readEditorialDisplay()).ad, null);
});
