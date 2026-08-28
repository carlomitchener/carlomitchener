from typing import Dict, List, Optional, TYPE_CHECKING
from mrlypy.core.enums import Mode
from mrlypy.two.painter import paint_2d

if TYPE_CHECKING:
    from mrlypy.core.colors import Color
    from .models import Cell6d

def paint_6d(cell: "Cell6d", palette: Optional[Dict[int, List["Color"]]] = None, mode: Optional[Mode] = None) -> "Cell6d":
    paint_2d(cell._cell, palette, mode)
    return cell
