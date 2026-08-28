import numpy as np
from typing import Dict, List, Optional, TYPE_CHECKING
from mrlypy.core.colors import alpha, black, blue, green, red, white
from mrlypy.core.enums import Mode
from mrlypy.core.state import state

if TYPE_CHECKING:
    from mrlypy.core.colors import Color
    from .models import Cell3d

def get_mapping():
    return {0: [white], 1: [black], 2: [alpha], 3: [red], 4: [green], 5: [blue]}

def paint_3d(cell: "Cell3d", mapping: Optional[Dict[int, List["Color"]]] = None, mode: Optional[Mode] = None) -> "Cell3d":
    mapping = mapping or get_mapping()
    mode = mode or Mode.TYPE
    for key, colors in mapping.items():
        mask = cell.types == key
        if not np.any(mask):
            continue
        match mode:
            case Mode.TYPE:
                cell.colors[mask] = colors[0].to_rgba()
            case Mode.RANDOM:
                palette = np.array([c.to_rgba() for c in colors], dtype=np.uint8)
                indices = state.rng.randint(0, len(palette), size=np.sum(mask))
                cell.colors[mask] = palette[indices]
            case Mode.ENUMERATE:
                palette = np.array([c.to_rgba() for c in colors], dtype=np.uint8)
                indices = np.arange(np.sum(mask)) % len(palette)
                cell.colors[mask] = palette[indices]
            case _:
                source_array = {
                    Mode.INDEX: np.arange(cell.width * cell.height * cell.depth).reshape(cell.depth, cell.height, cell.width),
                    Mode.TAG: cell.tags,
                    Mode.DEPTH: np.indices((cell.depth, cell.height, cell.width))[0],
                    Mode.ROW: np.indices((cell.depth, cell.height, cell.width))[1],
                    Mode.COLUMN: np.indices((cell.depth, cell.height, cell.width))[2],
                }.get(mode)
                if source_array is not None:
                    palette = np.array([c.to_rgba() for c in colors], dtype=np.uint8)
                    masked_values = source_array[mask]
                    indices = masked_values % len(palette)
                    cell.colors[mask] = palette[indices]
    return cell
