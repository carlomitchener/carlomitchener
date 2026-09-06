from mrlypy.core.colors import gradient
from mrlypy.two import Cell2d
import numpy as np
import os
from mrlypy.paint.colors import get_color
from mrlypy.paint.enums import Ink
from .helpers import logger
from .models import Life

BLACK = get_color(Ink.BLACK)
WHITE = get_color(Ink.WHITE)

def create_heatmap(result: Life, scale=10, output_dir="data/life/heatmap", format="png", prefix="life") -> str:
    logger.debug(f"Creating heatmap for {len(result.grids)} grids")
    os.makedirs(output_dir, exist_ok=True)
    final_heatmap = np.zeros_like(result.grids[0].types, dtype=np.int32)
    for grid in result.grids:
        final_heatmap += grid.types
    max_count = int(np.max(final_heatmap))
    logger.debug(f"Max heatmap count: {max_count}")
    gradient_colors = gradient([WHITE, BLACK], max_count)
    gradient_colors.insert(0, BLACK)
    gradient_rgba = [c.to_rgba() for c in gradient_colors]
    gradient_array = np.array(gradient_rgba, dtype=np.uint8)
    cumulative_heatmap = np.zeros_like(result.grids[0].types, dtype=np.int32)
    for i, grid in enumerate(result.grids):
        cumulative_heatmap += grid.types
        colored_heatmap = gradient_array[cumulative_heatmap]
        cell = Cell2d(colors=colored_heatmap)
        image = cell.to_image(scale).convert("RGB")
        fp = f"{output_dir}/{prefix}_{i+1:03d}.{format}"
        image.save(fp, format=format)
        logger.debug(f"Saved: {fp}")
    logger.info(f"Saved {len(result.grids)} heatmaps to {output_dir}")
    return output_dir
