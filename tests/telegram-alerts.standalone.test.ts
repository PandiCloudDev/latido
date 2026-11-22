// Owner alerts sent through Telegram are split under its 4096-character limit, line by line when possible.
import assert from "node:assert/strict";
import { test } from "node:test";
import { telegramPieces } from "@aihot/backend/notify/feishu";

test("a short alert stays one message without a part marker", () => {
  assert.deepEqual(telegramPieces("Título\nlínea 1\nlínea 2"), ["Título\nlínea 1\nlínea 2"]);
});

test("a long alert is split on line breaks and every piece fits", () => {
  const lines = Array.from({ length: 200 }, (_, i) => `línea ${i} ${"x".repeat(40)}`);
  const pieces = telegramPieces(lines.join("\n"));
  assert.ok(pieces.length > 1);
  for (const p of pieces) assert.ok(p.length <= 4096);
  assert.equal(pieces.map((p) => p.replace(/\n\(\d+\/\d+\)$/, "")).join("\n"), lines.join("\n"));
  assert.match(pieces.at(-1)!, new RegExp(`\\(${pieces.length}/${pieces.length}\\)$`));
});

test("a single line longer than the limit is cut into pieces that fit", () => {
  const pieces = telegramPieces("y".repeat(9000));
  assert.equal(pieces.length, 3);
  for (const p of pieces) assert.ok(p.length <= 4096);
});
