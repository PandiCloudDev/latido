// 1200×630 share images. satori lays out text with Noto Sans SC (assets/og-fonts) and emits glyphs
// as paths, so rasterising with sharp needs no system fonts. Output is cached on disk by content.
import { readdirSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import satori from "satori";
import sharp from "sharp";
import { config, REPO_ROOT } from "../config.ts";
import { SITE } from "@aihot/site";
import { LOCALE } from "@aihot/site/locale";

export const OG_TEMPLATE_VERSION = "og-2026-11-06.latido";
const WIDTH = 1200;
const HEIGHT = 630;
const CACHE_DIR = path.join(config.dataDir, "ogcache");

export interface OgCard {
  kicker: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  /** Small emphasised figure on the right (e.g. an item score). */
  badge?: { value: string; label: string } | null;
  accent?: "teal" | "hot" | "amber";
}

let fontsPromise: Promise<Array<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }>> | null = null;

const FONT_DIR = path.join(REPO_ROOT, "assets/og-fonts");

/**
 * Fonts a site adds beside Noto Sans SC for the characters its subset lacks (traditional and Japanese
 * kanji, kana, Hangul, accented Latin): `<name>-400.ttf` and `<name>-700.ttf` in assets/og-fonts. satori
 * takes a glyph the first font has no outline for from the next one, so they come after Noto Sans SC.
 */
export function fallbackFontFiles(files: string[]): string[] {
  return files.filter((f) => /^.+-(400|700)\.ttf$/.test(f) && !f.startsWith("noto-sans-sc-")).sort();
}

/** None by default: the share images and their cache keys are then what they were without this. */
export const FALLBACK_FONTS = fallbackFontFiles(readdirSync(FONT_DIR));

function fonts() {
  fontsPromise ??= Promise.all([
    readFile(path.join(FONT_DIR, "noto-sans-sc-400.ttf")),
    readFile(path.join(FONT_DIR, "noto-sans-sc-700.ttf")),
    ...FALLBACK_FONTS.map((f) => readFile(path.join(FONT_DIR, f))),
  ]).then(([regular, bold, ...more]) => [
    { name: "Noto Sans SC", data: regular!, weight: 400, style: "normal" },
    { name: "Noto Sans SC", data: bold!, weight: 700, style: "normal" },
    ...more.map((data, i) => ({ name: FALLBACK_FONTS[i]!.replace(/-(400|700)\.ttf$/, ""), data, weight: (FALLBACK_FONTS[i]!.endsWith("-700.ttf") ? 700 : 400) as 400 | 700, style: "normal" as const })),
  ]);
  return fontsPromise;
}

/**
 * The family the cards set text in: Inter when the site adds it for Latin text (the Noto Sans SC subset
 * lacks ñ and capital accented letters); Noto Sans SC still draws any glyph Inter lacks.
 */
export const OG_FAMILY = LOCALE.language !== "zh" && FALLBACK_FONTS.includes("inter-700.ttf") ? "inter" : "Noto Sans SC";

export type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown } };
export const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({ type, props: { style, children, ...extra } });

/** The site's host as shown on cards. */
export const SITE_HOST = new URL(config.siteUrl).host;

/** Width over height of an SVG: its viewBox, else its width and height. */
function aspect(svg: string): number {
  const box = /<svg[^>]*\sviewBox="([^"]+)"/.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if (box?.length === 4 && box[2]! > 0 && box[3]! > 0) return box[2]! / box[3]!;
  const width = Number.parseFloat(/<svg[^>]*\swidth="([^"]+)"/.exec(svg)?.[1] ?? "");
  const height = Number.parseFloat(/<svg[^>]*\sheight="([^"]+)"/.exec(svg)?.[1] ?? "");
  return width > 0 && height > 0 ? width / height : 1;
}

const wordmarks = new Map<string, Promise<{ src: string; aspect: number } | null>>();

/**
 * A wordmark of the site (site/brand/<file>, e.g. wordmark-dark.svg for the dark cards) as an
 * image of the given height; null when the pack has none, and the card sets the name in type instead.
 */
export async function brandMark(file: string, height: number): Promise<Node | null> {
  let mark = wordmarks.get(file);
  if (!mark) {
    mark = readFile(path.join(REPO_ROOT, "site/brand", file), "utf8").then(
      (svg) => ({ src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, aspect: aspect(svg) }),
      () => null,
    );
    wordmarks.set(file, mark);
  }
  const found = await mark;
  return found && h("img", { height }, undefined, { src: found.src, height, width: Math.round(height * found.aspect) });
}

const PULSE_PATH = "M76 280H170L202 226L236 330L280 136L326 374L360 280H436";
const svgSrc = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
/** The pulse icon (site/brand/logo.svg) as an image source. */
const PULSE_MARK = svgSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d63"/><stop offset="1" stop-color="#c8213d"/></linearGradient></defs><rect width="512" height="512" rx="116" fill="url(#g)"/><path d="${PULSE_PATH}" fill="none" stroke="#fff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
/** A long, faint heartbeat line across the card. */
const PULSE_LINE = svgSrc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 220"><defs><linearGradient id="l" x1="0" x2="1"><stop offset="0" stop-color="#ff5a6e" stop-opacity="0"/><stop offset="0.55" stop-color="#ff5a6e" stop-opacity="0.42"/><stop offset="1" stop-color="#ff5a6e" stop-opacity="0.1"/></linearGradient></defs><path d="M0 130H520L560 92L600 168L660 24L730 206L776 130H1200" fill="none" stroke="url(#l)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

/** The site's mark: the pulse icon and "latido" with ".news" in the accent colour. */
export function nameMark(size: number, color: string, dot: string): Node {
  return h("div", { display: "flex", alignItems: "center" }, [
    h("img", { width: size * 1.15, height: size * 1.15, marginRight: size * 0.34 }, undefined, { src: PULSE_MARK, width: Math.round(size * 1.15), height: Math.round(size * 1.15) }),
    h("div", { display: "flex", fontSize: size, fontWeight: 700, color, letterSpacing: -0.5 }, "latido"),
    h("div", { display: "flex", fontSize: size, fontWeight: 400, color: dot, letterSpacing: -0.3 }, ".news"),
  ]);
}

const ACCENTS = { teal: "#ff5a6e", hot: "#ff9a5c", amber: "#e2b454" } as const;

export function clamp(text: string, max: number) {
  const chars = [...text.replace(/\s+/g, " ").trim()];
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : chars.join("");
}

async function tree(card: OgCard): Promise<Node> {
  const accent = ACCENTS[card.accent ?? "teal"];
  // Latin text takes about half the width of a Chinese character, so it gets twice the characters.
  const latin = OG_FAMILY !== "Noto Sans SC";
  const k = latin ? 1.75 : 1;
  const title = clamp(card.title, Math.round(64 * k));
  const long = [...title].length > 40 * k, mid = [...title].length > 24 * k;
  const titleSize = long ? 50 : mid ? 58 : 66;
  return h(
    "div",
    {
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      flexDirection: "column",
      padding: "64px 72px",
      fontFamily: OG_FAMILY,
      color: "#f3eceb",
      backgroundColor: "#120d10",
      backgroundImage: "radial-gradient(circle at 92% 0%, rgba(255,90,110,0.30), rgba(18,13,16,0) 45%), radial-gradient(circle at 0% 100%, rgba(200,33,61,0.32), rgba(18,13,16,0) 52%)",
      position: "relative",
    },
    [
      h("img", { position: "absolute", left: 0, bottom: -18, width: WIDTH, height: 150 }, undefined, { src: PULSE_LINE, width: WIDTH, height: 150 }),
      h("div", { display: "flex", alignItems: "center", justifyContent: "space-between" }, [
        (await brandMark("wordmark-dark.svg", 40)) ?? nameMark(34, "#f3eceb", "#ff5a6e"),
        h("div", { display: "flex", fontSize: 24, color: "#9c8f8d" }, OG_FAMILY === "inter" ? "Tecnología · México y Latinoamérica" : SITE_HOST),
      ]),
      h("div", { display: "flex", marginTop: 56, alignItems: "center" }, [
        h("div", { width: 10, height: 10, borderRadius: 999, backgroundColor: accent, marginRight: 14 }),
        h("div", { display: "flex", fontSize: 28, fontWeight: 700, color: accent, letterSpacing: 1 }, clamp(card.kicker, Math.round(30 * k))),
      ]),
      h("div", { display: "flex", flex: 1, marginTop: 22, gap: 40 }, [
        h("div", { display: "flex", flexDirection: "column", flex: 1 }, [
          h("div", { display: "flex", fontSize: titleSize, fontWeight: 700, lineHeight: 1.25, color: "#ffffff" }, title),
          // Long titles take three lines; the summary then gets one line so nothing reaches the footer.
          card.subtitle ? h("div", { display: "flex", marginTop: 22, fontSize: 28, lineHeight: 1.5, color: "#c9bdbb" }, clamp(card.subtitle, Math.round((long ? 26 : mid ? 50 : 78) * k))) : null,
        ].filter(Boolean)),
        card.badge
          ? h("div", { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 170, height: 170, borderRadius: 999, border: `6px solid ${accent}` }, [
              h("div", { display: "flex", fontSize: 58, fontWeight: 700, color: "#ffffff" }, card.badge.value),
              h("div", { display: "flex", fontSize: 22, color: "#9c8f8d" }, card.badge.label),
            ])
          : null,
      ].filter(Boolean)),
      card.meta ? h("div", { display: "flex", fontSize: 24, color: "#9c8f8d", borderTop: "1px solid rgba(243,236,235,0.12)", paddingTop: 22 }, clamp(card.meta, Math.round(70 * k))) : null,
    ].filter(Boolean),
  );
}

/**
 * Palette PNG at full quality with dithering: the flat card and its soft glow look the same as a
 * truecolour PNG at about half the bytes (117 → 62 KB for a typical article card). Share crawlers
 * keep getting PNG.
 */
const OG_PNG = { compressionLevel: 9, palette: true, quality: 100, dither: 1, effort: 10 } as const;

const inflight = new Map<string, Promise<Buffer>>();

/**
 * PNG bytes of a share image, from the disk cache (`name`.png) when it was rendered before. Concurrent
 * requests share one render; the file is written aside and moved into place, never read half-written.
 */
export function renderPng(name: string, size: { width: number; height: number }, tree: () => Promise<Node>): Promise<Buffer> {
  let job = inflight.get(name);
  if (!job) {
    job = render(path.join(CACHE_DIR, `${name}.png`), size, tree).finally(() => inflight.delete(name));
    inflight.set(name, job);
  }
  return job;
}

async function render(file: string, size: { width: number; height: number }, tree: () => Promise<Node>): Promise<Buffer> {
  try {
    return await readFile(file);
  } catch {
    // not cached yet
  }
  const svg = await satori(await tree() as never, { ...size, fonts: await fonts() });
  const png = await sharp(Buffer.from(svg)).png(OG_PNG).toBuffer();
  await mkdir(CACHE_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, png);
  await rename(tmp, file);
  return png;
}

export function ogEtag(card: OgCard): string {
  // Added font names go into the key, so an image drawn before a font was added is drawn again; with none the key is unchanged.
  return createHash("sha256").update(OG_TEMPLATE_VERSION).update(FALLBACK_FONTS.join()).update(JSON.stringify(card)).digest("hex").slice(0, 24);
}

/** PNG bytes for a card, from the disk cache when this exact card was rendered before. */
export async function renderOg(card: OgCard): Promise<{ png: Buffer; etag: string }> {
  const etag = ogEtag(card);
  return { png: await renderPng(etag, { width: WIDTH, height: HEIGHT }, () => tree(card)), etag };
}
