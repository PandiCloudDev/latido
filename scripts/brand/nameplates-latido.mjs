// Nameplates de Latido con Inter Black (SIL OFL 1.1), como trazos SVG.
// Uso: node scripts/brand/nameplates-latido.mjs (desde la raíz; requiere Inter Black en /usr/share/fonts/opentype/inter).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/package.json");
const opentype = require("opentype.js");
const buf = readFileSync("/usr/share/fonts/opentype/inter/Inter-Black.otf");
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const H = 220, MARGIN = 12, SIZE = font.unitsPerEm * H / font.tables.os2.sCapHeight; // cap height = H
const NAMEPLATES = {
  daily: [["Latido", false], [" diario", true]],
  weekly: [["Latido", false], [" semanal", true]],
  monthly: [["Latido", false], [" mensual", true]],
  archive: [["Archivo", false], [".", true]],
};
const out = {};
for (const [name, parts] of Object.entries(NAMEPLATES)) {
  let x = MARGIN; const paths = { true: [], false: [] };
  const baseline = H / 2; // caps span -H/2..H/2
  const letter = -0.02 * SIZE; // a slightly tighter set for a masthead
  for (const [text, accent] of parts) {
    for (const ch of text) {
      const g = font.charToGlyph(ch);
      paths[accent].push(g.getPath(x, baseline, SIZE).toPathData(1));
      x += g.advanceWidth * SIZE / font.unitsPerEm + letter;
    }
  }
  const half = H / 2 + MARGIN + 30; // room for the accent on í
  out[name] = { viewBox: `0 ${(-half).toFixed(1)} ${(x - letter + MARGIN).toFixed(1)} ${(2 * half).toFixed(1)}`, accent: paths.true.join(" "), ink: paths.false.join(" ") };
}
const target = "site/brand/nameplates";
for (const [name, n] of Object.entries(out)) writeFileSync(`${target}/${name}.svg`, `<!-- Nameplate de Latido. Inter Black (SIL OFL 1.1). -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n.viewBox}"><path id="accent" d="${n.accent}"/><path id="ink" d="${n.ink}"/></svg>\n`);
writeFileSync(`${target}/index.json`, JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.viewBox])), null, 2) + "\n");
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.viewBox])));
