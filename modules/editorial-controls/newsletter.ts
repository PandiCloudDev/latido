import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { config } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { feedIssues, type FeedIssue } from "@aihot/backend/publication/reports";
import { sendMail, smtpConfigured, type Mailer } from "./mail.ts";
import type { NewsletterSettings } from "./types.ts";

export const NEWSLETTER_KEY = "editorial.newsletter";
export const emptyNewsletter: NewsletterSettings = { enabled: false, enabledAt: null };

export async function newsletterSettings(): Promise<NewsletterSettings> {
  const [row] = await sql<{ value: NewsletterSettings }[]>`SELECT value FROM settings WHERE key = ${NEWSLETTER_KEY}`;
  return row?.value ?? emptyNewsletter;
}

export function canSubscribe(settings: NewsletterSettings) {
  return settings.enabled && smtpConfigured();
}

export const emailSchema = z.string().trim().max(254).toLowerCase().pipe(z.email());
export const confirmationSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const unsubscribeSchema = z.uuid();
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function link(path: string, token: string) {
  // A fragment stays in the browser; the token is submitted in the body, never in access logs.
  return `${config.siteUrl}/boletin/${path}#${token}`;
}

function logMailFailure(message: string) {
  // SMTP errors may include the recipient, raw server responses and connection details.
  console.warn(`[newsletter] ${message}`);
}

export async function requestSubscription(input: string, mailer: Mailer = sendMail): Promise<void> {
  const email = emailSchema.parse(input);
  const token = randomBytes(32).toString("base64url");
  const confirmationHash = hash(token);
  const queued = await sql.begin(async (tx) => {
    // Keep the global ceiling consistent across concurrent requests without storing IP addresses.
    await tx`SELECT pg_advisory_xact_lock(hashtext('latido.newsletter.signup'))`;
    const [rate] = await tx<{ limited: boolean }[]>`
      SELECT count(*) >= 30 AS limited FROM newsletter_subscribers WHERE requested_at > now() - interval '15 minutes'`;
    if (rate?.limited) return false;
    const changed = await tx`
      INSERT INTO newsletter_subscribers (id, email, confirmation_hash, unsubscribe_key)
      VALUES (${randomUUID()}, ${email}, ${confirmationHash}, ${randomUUID()})
      ON CONFLICT (email) DO UPDATE SET confirmation_hash = EXCLUDED.confirmation_hash, requested_at = now()
      WHERE newsletter_subscribers.confirmed_at IS NULL AND newsletter_subscribers.requested_at <= now() - interval '15 minutes'
      RETURNING id`;
    return changed.length > 0;
  });
  if (!queued) return;
  try {
    await mailer({
      to: email,
      subject: "Confirma tu suscripción al boletín de Latido",
      text: [
        "Pediste recibir el boletín semanal de Latido. Abre este enlace y confirma tu suscripción:",
        link("confirmar", token),
        "El enlace vence en 48 horas. Si no pediste este correo, puedes ignorarlo.",
      ].join("\n\n"),
    });
  } catch {
    logMailFailure("No se pudo enviar una confirmación.");
  }
}

export async function confirmSubscription(input: string): Promise<boolean> {
  const token = confirmationSchema.parse(input);
  const rows = await sql`
    UPDATE newsletter_subscribers SET confirmed_at = now(), confirmation_hash = NULL
    WHERE confirmation_hash = ${hash(token)} AND confirmed_at IS NULL AND requested_at > now() - interval '48 hours'
    RETURNING id`;
  return rows.length === 1;
}

export async function unsubscribe(input: string): Promise<void> {
  const key = unsubscribeSchema.parse(input);
  await sql`DELETE FROM newsletter_subscribers WHERE unsubscribe_key = ${key}`;
}

type Recipient = { id: string; email: string; unsubscribe_key: string };

function editionMail(issue: FeedIssue, recipient: Recipient) {
  const headlines = issue.sections.flatMap((section) => section.items).slice(0, 5);
  return {
    to: recipient.email,
    subject: `Latido semanal: ${(issue.headline ?? issue.key).replace(/[\r\n]+/g, " ").slice(0, 160)}`,
    text: [
      "El boletín semanal de Latido",
      issue.headline,
      issue.leadParagraph,
      ...headlines.map(({ title, link: url }) => `${title}\n${url}`),
      `Lee la edición completa: ${config.siteUrl}/weekly/${encodeURIComponent(issue.key)}`,
      `Cancelar suscripción: ${link("baja", recipient.unsubscribe_key)}`,
    ].filter(Boolean).join("\n\n"),
  };
}

export async function deliverIssue(issue: FeedIssue, mailer: Mailer = sendMail) {
  const batch = await sql<Recipient[]>`
    SELECT s.id, s.email, s.unsubscribe_key
    FROM newsletter_subscribers s
    WHERE s.confirmed_at <= ${issue.generatedAt}
      AND NOT EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.issue_key = ${issue.key} AND d.subscriber_id = s.id)
    ORDER BY s.confirmed_at, s.id LIMIT 50`;
  let sent = 0, failed = 0;
  for (let i = 0; i < batch.length; i += 5) {
    await Promise.all(batch.slice(i, i + 5).map(async (candidate) => {
      const [claim] = await sql<Recipient[]>`
        WITH claimed AS (
          INSERT INTO newsletter_deliveries (issue_key, subscriber_id)
          SELECT ${issue.key}, id FROM newsletter_subscribers WHERE id = ${candidate.id} FOR KEY SHARE
          ON CONFLICT DO NOTHING RETURNING subscriber_id
        )
        SELECT s.id, s.email, s.unsubscribe_key FROM newsletter_subscribers s JOIN claimed c ON c.subscriber_id = s.id`;
      if (!claim) return;
      let status: "sent" | "failed";
      try {
        await mailer(editionMail(issue, claim));
        status = "sent";
        sent++;
      } catch {
        status = "failed";
        failed++;
      }
      // Do not retry uncertain delivery automatically: the relay may have accepted the first send.
      await sql`UPDATE newsletter_deliveries SET status = ${status} WHERE issue_key = ${issue.key} AND subscriber_id = ${claim.id}`;
    }));
  }
  if (failed) logMailFailure(`No se pudieron entregar ${failed} copias de la edición semanal.`);
  return { sent, failed };
}

export async function sendLatestEdition() {
  const settings = await newsletterSettings();
  if (!canSubscribe(settings) || !settings.enabledAt) return { sent: 0, failed: 0 };
  const [issue] = await feedIssues("weekly", 1);
  if (!issue || issue.generatedAt < new Date(settings.enabledAt) || Date.now() - issue.generatedAt.getTime() > 48 * 3600_000) {
    return { sent: 0, failed: 0 };
  }
  return deliverIssue(issue);
}

export async function newsletterCounts() {
  const [[list], [delivery]] = await Promise.all([
    sql<{ active: number; pending: number }[]>`SELECT count(*) FILTER (WHERE confirmed_at IS NOT NULL)::int AS active,
      count(*) FILTER (WHERE confirmed_at IS NULL AND requested_at > now() - interval '48 hours')::int AS pending FROM newsletter_subscribers`,
    sql<{ sent: number; failed: number }[]>`SELECT count(*) FILTER (WHERE status = 'sent')::int AS sent,
      count(*) FILTER (WHERE status <> 'sent')::int AS failed FROM newsletter_deliveries WHERE attempted_at > now() - interval '30 days'`,
  ]);
  return { active: list!.active, pending: list!.pending, sent: delivery!.sent, failed: delivery!.failed };
}

export async function purgeNewsletter() {
  await sql`DELETE FROM newsletter_subscribers WHERE confirmed_at IS NULL AND requested_at <= now() - interval '48 hours'`;
  await sql`DELETE FROM newsletter_deliveries WHERE attempted_at <= now() - interval '90 days'`;
}
