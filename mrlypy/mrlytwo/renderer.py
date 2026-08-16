import numpy as np
from PIL import Image, ImageDraw
from typing import Dict, List, Optional, TYPE_CHECKING
from mrlycore.colors import Color

if TYPE_CHECKING:
    from .models import Cell2d

# IMAGE

def to_image(cell: "Cell2d", scale: int = 1) -> Image.Image:
    array = cell.colors
    if scale > 1:
        array = array.repeat(scale, axis=0).repeat(scale, axis=1)
    return Image.fromarray(array, "RGBA")

def from_image(image: Image.Image) -> "Cell2d":
    from .models import Cell2d
    array = np.array(image)
    return Cell2d(colors=array)

# TEXT

def text_2d(grid: np.ndarray, mapping: Optional[Dict[int, str]] = None) -> List[str]:
    rows = []
    height, width = grid.shape
    for y in range(height):
        row_str = ""
        for x in range(width):
            val = grid[y, x]
            if mapping:
                row_str += mapping.get(val, str(val))
            else:
                row_str += str(val)
        rows.append(row_str)
    return rows

# DRAW

def draw_square(cell: "Cell2d", scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> Image.Image:
    padding = width if outline else 0
    img_width = (cell.width * scale) + (padding * 2)
    img_height = (cell.height * scale) + (padding * 2)
    image = Image.new("RGBA", (int(img_width), int(img_height)), (0, 0, 0, 0))
    draw_ctx = ImageDraw.Draw(image)
    outline_rgba = outline.to_rgba() if outline else None
    colors_grid = cell.colors
    for y in range(cell.height):
        for x in range(cell.width):
            r, g, b, a = colors_grid[y, x]
            if a == 0:
                continue
            x0 = (x * scale) + padding
            y0 = (y * scale) + padding
            x1 = x0 + scale
            y1 = y0 + scale
            draw_ctx.rectangle([x0, y0, x1, y1], fill=(r, g, b, a), outline=outline_rgba, width=width)
    return image

def draw_circle(cell: "Cell2d", scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> Image.Image:
    padding = width if outline else 0
    img_width = (cell.width * scale) + (padding * 2)
    img_height = (cell.height * scale) + (padding * 2)
    image = Image.new("RGBA", (int(img_width), int(img_height)), (0, 0, 0, 0))
    draw_ctx = ImageDraw.Draw(image)
    outline_rgba = outline.to_rgba() if outline else None
    colors_grid = cell.colors
    for y in range(cell.height):
        for x in range(cell.width):
            r, g, b, a = colors_grid[y, x]
            if a == 0:
                continue
            x0 = (x * scale) + padding
            y0 = (y * scale) + padding
            x1 = x0 + scale
            y1 = y0 + scale
            draw_ctx.ellipse([x0, y0, x1, y1], fill=(r, g, b, a), outline=outline_rgba, width=width)
    return image

def draw_diamond(cell: "Cell2d", scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> Image.Image:
    padding = width if outline else 0
    img_width = (cell.width * scale) + (padding * 2)
    img_height = (cell.height * scale) + (padding * 2)
    image = Image.new("RGBA", (int(img_width), int(img_height)), (0, 0, 0, 0))
    draw_ctx = ImageDraw.Draw(image)
    outline_rgba = outline.to_rgba() if outline else None
    colors_grid = cell.colors
    half_scale = scale // 2
    for y in range(cell.height):
        for x in range(cell.width):
            r, g, b, a = colors_grid[y, x]
            if a == 0:
                continue
            cx = (x * scale) + padding
            cy = (y * scale) + padding
            pts = [
                (cx + half_scale, cy),
                (cx + scale, cy + half_scale),
                (cx + half_scale, cy + scale),
                (cx, cy + half_scale)
            ]
            draw_ctx.polygon(pts, fill=(r, g, b, a), outline=outline_rgba, width=width)
    return image

# SVG

def svg_square(cell: "Cell2d", scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> str:
    padding = width if outline else 0
    img_width = (cell.width * scale) + (padding * 2)
    img_height = (cell.height * scale) + (padding * 2)
    outline_hex = outline.to_hex() if outline else None
    stroke_attr = f'stroke="{outline_hex}" stroke-width="{width}"' if outline_hex else 'stroke="none"'
    elements = [f'<svg width="{int(img_width)}" height="{int(img_height)}" xmlns="http://www.w3.org/2000/svg">']
    colors_grid = cell.colors
    for y in range(cell.height):
        for x in range(cell.width):
            r, g, b, a = colors_grid[y, x]
            if a == 0:
                continue
            fill_color = Color.rgba_to_hex(r, g, b, a)
            rect_x = (x * scale) + padding
            rect_y = (y * scale) + padding
            elements.append(f'<rect x="{int(rect_x)}" y="{int(rect_y)}" width="{int(scale)}" height="{int(scale)}" fill="{fill_color}" {stroke_attr}/>')
    elements.append('</svg>')
    return "\n".join(elements)

def svg_circle(cell: "Cell2d", scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> str:
    padding = width if outline else 0
    img_width = (cell.width * scale) + (padding * 2)
    img_height = (cell.height * scale) + (padding * 2)
    outline_hex = outline.to_hex() if outline else None
    stroke_attr = f'stroke="{outline_hex}" stroke-width="{width}"' if outline_hex else 'stroke="none"'
    radius = scale // 2
    elements = [f'<svg width="{int(img_width)}" height="{int(img_height)}" xmlns="http://www.w3.org/2000/svg">']
    colors_grid = cell.colors
    for y in range(cell.height):
        for x in range(cell.width):
            r, g, b, a = colors_grid[y, x]
            if a == 0:
                continue
            cx = (x * scale) + padding + radius
            cy = (y * scale) + padding + radius
            fill_color = Color.rgba_to_hex(r, g, b, a)
            elements.append(f'<circle cx="{int(cx)}" cy="{int(cy)}" r="{int(radius)}" fill="{fill_color}" {stroke_attr}/>')
    elements.append('</svg>')
    return "\n".join(elements)

def svg_diamond(cell: "Cell2d", scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> str:
    padding = width if outline else 0
    img_width = (cell.width * scale) + (padding * 2)
    img_height = (cell.height * scale) + (padding * 2)
    outline_hex = outline.to_hex() if outline else None
    stroke_attr = f'stroke="{outline_hex}" stroke-width="{width}"' if outline_hex else 'stroke="none"'
    half_scale = scale // 2
    elements = [f'<svg width="{int(img_width)}" height="{int(img_height)}" xmlns="http://www.w3.org/2000/svg">']
    colors_grid = cell.colors
    for y in range(cell.height):
        for x in range(cell.width):
            r, g, b, a = colors_grid[y, x]
            if a == 0:
                continue
            cx = (x * scale) + padding
            cy = (y * scale) + padding
            pts = [
                (cx + half_scale, cy),
                (cx + scale, cy + half_scale),
                (cx + half_scale, cy + scale),
                (cx, cy + half_scale)
            ]
            pts_str = " ".join([f"{int(p[0])},{int(p[1])}" for p in pts])
            fill_color = Color.rgba_to_hex(r, g, b, a)
            elements.append(f'<polygon points="{pts_str}" fill="{fill_color}" {stroke_attr}/>')
    elements.append('</svg>')
    return "\n".join(elements)
