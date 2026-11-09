// The weekly edition as an HTML email: an editorial newsletter with the week's lead, its picture,
// an index of every theme and each theme's entries, with a picture per entry when the report has one.
// Mail clients keep HTML primitive: nested tables, inline styles and no stylesheets, webfonts or flex.
// Everything the edition holds is escaped here; the composer sends the same entries as plain text.

export interface EmailEntry {
  /** The item's public id; only needed to match the issue's lead item. */
  id: string;
  title: string;
  summary: string | null;
  sourceName: string;
  url: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  firstParty: boolean;
  highlight: boolean;
}

export interface EmailSection {
  label: string;
  entries: EmailEntry[];
}

export interface EmailIssue {
  key: string;
  /** The issue's place among the weekly editions ("N.º 1"). */
  number: number;
  headline: string;
  overview: string | null;
  /** The front page's link: the lead item, else the edition itself. */
  leadUrl: string;
  coverUrl: string | null;
  coverCaption: string | null;
  generatedAt: Date;
  readingMinutes: number;
  editionUrl: string;
  /** Entries shown in all: the lead plus the sections' own. */
  entryCount: number;
  sections: EmailSection[];
}

export interface EmailOptions {
  unsubscribeUrl: string;
  /** A test send: the footer says so and no unsubscribe link is offered. */
  preview?: boolean;
}

const INK = "#171719";
const INK_2 = "#323237";
const INK_3 = "#505059";
const INK_4 = "#5d5d67";
const ACCENT = "#B51F38";
const LINE = "#dadadd";
const LINE_SOFT = "#ececef";
const BG = "#f5f5f7";
const SANS = "Arial,Helvetica,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** What a reader sees of a summary, without the markup a publisher may have left in it. */
function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): string {
  const text = plainText(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.!?…-]+$/, "")}…`;
}

const ZONE = "America/Mexico_City";
const longDate = (date: Date) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: ZONE }).format(date);
const shortDate = (date: Date | null) => date
  ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: ZONE }).format(date).replace(/\.$/, "")
  : "";

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((w) => w.length > 1);
  return (words.slice(0, 2).map((w) => [...w][0]).join("") || "·").toUpperCase();
}

function chip(label: string, color: string, background: string): string {
  return `<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:2px;background-color:${background};color:${color};font-size:9px;line-height:1.5;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">${escapeHtml(label)}</span>`;
}

function entryRow(entry: EmailEntry): string {
  const source = entry.sourceName || "Latido";
  const meta = [escapeHtml(source), escapeHtml(shortDate(entry.publishedAt))].filter(Boolean).join(" · ");
  const chips = [
    entry.highlight ? chip("Destacado", "#ffffff", ACCENT) : "",
    entry.firstParty ? chip("Oficial", INK_2, BG) : "",
  ].join("");
  const title = `<a href="${escapeHtml(entry.url)}" style="text-decoration:none;color:${INK};">`
    + `<span style="font-family:${SERIF};font-size:17px;line-height:1.32;font-weight:700;color:${INK};">${escapeHtml(entry.title)}</span></a>`;
  const summary = entry.summary
    ? `<div style="margin-top:5px;font-family:${SANS};font-size:13px;line-height:1.5;color:${INK_3};">${escapeHtml(clip(entry.summary, 190))}</div>`
    : "";
  const picture = entry.imageUrl
    ? `<a href="${escapeHtml(entry.url)}" style="text-decoration:none;"><img src="${escapeHtml(entry.imageUrl)}" width="104" height="78" alt="" style="display:block;width:104px;height:78px;object-fit:cover;border:0;border-radius:3px;"></a>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="104" height="78" align="center" valign="middle" bgcolor="${ACCENT}" style="width:104px;height:78px;border-radius:3px;font-family:${SERIF};font-size:24px;font-weight:700;color:#ffffff;">${escapeHtml(initials(source))}</td></tr></table>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>`
    + `<td width="104" valign="top" style="width:104px;padding:14px 16px 14px 0;border-top:1px solid ${LINE_SOFT};">${picture}</td>`
    + `<td valign="top" style="padding:14px 0 16px 0;border-top:1px solid ${LINE_SOFT};">`
    + `<div style="font-family:${SANS};font-size:10.5px;line-height:1.5;letter-spacing:0.09em;text-transform:uppercase;color:${INK_4};">${meta}${chips}</div>`
    + `<div style="margin-top:4px;">${title}</div>${summary}`
    + `</td></tr></table>`;
}

function sectionBlock(section: EmailSection, index: number): string {
  const number = String(index + 1).padStart(2, "0");
  return `<tr><td style="padding:26px 32px 0 32px;">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`
    + `<tr><td style="border-top:1px solid #c9c9d0;padding-top:10px;font-family:${SANS};font-size:11px;line-height:1.4;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:${ACCENT};">`
    + `<span style="color:${INK_2};">${number}</span>&nbsp;&nbsp;${escapeHtml(section.label)}</td></tr></table>`
    + section.entries.map(entryRow).join("")
    + `</td></tr>`;
}

function preheaderText(issue: EmailIssue): string {
  return clip(issue.overview ?? issue.headline, 140);
}

function htmlBody(issue: EmailIssue, options: EmailOptions): string {
  const themes = issue.sections.map((s) => s.label).join(" · ");
  const leadImage = issue.coverUrl
    ? `<tr><td style="padding:18px 32px 0 32px;"><a href="${escapeHtml(issue.leadUrl)}" style="text-decoration:none;">`
      + `<img src="${escapeHtml(issue.coverUrl)}" width="536" alt="" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:2px;"></a>`
      + (issue.coverCaption ? `<div style="padding-top:6px;font-family:${SANS};font-size:11px;line-height:1.45;color:${INK_4};">${escapeHtml(clip(issue.coverCaption, 140))}</div>` : "")
      + `</td></tr>` : "";
  const preview = options.preview
    ? `<tr><td style="padding:0 32px;"><div style="margin-top:14px;padding:9px 12px;border-radius:3px;background-color:#fff6e5;font-family:${SANS};font-size:12px;line-height:1.5;color:#886100;">Correo de prueba: así llegará el boletín semanal a los suscriptores.</div></td></tr>`
    : "";
  const footer = options.preview
    ? `<p style="margin:0;">Este es un correo de prueba del boletín semanal de Latido. No se envió a la lista de suscriptores.</p>`
    : `<p style="margin:0;">Recibes este correo porque confirmaste tu suscripción al boletín semanal de Latido.</p>
       <p style="margin:8px 0 0 0;"><a href="${escapeHtml(options.unsubscribeUrl)}" style="color:${INK_4};text-decoration:underline;">Cancelar suscripción</a> · <a href="${escapeHtml(issue.editionUrl)}" style="color:${INK_4};text-decoration:underline;">Ver en el navegador</a></p>`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Latido · Boletín semanal · N.º ${issue.number}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:${BG};">${escapeHtml(preheaderText(issue))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}" style="background-color:${BG};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid ${LINE};">
<tr><td bgcolor="${ACCENT}" style="height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
${preview}
<tr><td style="padding:26px 32px 0 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="bottom">
      <div style="font-family:'Helvetica Neue',Helvetica,${SANS};font-size:27px;line-height:1;font-weight:900;letter-spacing:0.18em;color:${INK};">LATIDO<span style="color:${ACCENT};">.</span></div>
      <div style="padding-top:7px;font-family:${SANS};font-size:10px;line-height:1.4;letter-spacing:0.24em;text-transform:uppercase;color:${INK_4};">Tecnología · negocios · energía · movilidad</div>
    </td>
    <td valign="bottom" align="right" style="font-family:${SANS};font-size:11px;line-height:1.55;color:${INK_4};">
      <div style="font-weight:700;color:${ACCENT};letter-spacing:0.12em;text-transform:uppercase;">Boletín semanal</div>
      <div>N.º ${issue.number} · ${escapeHtml(longDate(issue.generatedAt))}</div>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding:16px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:2px solid ${INK};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:22px 32px 0 32px;">
  <div style="padding-bottom:8px;font-family:${SANS};font-size:10.5px;line-height:1.4;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:${ACCENT};">Lo más importante de la semana</div>
  <a href="${escapeHtml(issue.leadUrl)}" style="text-decoration:none;color:${INK};">
    <h1 style="margin:0;font-family:${SERIF};font-size:30px;line-height:1.18;font-weight:700;letter-spacing:-0.01em;color:${INK};">${escapeHtml(issue.headline)}</h1>
  </a>
</td></tr>
${leadImage}
${issue.overview ? `<tr><td style="padding:14px 32px 0 32px;font-family:${SANS};font-size:15px;line-height:1.6;color:${INK_2};">${escapeHtml(clip(issue.overview, 420))}</td></tr>` : ""}
<tr><td style="padding:16px 32px 0 32px;font-family:${SANS};font-size:12px;line-height:1.7;color:${INK_4};">
  <span style="font-weight:700;color:${INK};">En esta edición</span> · ${escapeHtml(themes)}
</td></tr>
${issue.sections.map(sectionBlock).join("")}
<tr><td align="center" style="padding:30px 32px 8px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${INK}" style="border-radius:3px;">
    <a href="${escapeHtml(issue.editionUrl)}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:14px;font-weight:700;letter-spacing:0.02em;color:#ffffff;text-decoration:none;">Leer la edición completa &rarr;</a>
  </td></tr></table>
  <div style="padding-top:10px;font-family:${SANS};font-size:12px;line-height:1.5;color:${INK_4};">${issue.entryCount} notas · ${issue.sections.length} temas · ${issue.readingMinutes} min de lectura</div>
</td></tr>
<tr><td style="padding:20px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:16px 32px 26px 32px;font-family:${SANS};font-size:11.5px;line-height:1.65;color:${INK_4};">
  ${footer}
  <p style="margin:12px 0 0 0;color:#8a8a93;">Latido · latido.news</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

function textBody(issue: EmailIssue, options: EmailOptions): string {
  const lines = [
    `LATIDO · BOLETÍN SEMANAL · N.º ${issue.number} · ${longDate(issue.generatedAt)}`,
    "",
    issue.headline,
    "",
    issue.overview ? clip(issue.overview, 420) : "",
    "",
    `Portada: ${issue.leadUrl}`,
    "",
  ];
  for (const section of issue.sections) {
    lines.push(section.label.toUpperCase(), "");
    for (const entry of section.entries) {
      const meta = [entry.sourceName, shortDate(entry.publishedAt), entry.highlight ? "Destacado" : ""].filter(Boolean).join(" · ");
      lines.push(`· ${entry.title}`, `  ${meta}`, `  ${entry.url}`);
      if (entry.summary) lines.push(`  ${clip(entry.summary, 220)}`);
      lines.push("");
    }
  }
  lines.push(`Leer la edición completa: ${issue.editionUrl}`, "");
  if (options.preview) {
    lines.push("Este es un correo de prueba del boletín semanal de Latido. No se envió a la lista de suscriptores.");
  } else {
    lines.push("Recibes este correo porque confirmaste tu suscripción al boletín semanal de Latido.");
    lines.push(`Cancelar suscripción: ${options.unsubscribeUrl}`);
  }
  lines.push("", "Latido · latido.news");
  return lines.filter((line, i, all) => line !== "" || (i > 0 && all[i - 1] !== "")).join("\n");
}

export function renderIssueEmail(issue: EmailIssue, options: EmailOptions): { subject: string; html: string; text: string } {
  return {
    subject: `Latido semanal: ${clip(issue.headline, 150)}`,
    html: htmlBody(issue, options),
    text: textBody(issue, options),
  };
}
