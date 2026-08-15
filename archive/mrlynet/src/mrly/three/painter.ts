import type { Color, RGBA } from "../colors";
import { white, black, alpha as alphaColor, red, green, blue } from "../colors";
import { Mode } from "../enums";
import { state } from "../state";
import type { Cell3d } from "./models";

type PaletteMap = Record<number, Color[]>;

function getMapping(): PaletteMap {
  return { 0: [white], 1: [black], 2: [alphaColor], 3: [red], 4: [green], 5: [blue] };
}

export function paint3d(cell: Cell3d, mapping?: PaletteMap, mode?: Mode): Cell3d {
  const palette = mapping || getMapping();
  const paintMode = mode || Mode.TYPE;
  for (const keyStr of Object.keys(palette)) {
    const key = Number(keyStr);
    const colors = palette[key];
    const positions: [number, number, number][] = [];
    for (let z = 0; z < cell.depth; z++) {
      for (let y = 0; y < cell.height; y++) {
        for (let x = 0; x < cell.width; x++) {
          if (cell.types[z][y][x] === key) {
            positions.push([z, y, x]);
          }
        }
      }
    }
    if (positions.length === 0) continue;
    switch (paintMode) {
      case Mode.TYPE:
        for (const [z, y, x] of positions) {
          cell.colors[z][y][x] = colors[0].toRGBA();
        }
        break;
      case Mode.RANDOM: {
        const rgbaPalette: RGBA[] = colors.map((c) => c.toRGBA());
        for (const [z, y, x] of positions) {
          cell.colors[z][y][x] = rgbaPalette[state.randint(0, rgbaPalette.length)];
        }
        break;
      }
      case Mode.ENUMERATE: {
        const rgbaPalette: RGBA[] = colors.map((c) => c.toRGBA());
        for (let i = 0; i < positions.length; i++) {
          const [z, y, x] = positions[i];
          cell.colors[z][y][x] = rgbaPalette[i % rgbaPalette.length];
        }
        break;
      }
      default: {
        const rgbaPalette: RGBA[] = colors.map((c) => c.toRGBA());
        for (const [z, y, x] of positions) {
          let value: number;
          switch (paintMode) {
            case Mode.INDEX:
              value = z * cell.height * cell.width + y * cell.width + x;
              break;
            case Mode.TAG:
              value = cell.tags[z][y][x];
              break;
            case Mode.ROW:
              value = y;
              break;
            case Mode.COLUMN:
              value = x;
              break;
            case Mode.DEPTH:
              value = z;
              break;
            default:
              continue;
          }
          cell.colors[z][y][x] = rgbaPalette[((value % rgbaPalette.length) + rgbaPalette.length) % rgbaPalette.length];
        }
        break;
      }
    }
  }
  return cell;
}
