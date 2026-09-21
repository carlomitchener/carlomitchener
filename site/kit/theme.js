import { palette } from './palette.js';

export const dark = { ...palette, ground: palette.black, bg: '#070707', panel: '#111112', deep: palette.black, line: '#1f1f20', fg: palette.white, dim: palette.gray, accent: palette.blue, 'on-accent': palette.white };

export const light = { ...palette, ground: palette.white, bg: '#f8f8f9', panel: '#f1f1f2', deep: '#e8e8e9', line: '#dddddf', fg: palette.black, dim: '#555558', accent: palette.blue, 'on-accent': palette.white };
