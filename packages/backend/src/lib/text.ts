import { decodeHTMLStrict } from "entities/decode";
import { LOCALE } from "@aihot/site/locale";

export function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** A declared language wins; otherwise Han text is Chinese only without Japanese or Korean script. */
export function isChineseText(text: string, language?: string | null): boolean {
  const declared = language?.toLowerCase().split(/[-_]/)[0];
  if (declared === "zh") return true;
  if (declared && !["und", "unknown", "other", "zxx"].includes(declared)) return false;
  return /\p{Script=Han}/u.test(text) && !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text);
}

// Function words per language: a text in a Latin-script language is told apart by how many of its words are
// these, not by accents alone (tech headlines in Spanish often carry none, and English ones borrow "café").
const FUNCTION_WORDS: Record<"es" | "en" | "pt", ReadonlySet<string>> = {
  es: new Set(("de la que el en y los del se las por un para con una su al lo como más pero sus le ya este " +
    "porque esta entre cuando muy sin sobre también hasta hay donde desde todo nos durante todos uno les ni contra " +
    "otros ese eso ante ellos esto antes algunos qué unos otro otras otra él tanto esa estos mucho nada muchos cual " +
    "poco ella estar estas algunas algo es son fue ha han está están será puede según tras hoy así sólo solo cómo " +
    // Headline verbs and words: short titles often carry no function word at all ("Meta lanza Llama 5").
    "lanza presenta anuncia llega estrena compra adquiere invierte nuevo nueva nuevos nuevas ahora disponible " +
    "millones empresa empresas usuarios inteligencia artificial datos mexicana mexicano latinoamérica méxico").split(" ")),
  en: new Set(("the of and to in is that for on with as was are be by this it from at an or have has not but which " +
    "their they will its can new more about after into than also how what who all would been were you your our we " +
    "launches launch says said".split(" "))),
  pt: new Set(("de que não o os da do das dos em um uma para com por se é são mais ao à pelo pela também você está " +
    "foi ser ter seu sua então isso como já nos nas ou quando muito sem sobre até há onde desde todo durante " +
    "lança anuncia expansão nova novo conta brasil brasileira empresa usuários dados").split(" ")),
};
const SPANISH_MARKS = /[ñ¿¡]/i;

function functionWordShare(text: string, lang: "es" | "en" | "pt"): number {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (!words.length) return 0;
  const set = FUNCTION_WORDS[lang];
  return words.filter((w) => set.has(w)).length / words.length;
}

/**
 * Whether a Latin-script text is written in `lang`. A declared language wins; otherwise the language whose
 * function words cover the most of the text, with ñ ¿ ¡ as a tie-breaker for Spanish. Words shared by Spanish
 * and Portuguese ("de", "que") count for both, so the comparison is between the two shares, not a threshold alone.
 */
export function isLatinLanguageText(text: string, lang: "es" | "en" | "pt", language?: string | null): boolean {
  const declared = language?.toLowerCase().split(/[-_]/)[0];
  if (declared && !["und", "unknown", "other", "zxx"].includes(declared)) return declared === lang;
  if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(text)) return false;
  const share = { es: functionWordShare(text, "es"), en: functionWordShare(text, "en"), pt: functionWordShare(text, "pt") };
  const mine = share[lang];
  const others = (Object.keys(share) as Array<keyof typeof share>).filter((k) => k !== lang).map((k) => share[k]);
  if (lang === "es" && SPANISH_MARKS.test(text) && mine >= Math.max(...others)) return true;
  return mine > 0 && others.every((o) => mine > o * 1.15);
}

/**
 * Whether the text is already in the site's language (site/locale.ts), so it needs no translation and can be shown
 * as is. With the site in Chinese this is exactly the upstream `isChineseText`.
 */
export function isSiteLanguageText(text: string, language?: string | null): boolean {
  return LOCALE.language === "zh" ? isChineseText(text, language) : isLatinLanguageText(text, LOCALE.language, language);
}

export function truncate(s: string, max: number, ellipsis = "…"): string {
  const chars = [...s];
  if (chars.length <= max) return s;
  return chars.slice(0, Math.max(0, max - ellipsis.length)).join("").trimEnd() + ellipsis;
}

/**
 * Removes element markup while keeping `>` inside quoted attribute values: a link
 * title such as `title="Platforms > Xbox"` must not end the tag there and leak the
 * rest of it into the text.
 * This follows the small part of the HTML tokenizer needed here: an equals sign
 * starts a quoted value only after an attribute name. Comments, doctypes and
 * `< a>` keep the old first-`>` behavior because they are not element tags here.
 */
export function stripTagMarkup(html: string, replacement = " "): string {
  let out = "";
  let at = 0;
  while (at < html.length) {
    const start = html.indexOf("<", at);
    if (start < 0) return out + html.slice(at);
    out += html.slice(at, start);

    const firstEnd = html.indexOf(">", start + 1);
    if (firstEnd < 0) return out + html.slice(start);
    let end = firstEnd;
    // Only element attributes need quote handling; other markup keeps its existing behavior.
    if (/^<\/?[a-z]/i.test(html.slice(start, start + 3))) {
      let quote = "";
      let tagName = true;
      let attributeName = false;
      let value: "none" | "start" | "unquoted" = "none";
      let i = start + 1;
      for (; i < html.length; i += 1) {
        const char = html[i]!;
        if (quote) {
          if (char === quote) quote = "";
        } else if (char === ">") {
          end = i;
          break;
        } else if (value === "unquoted") {
          if (/[\t\n\f\r ]/.test(char)) value = "none";
        } else if (value === "start") {
          if (/[\t\n\f\r ]/.test(char)) continue;
          value = "none";
          if (char === '"' || char === "'") quote = char;
          else value = "unquoted";
        } else if (tagName) {
          if (/[\t\n\f\r ]/.test(char)) tagName = false;
          else if (char === "/") continue;
          else if (char === "=") {
            tagName = false;
            attributeName = true;
          }
        } else if (char === "=") {
          if (attributeName) {
            attributeName = false;
            value = "start";
          } else {
            // A bare `=` is an attribute name in malformed HTML, not a value prefix.
            attributeName = true;
          }
        } else if (!/[\t\n\f\r ]/.test(char)) {
          attributeName = true;
        }
      }
      // An unfinished quoted tag consumes the rest of the document in the browser tokenizer.
      if (i === html.length) return out + replacement;
    }
    // Preserve the old result for the empty `<>` construct, which the old regex did not match.
    out += end === start + 1 ? "<>" : replacement;
    at = end + 1;
  }
  return out;
}

/**
 * Character references, numeric and named, as browsers read them in text; only those ending in a semicolon,
 * so an address keeps its "&copy=". Feeds escape text twice ("AI&amp;#8217;s", code shown as "&amp;lt;"),
 * and the text they mean is what readers expect, so "&amp;" goes first.
 */
export function decodeEntities(s: string): string {
  return decodeHTMLStrict(s.replace(/&amp;/g, "&"));
}

/** The text of HTML: without scripts and styles, every tag a word boundary, references decoded, whitespace collapsed. */
export function stripTags(html: string): string {
  return collapseWhitespace(decodeEntities(stripTagMarkup(html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " "))));
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // XML 1.0 forbids most control characters.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/** Share of CJK characters among letters; used to decide whether a title needs translation. */
export function cjkRatio(s: string): number {
  const letters = s.match(/[\p{L}]/gu) ?? [];
  if (letters.length === 0) return 0;
  const cjk = s.match(/[㐀-鿿豈-﫿]/g) ?? [];
  return cjk.length / letters.length;
}

export function guessLanguage(s: string): "zh" | "en" | "other" {
  const ratio = cjkRatio(s);
  if (ratio > 0.3) return "zh";
  if (/[a-z]/i.test(s)) return "en";
  return "other";
}
