import numpy as np
from typing import Any, Dict, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Cell2d

def to_dict_2d(cell: "Cell2d") -> Dict[str, Any]:
    data = {
        "width": cell.width,
        "height": cell.height,
    }
    if cell._types is not None:
        types_list: Any = cell._types.tolist()
        data["types"] = types_list
    if cell._colors is not None:
        colors_list: Any = cell._colors.tolist()
        data["colors"] = colors_list
    if cell._tags is not None:
        tags_list: Any = cell._tags.tolist()
        data["tags"] = tags_list
    return data

def from_dict_2d(data: Dict[str, Any]) -> "Cell2d":
    from .models import Cell2d
    width = data.get("width")
    height = data.get("height")
    types = np.array(data["types"], dtype=np.int8) if "types" in data else None
    colors = np.array(data["colors"], dtype=np.uint8) if "colors" in data else None
    tags = np.array(data["tags"], dtype=np.uint8) if "tags" in data else None
    return Cell2d(width=width, height=height, types=types, colors=colors, tags=tags)

def to_array_2d(cell: "Cell2d") -> np.ndarray:
    return cell.types

def from_array_2d(array: np.ndarray) -> "Cell2d":
    from .models import Cell2d
    return Cell2d(types=array)

def to_list_2d(cell: "Cell2d") -> List[List[int]]:
    return cell.types.tolist()

def from_list_2d(data: List[List[int]]) -> "Cell2d":
    from .models import Cell2d
    return Cell2d(types=np.array(data, dtype=np.int8))

def to_strings_2d(cell: "Cell2d") -> List[str]:
    return ["".join(map(str, row)) for row in cell.types]

def from_strings_2d(data: List[str]) -> "Cell2d":
    from .models import Cell2d
    return Cell2d(types=np.array([[int(char) for char in row] for row in data], dtype=np.int8))
