import type { RGBA } from "../colors";
import { white, black, alpha as alphaColor, red, green, blue } from "../colors";
import { Mode } from "../enums";
import { state } from "../state";
import type { Cell2d, PaletteMap } from "./models";

function getMapping(): PaletteMap {
  return { 0: [white], 1: [black], 2: [alphaColor], 3: [red], 4: [green], 5: [blue] };
}

export function paint2d(cell: Cell2d, mapping?: PaletteMap, mode?: Mode): Cell2d {
  const palette = mapping || getMapping();
  const paintMode = mode || Mode.TYPE;
  for (const keyStr of Object.keys(palette)) {
    const key = Number(keyStr);
    const colors = palette[key];
    const positions: [number, number][] = [];
    for (let y = 0; y < cell.height; y++) {
      for (let x = 0; x < cell.width; x++) {
        if (cell.types[y][x] === key) {
          positions.push([y, x]);
        }
      }
    }
    if (positions.length === 0) continue;
    switch (paintMode) {
      case Mode.TYPE:
        for (const [y, x] of positions) {
          cell.colors[y][x] = colors[0].toRGBA();
        }
        break;
      case Mode.RANDOM: {
        const rgbaPalette: RGBA[] = colors.map((c) => c.toRGBA());
        for (const [y, x] of positions) {
          cell.colors[y][x] = rgbaPalette[state.randint(0, rgbaPalette.length)];
        }
        break;
      }
      case Mode.ENUMERATE: {
        const rgbaPalette: RGBA[] = colors.map((c) => c.toRGBA());
        for (let i = 0; i < positions.length; i++) {
          const [y, x] = positions[i];
          cell.colors[y][x] = rgbaPalette[i % rgbaPalette.length];
        }
        break;
      }
      default: {
        const rgbaPalette: RGBA[] = colors.map((c) => c.toRGBA());
        for (const [y, x] of positions) {
          let value: number;
          switch (paintMode) {
            case Mode.INDEX:
              value = y * cell.width + x;
              break;
            case Mode.TAG:
              value = cell.tags[y][x];
              break;
            case Mode.ROW:
              value = y;
              break;
            case Mode.COLUMN:
              value = x;
              break;
            default:
              continue;
          }
          cell.colors[y][x] = rgbaPalette[((value % rgbaPalette.length) + rgbaPalette.length) % rgbaPalette.length];
        }
        break;
      }
    }
  }
  return cell;
}
