import copy
import mrlypy.paint
from .models import Gen

def render(v: Gen, scale: int = 10) -> Gen:
    cache = copy.deepcopy(v)
    for file in v.files:
        c = copy.deepcopy(cache) if len(v.files) > 1 else cache
        c.tile.cell = c.tile.cell.tile(file.width, file.height)
        if v.is_cover:
            mrlypy.paint.apply(c.paint, c.tile)
        file.data = c.tile.cell.to_image(scale)
        c.tile.cell = None
    v.tile.cell = None
    return v
