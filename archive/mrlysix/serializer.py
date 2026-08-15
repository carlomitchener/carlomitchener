from typing import Any, Dict, TYPE_CHECKING
from mrlytwo.serializer import to_dict_2d, from_dict_2d

if TYPE_CHECKING:
    from .models import Cell6d

def to_dict_6d(cell: "Cell6d") -> Dict[str, Any]:
    data = to_dict_2d(cell._cell)
    data["projection"] = cell.projection
    data["orientation"] = cell.orientation
    data["start"] = cell.start
    return data

def from_dict_6d(data: Dict[str, Any]) -> "Cell6d":
    from .models import Cell6d
    from mrlytwo.models import Cell2d
    cell_2d = from_dict_2d(data)
    return Cell6d(
        cell=cell_2d,
        projection=data.get("projection", "iso"),
        orientation=data.get("orientation", "vertical"),
        start=data.get("start", 1),
    )
