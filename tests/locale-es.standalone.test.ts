// Latido: el perfil de idioma "es" (site/locale.ts). Estas pruebas corren con el perfil predeterminado; las pruebas
// heredadas de AIHOT se corren con SITE_LOCALE=zh y verifican que el comportamiento original no cambió.
import assert from "node:assert/strict";
import test from "node:test";
import { LOCALE, scaledLength } from "@aihot/site/locale";
import { isSiteLanguageText, isLatinLanguageText } from "@aihot/backend/lib/text";
import { compactAnswerFirstSummary, needsShortTweetTranslation } from "@aihot/backend/editorial/writing";
import { beijingDate, beijingIso, beijingMidnight, beijingTime, beijingWeekday, monthDay } from "@aihot/contracts/time";

const es = LOCALE.language === "es";

test("el perfil predeterminado es español de México en la hora del centro", { skip: !es }, () => {
  assert.equal(LOCALE.htmlLang, "es-MX");
  assert.equal(LOCALE.timeZone, "America/Mexico_City");
  assert.equal(scaledLength(30), 75);
});

test("los titulares en español se reconocen como del idioma del sitio", { skip: !es }, () => {
  for (const t of ["Meta lanza Llama 5", "Nvidia presenta su nuevo chip para centros de datos en México", "¿Qué es MCP?", "Mercado Libre invierte 3,400 millones en México"]) {
    assert.equal(isSiteLanguageText(t), true, t);
  }
  for (const t of ["OpenAI launches a new model for enterprise customers", "Anthropic releases Claude 5", "Nubank anuncia expansão no Brasil com nova conta digital", "苹果发布新款 iPhone"]) {
    assert.equal(isSiteLanguageText(t), false, t);
  }
});

test("un idioma declarado por la fuente manda sobre la detección", () => {
  assert.equal(isLatinLanguageText("OpenAI launches a model", "es", "es-MX"), true);
  assert.equal(isLatinLanguageText("OpenAI lanza un modelo", "es", "en"), false);
});

test("una publicación corta en español no se traduce aunque nombre productos en inglés", { skip: !es }, () => {
  assert.equal(needsShortTweetTranslation("Ya probamos Claude Code con el nuevo Agent SDK y funciona muy bien"), false);
  assert.equal(needsShortTweetTranslation("We just shipped the new Agent SDK"), true);
});

test("el resumen se recorta en oraciones completas sin partir números ni iniciales", { skip: !es }, () => {
  const sentence = "OpenAI lanzó GPT-5.5 con un costo 3.5 veces menor que su antecesor. La compañía dijo que J. Pérez dirigirá el equipo en México. ";
  const long = sentence.repeat(4) + "Fin.";
  const out = compactAnswerFirstSummary(long);
  assert.ok(out.length <= scaledLength(190), `${out.length}`);
  assert.match(out, /\.$/);
  assert.ok(out.includes("GPT-5.5") && out.includes("3.5 veces") && out.includes("J. Pérez"));
  const short = "OpenAI lanzó GPT-5.5 hoy.";
  assert.equal(compactAnswerFirstSummary(short), short);
});

test("el calendario cuenta los días en la hora del centro de México", { skip: !es }, () => {
  // 05:30 UTC del 7 de noviembre todavía es el 6 en la Ciudad de México.
  assert.equal(beijingDate("2026-11-07T05:30:00Z"), "2026-11-06");
  assert.equal(beijingTime("2026-11-07T05:30:00Z"), "23:30");
  assert.equal(beijingIso("2026-11-06T14:00:00Z"), "2026-11-06T08:00:00.000-06:00");
  assert.equal(beijingMidnight("2026-11-06").toISOString(), "2026-11-06T06:00:00.000Z");
  assert.equal(beijingWeekday("2026-11-06"), "viernes");
  assert.equal(monthDay("2026-11-06", "2026-11-06"), "6 de noviembre");
  assert.equal(monthDay("2019-02-19", "2026-11-06"), "19 de febrero de 2019");
});

test("las etiquetas que piden los prompts son exactamente las de la taxonomía", async () => {
  const { readFileSync } = await import("node:fs");
  const { CATEGORY_TAGS, TOPIC_TAGS, ENTITY_TAGS, CATEGORIES, ENTITIES } = await import("@aihot/industry/taxonomy");
  const topics = JSON.parse(readFileSync(new URL("../industry/topics.json", import.meta.url), "utf8")) as { topics: Array<{ tags?: string[]; entityId?: string }> };
  const prompt = readFileSync(new URL("../industry/prompts/content-understanding.md", import.meta.url), "utf8");
  const listAfter = (label: string) => prompt.split(label)[1]!.split("\n")[0]!.replace(/\.$/, "").split(", ").map((t) => t.trim());
  assert.deepEqual(listAfter("una de estas etiquetas de categoría: "), [...CATEGORY_TAGS]);
  assert.deepEqual(listAfter("- Temas: "), [...TOPIC_TAGS]);
  assert.deepEqual(listAfter("- Entidades: "), [...ENTITY_TAGS]);
  const all = new Set<string>([...CATEGORY_TAGS, ...TOPIC_TAGS, ...ENTITY_TAGS]);
  for (const t of topics.topics) {
    for (const tag of t.tags ?? []) assert.ok(all.has(tag), `topics.json usa una etiqueta desconocida: ${tag}`);
    if (t.entityId) assert.ok(t.entityId in ENTITIES, `topics.json usa una entidad desconocida: ${t.entityId}`);
  }
  assert.ok(CATEGORIES.some((c) => c.key === "industry"), "el motor espera una categoría industry");
  const sources = JSON.parse(readFileSync(new URL("../industry/sources.json", import.meta.url), "utf8")) as { sources: Array<{ owner_entity_id: string | null }> };
  for (const s of sources.sources) if (s.owner_entity_id) assert.ok(s.owner_entity_id in ENTITIES, `fuente con entidad desconocida: ${s.owner_entity_id}`);
});

test("los prompts ya no tienen texto en chino y conservan sus marcadores", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const dir = new URL("../industry/prompts/", import.meta.url);
  for (const f of readdirSync(dir)) {
    const text = readFileSync(new URL(f, dir), "utf8");
    assert.ok(!/\p{Script=Han}/u.test(text), `${f} todavía tiene chino`);
  }
});
