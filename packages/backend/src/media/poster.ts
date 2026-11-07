// Share posters (1080×1440 PNG) for articles, made for phones: saved from the page or long-pressed in
// chat apps. Same font pipeline as the share cards; the QR code opens the article on the site.
import { createHash } from "node:crypto";
import { renderSVG } from "uqr";
import { SITE } from "@aihot/site";
import { EDITORIAL_RED } from "@aihot/site/brand/identity.ts";
import { brandMark, clamp, FALLBACK_FONTS, h, nameMark, OG_FAMILY, renderPng, SITE_HOST, type Node } from "./og.ts";

export const POSTER_TEMPLATE_VERSION = "poster-2026-11-07.triadica";
const WIDTH = 1080;
const HEIGHT = 1440;

export interface Poster {
  url: string;
  kicker: string;
  title: string;
  summary: string | null;
  source: string;
  date: string;
  score: number | null;
}

const INK = "#171719";
const ACCENT = EDITORIAL_RED;

async function tree(p: Poster): Promise<Node> {
  const k = OG_FAMILY !== "Noto Sans SC" ? 1.75 : 1;
  const title = clamp(p.title, Math.round(72 * k));
  const len = [...title].length;
  const titleSize = len > 48 * k ? 58 : len > 30 * k ? 66 : 76;
  // The summary takes the room the title leaves.
  const summary = p.summary ? clamp(p.summary, Math.round((len > 48 * k ? 120 : len > 30 * k ? 150 : 180) * k)) : null;
  const qr = `data:image/svg+xml;base64,${Buffer.from(renderSVG(p.url, { border: 0, ecc: "M", blackColor: INK, whiteColor: "#ffffff" })).toString("base64")}`;
  return h(
    "div",
    {
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      flexDirection: "column",
      padding: "84px 88px 72px",
      fontFamily: OG_FAMILY,
      color: INK,
      backgroundColor: "#ffffff",
    },
    [
      h("div", { display: "flex", alignItems: "center", justifyContent: "space-between" }, [
        (await brandMark("wordmark.svg", 50)) ?? nameMark(44, INK, ACCENT),
        h("div", { display: "flex", fontSize: 26, color: "#5d5d67" }, p.date),
      ]),
      h("div", { display: "flex", alignItems: "center", marginTop: 96 }, [
        h("div", { width: 12, height: 12, borderRadius: 999, backgroundColor: ACCENT, marginRight: 16 }),
        h("div", { display: "flex", fontSize: 30, fontWeight: 700, color: ACCENT, letterSpacing: 1 }, clamp(p.kicker, Math.round(20 * k))),
        p.score !== null
          ? h("div", { display: "flex", marginLeft: 20, padding: "4px 16px", borderRadius: 999, backgroundColor: "rgba(181,31,56,0.08)", fontSize: 26, color: "#B51F38" }, `Destacada · ${Math.round(p.score)} puntos`)
          : null,
      ].filter(Boolean)),
      h("div", { display: "flex", marginTop: 30, fontSize: titleSize, fontWeight: 700, lineHeight: 1.3, color: INK }, title),
      summary ? h("div", { display: "flex", marginTop: 36, fontSize: 34, lineHeight: 1.7, color: "#323237" }, summary) : null,
      h("div", { display: "flex", marginTop: 36, fontSize: 28, color: "#5d5d67" }, clamp(`Fuente: ${p.source}`, Math.round(34 * k))),
      h("div", { display: "flex", flex: 1 }),
      h(
        "div",
        { display: "flex", alignItems: "center", padding: "36px 40px", borderRadius: 32, backgroundColor: "#ffffff", boxShadow: "0 1px 2px rgba(31,27,28,0.06), 0 12px 32px rgba(31,27,28,0.07)" },
        [
          h("img", { width: 200, height: 200 }, undefined, { src: qr, width: 200, height: 200 }),
          h("div", { display: "flex", flexDirection: "column", marginLeft: 44, flex: 1 }, [
            h("div", { display: "flex", fontSize: 36, fontWeight: 700, color: INK }, "Escanea el código QR"),
            h("div", { display: "flex", marginTop: 14, fontSize: 28, lineHeight: 1.5, color: "#5d5d67" }, "Lee la nota completa, la traducción y el enlace al original"),
            h("div", { display: "flex", marginTop: 22, fontSize: 26, color: ACCENT }, SITE_HOST),
          ]),
        ],
      ),
      h("div", { display: "flex", justifyContent: "center", marginTop: 40, fontSize: 24, color: "#98a4a7" }, `${SITE.name} · ${SITE.tagline}`),
    ].filter(Boolean),
  );
}

export function posterEtag(p: Poster): string {
  return createHash("sha256").update(POSTER_TEMPLATE_VERSION).update(FALLBACK_FONTS.join()).update(JSON.stringify(p)).digest("hex").slice(0, 24);
}

/** PNG bytes for a poster, from the disk cache when this exact poster was rendered before. */
export async function renderPoster(p: Poster): Promise<{ png: Buffer; etag: string }> {
  const etag = posterEtag(p);
  return { png: await renderPng(`poster-${etag}`, { width: WIDTH, height: HEIGHT }, () => tree(p)), etag };
}
