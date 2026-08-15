import numpy as np
from typing import Any, Dict, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Cell3d

def to_dict_3d(cell: "Cell3d") -> Dict[str, Any]:
    data = {
        "width": cell.width,
        "height": cell.height,
        "depth": cell.depth,
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

def from_dict_3d(data: Dict[str, Any]) -> "Cell3d":
    from .models import Cell3d
    width = data.get("width")
    height = data.get("height")
    depth = data.get("depth")
    types = np.array(data["types"], dtype=np.int8) if "types" in data else None
    colors = np.array(data["colors"], dtype=np.uint8) if "colors" in data else None
    tags = np.array(data["tags"], dtype=np.uint8) if "tags" in data else None
    return Cell3d(width=width, height=height, depth=depth, types=types, colors=colors, tags=tags)

def to_array_3d(cell: "Cell3d") -> np.ndarray:
    return cell.types

def from_array_3d(array: np.ndarray) -> "Cell3d":
    from .models import Cell3d
    return Cell3d(types=array)

def to_list_3d(cell: "Cell3d") -> List[List[List[int]]]:
    return cell.types.tolist()

def from_list_3d(data: List[List[List[int]]]) -> "Cell3d":
    from .models import Cell3d
    return Cell3d(types=np.array(data, dtype=np.int8))

def to_strings_3d(cell: "Cell3d") -> List[List[str]]:
    return [["".join(map(str, row)) for row in layer] for layer in cell.types]

def from_strings_3d(data: List[List[str]]) -> "Cell3d":
    from .models import Cell3d
    return Cell3d(types=np.array([[[int(char) for char in row] for row in layer] for layer in data], dtype=np.int8))
