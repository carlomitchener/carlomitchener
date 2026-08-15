import os
from mrlypaint.colors import get_color
from mrlypaint.enums import Ink
from .helpers import logger
from .models import Life

BLACK = get_color(Ink.BLACK)
WHITE = get_color(Ink.WHITE)

def create_frames(result: Life, scale=10, output_dir="data/mrlylife/frames", format="png", prefix="life") -> str:
    logger.debug(f"Creating {len(result.grids)} frames")
    os.makedirs(output_dir, exist_ok=True)
    for i, grid in enumerate(result.grids):
        grid.paint({0: [BLACK], 1: [WHITE]})
        image = grid.to_image(scale).convert("RGB")
        fp = f"{output_dir}/{prefix}_{i+1:03d}.{format}"
        image.save(fp, format=format)
        logger.debug(f"Saved: {fp}")
    logger.info(f"Saved {len(result.grids)} frames to {output_dir}")
    return output_dir
