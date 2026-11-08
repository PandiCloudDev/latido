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
import { confirmSubscription, deliverIssue, newsletterCounts, purgeNewsletter, requestSubscription, unsubscribe } from "../modules/editorial-controls/newsletter.ts";

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
  const optOut = out[2]!.text.match(/\/baja#([\w-]+)/)?.[1];
  assert.ok(optOut);
  await unsubscribe(optOut);
  await unsubscribe(optOut);
  assert.deepEqual(await deliverIssue({ ...issue, key: "2026-W48" }, mailer), { sent: 0, failed: 0 });
  const [remaining] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM newsletter_subscribers`;
  assert.equal(remaining?.count, 0);
});

test("public signup starts closed and the editorial controls require authentication", async () => {
  installModules([EDITORIAL_SERVER]);
  const app = await buildApp();
  try {
    assert.equal((await app.inject({ method: "POST", url: "/api/site/newsletter/signup", payload: { email: "test@example.test" } })).statusCode, 503);
    assert.equal((await app.inject({ method: "GET", url: "/api/site/newsletter/unsubscribe?token=fake" })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: "/api/admin/editorial" })).statusCode, 401);
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
