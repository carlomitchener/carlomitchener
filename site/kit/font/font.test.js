import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { animate, cycle, letters, merge, HOLD } from './font.js';
import FONT from './font.json' with { type: 'json' };

const WORDMARK = 'MRLYPROD';
const PKG = join(import.meta.dir, '..', '..', 'pkg');
const HAS = existsSync(join(PKG, 'demos.js'));

test.skipIf(!HAS)('the wordmark writes itself in stroke order, one cell a frame', () => {
  const write = animate(WORDMARK, 1);
  expect([write.rows, write.cols, write.fps]).toEqual([7, 49, 25]);
  expect(write.frames[0]).toEqual([]);
  expect(write.frames.length).toBe(104);
  for (let i = 1; i < write.frames.length; i++) expect(write.frames[i].length).toBe(write.frames[i - 1].length + 1);
  expect(write.frames[1]).toEqual([5 * 49 + 1]);
  const grid = letters(WORDMARK).grid;
  const lit = grid.flat().filter(Boolean).length;
  expect(write.frames[103].length).toBe(lit);
});

test.skipIf(!HAS)('the eight letters fold into an X in twenty-two frames', () => {
  const folded = merge(WORDMARK, 1);
  expect(folded.length).toBe(22);
  expect(folded[0]).toEqual(animate(WORDMARK, 1).frames[103]);
  const x = [];
  FONT.X.rows.forEach((row, r) => [...row].forEach((ch, c) => ch === '1' && x.push((1 + r) * 49 + 22 + c)));
  expect(folded[21]).toEqual(x);
});

test.skipIf(!HAS)('the cycle loops through both halves with a rest after each', () => {
  const anim = cycle(WORDMARK, 1);
  expect(anim.frames.length).toBe(2 * 104 + 2 * 22 + 4 * HOLD);
  expect(anim.frames.length).toBe(352);
  for (const frame of anim.frames) {
    expect(frame.every((v, i) => i === 0 || frame[i - 1] < v)).toBe(true);
    expect(frame.every((v) => v < anim.rows * anim.cols)).toBe(true);
  }
});

test.skipIf(!HAS)('any string writes itself and a lone glyph has nothing to merge', () => {
  for (const text of ['a', 'hi', 'mrly.net', '(1)']) {
    const write = animate(text, 2);
    const { rows, cols, grid } = letters(text);
    expect([write.rows, write.cols]).toEqual([rows + 4, cols + 4]);
    expect(write.frames.length).toBe(grid.flat().filter(Boolean).length + 1);
  }
  expect(merge('A', 1).length).toBe(1);
});

test.skipIf(!HAS)('the kit matches the crate frame for frame', async () => {
  const wasm = await import(join(PKG, 'demos.js'));
  await wasm.default({ module_or_path: await Bun.file(join(PKG, 'demos_bg.wasm')).arrayBuffer() });
  for (const text of ['MRLYPROD', 'SIERPINSKI', 'mrly.net', '(1)', 'Hi 42', 'A']) {
    expect(animate(text, 1)).toEqual(JSON.parse(wasm.font_animate(text, 1)));
    expect(cycle(text, 1, 25)).toEqual(JSON.parse(wasm.font_cycle(text, 1, 25)));
  }
});
