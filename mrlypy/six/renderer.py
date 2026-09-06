import numpy as np
from PIL import Image, ImageDraw
from typing import List, Optional, Tuple
from mrlypy.core.colors import Color
from mrlypy.core.errors import MrlyError
from .geometry import is_hex, get_orientation, Orientation, tile

# TRIANGLES

def triangle_north(x: int, y: int) -> List[Tuple[int, int]]:
    return [(x, 2 * y + 2), (x + 1, 2 * y), (x + 2, 2 * y + 2)]

def triangle_south(x: int, y: int) -> List[Tuple[int, int]]:
    return [(x, 2 * y), (x + 1, 2 * y + 2), (x + 2, 2 * y)]

def triangle_east(x: int, y: int) -> List[Tuple[int, int]]:
    return [(2 * x, y), (2 * x, y + 2), (2 * x + 2, y + 1)]

def triangle_west(x: int, y: int) -> List[Tuple[int, int]]:
    return [(2 * x + 2, y), (2 * x + 2, y + 2), (2 * x, y + 1)]

# GET TRIANGLES

def get_triangles(cell, start: int = 0) -> List[Tuple[List[Tuple[int, int]], Tuple[int, int, int, int]]]:
    inner = cell._cell if hasattr(cell, '_cell') else cell
    height, width_grid = inner.types.shape
    colors_grid = inner.colors
    orientation = get_orientation(width_grid, height)
    triangles = []
    for y in range(height):
        for x in range(width_grid):
            r, g, b, a = colors_grid[y, x]
            if a == 0:
                continue
            flip = (x + y + start) % 2
            match orientation:
                case Orientation.HORIZONTAL:
                    points = triangle_north(x, y) if flip == 0 else triangle_south(x, y)
                case Orientation.VERTICAL:
                    points = triangle_east(x, y) if flip == 0 else triangle_west(x, y)
            triangles.append((points, (r, g, b, a)))
    return triangles

# DRAW

def draw(cell, scale: int = 1, orientation: str = "horizontal", start: int = 0, outline: Optional[Color] = None, width: int = 1) -> Image.Image:
    inner = cell._cell if hasattr(cell, '_cell') else cell
    height, width_grid = inner.types.shape
    colors_grid = inner.colors
    orientation = get_orientation(width_grid, height)
    triangles = []
    for y in range(height):
        for x in range(width_grid):
            r, g, b, a = colors_grid[y, x]
            if a == 0:
                continue
            flip = (x + y + start) % 2
            match orientation:
                case Orientation.HORIZONTAL:
                    points = triangle_north(x, y) if flip == 0 else triangle_south(x, y)
                case Orientation.VERTICAL:
                    points = triangle_east(x, y) if flip == 0 else triangle_west(x, y)
            triangles.append((points, (r, g, b, a)))
    if not triangles:
        return Image.new("RGBA", (0, 0))
    all_x = [p[0] for points, _ in triangles for p in points]
    all_y = [p[1] for points, _ in triangles for p in points]
    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)
    padding = width if outline else 0
    img_width = (max_x - min_x + padding * 2) * scale
    img_height = (max_y - min_y + padding * 2) * scale
    image = Image.new("RGBA", (int(img_width), int(img_height)), (0, 0, 0, 0))
    draw_ctx = ImageDraw.Draw(image)
    offset_x = -min_x + padding
    offset_y = -min_y + padding
    outline_rgba = outline.to_rgba() if outline else None
    for points, color in triangles:
        pts = [(int((p[0] + offset_x) * scale), int((p[1] + offset_y) * scale)) for p in points]
        draw_ctx.polygon(pts, fill=color, outline=outline_rgba, width=width)
    return image

# SVG

def svg(cell, scale: int = 1, orientation: str = "horizontal", start: int = 0, outline: Optional[Color] = None, width: int = 1) -> str:
    inner = cell._cell if hasattr(cell, '_cell') else cell
    height, width_grid = inner.types.shape
    orientation = get_orientation(width_grid, height)
    colors_grid = inner.colors
    triangles = []
    for y in range(height):
        for x in range(width_grid):
            r, g, b, a = colors_grid[y, x]
            if a == 0:
                continue
            flip = (x + y + start) % 2
            match orientation:
                case Orientation.HORIZONTAL:
                    points = triangle_north(x, y) if flip == 0 else triangle_south(x, y)
                case Orientation.VERTICAL:
                    points = triangle_east(x, y) if flip == 0 else triangle_west(x, y)
            triangles.append((points, (r, g, b, a)))
    if not triangles:
        return "<svg></svg>"
    all_x = [p[0] for points, _ in triangles for p in points]
    all_y = [p[1] for points, _ in triangles for p in points]
    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)
    padding = width if outline else 0
    img_width = (max_x - min_x + padding * 2) * scale
    img_height = (max_y - min_y + padding * 2) * scale
    offset_x = -min_x + padding
    offset_y = -min_y + padding
    elements = [f'<svg width="{int(img_width)}" height="{int(img_height)}" xmlns="http://www.w3.org/2000/svg">']
    for points, (r, g, b, a) in triangles:
        color = Color.rgba_to_hex(r, g, b, a)
        pts_str = " ".join([f"{int((p[0] + offset_x) * scale)},{int((p[1] + offset_y) * scale)}" for p in points])
        if outline:
            outline_hex = outline.to_hex()
            stroke_attr = f' stroke="{outline_hex}" stroke-width="{width}"'
        else:
            stroke_attr = ''
        elements.append(f'<polygon points="{pts_str}" fill="{color}"{stroke_attr}/>')
    elements.append('</svg>')
    return "\n".join(elements)

# RECT

def rect_draw(cell, scale: int = 1, start: int = 0) -> Image.Image:
    inner = cell._cell if hasattr(cell, '_cell') else cell
    if not is_hex(inner):
        raise MrlyError("Cell must be a hexagon.")
    tiled_cell = tile(inner, 3, 3)
    tile_h, tile_w = inner.types.shape
    orientation = get_orientation(tile_w, tile_h)
    match orientation:
        case Orientation.HORIZONTAL:
            dx = (3 * (tile_w + 1)) // 4
            dy = tile_h
            row_shift = tile_h // 2
            geom_crop_w = 2 * dx
            geom_crop_h = 2 * dy
            start_geom_x = (tile_w + 1) // 2
            start_geom_y = tile_h
        case Orientation.VERTICAL:
            dx = tile_w
            dy = (3 * (tile_h + 1)) // 4
            row_shift = tile_w // 2
            geom_crop_w = 2 * dx
            geom_crop_h = 2 * dy
            start_geom_x = tile_w
            start_geom_y = (tile_h + 1) // 2
    triangles = get_triangles(tiled_cell, start)
    img_width = geom_crop_w * scale
    img_height = geom_crop_h * scale
    image = Image.new("RGBA", (int(img_width), int(img_height)), (0, 0, 0, 0))
    draw_ctx = ImageDraw.Draw(image)
    offset_x = -start_geom_x
    offset_y = -start_geom_y
    for points, color in triangles:
        pts = []
        for p in points:
            px = (p[0] + offset_x) * scale
            py = (p[1] + offset_y) * scale
            pts.append((px, py))
        draw_ctx.polygon(pts, fill=color)
    return image

def rect_svg(cell, scale: int = 1, start: int = 0) -> str:
    inner = cell._cell if hasattr(cell, '_cell') else cell
    if not is_hex(inner):
        raise MrlyError("Cell must be a hexagon.")
    tiled_cell = tile(inner, 3, 3)
    tile_h, tile_w = inner.types.shape
    orientation = get_orientation(tile_w, tile_h)
    match orientation:
        case Orientation.HORIZONTAL:
            dx = (3 * (tile_w + 1)) // 4
            dy = tile_h
            row_shift = tile_h // 2
            geom_crop_w = 2 * dx
            geom_crop_h = 2 * dy
            start_geom_x = (tile_w + 1) // 2
            start_geom_y = tile_h
        case Orientation.VERTICAL:
            dx = tile_w
            dy = (3 * (tile_h + 1)) // 4
            row_shift = tile_w // 2
            geom_crop_w = 2 * dx
            geom_crop_h = 2 * dy
            start_geom_x = tile_w
            start_geom_y = (tile_h + 1) // 2
    triangles = get_triangles(tiled_cell, start)
    img_width = geom_crop_w * scale
    img_height = geom_crop_h * scale
    offset_x = -start_geom_x
    offset_y = -start_geom_y
    elements = [f'<svg width="{int(img_width)}" height="{int(img_height)}" viewBox="0 0 {int(img_width)} {int(img_height)}" xmlns="http://www.w3.org/2000/svg">']
    for points, (r, g, b, a) in triangles:
        color = Color.rgba_to_hex(r, g, b, a)
        pts_str_list = []
        for p in points:
            px = int((p[0] + offset_x) * scale)
            py = int((p[1] + offset_y) * scale)
            pts_str_list.append(f"{px},{py}")
        pts_str = " ".join(pts_str_list)
        elements.append(f'<polygon points="{pts_str}" fill="{color}" stroke="none"/>')
    elements.append('</svg>')
    return "\n".join(elements)
