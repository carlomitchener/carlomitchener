from mrlypy.core.colors import gradient
from mrlypy.two import Cell2d
import numpy as np
import os
from colors import create_heatmap_colors
from config import FORMAT, HEATMAP_DIR, OUTPUT_DIR
from models import Saga

def create_saga_heatmap(saga: Saga, output_dir: str = None) -> Saga:
    print(f"Creating heatmap for saga: {saga.key}")
    output_dir = output_dir or f"{OUTPUT_DIR}/{saga.key}/{HEATMAP_DIR}"
    os.makedirs(output_dir, exist_ok=True)
    shape = saga.grids[0].types.shape
    cursor = 0
    for seg, seg_len in zip(saga.segments, saga.segment_lengths):
        seg_grids = saga.grids[cursor:cursor + seg_len]
        final = np.zeros(shape, dtype=np.int32)
        for g in seg_grids:
            final += g.types
        max_count = max(1, int(np.max(final)))
        print(f"Segment {seg.key} max heatmap count: {max_count}")
        primary, secondary = create_heatmap_colors(seg)
        gradient_colors = gradient(secondary, max_count)
        gradient_colors.insert(0, primary)
        gradient_rgba = [c.to_rgba() for c in gradient_colors]
        gradient_array = np.array(gradient_rgba, dtype=np.uint8)
        cumulative = np.zeros(shape, dtype=np.int32)
        for i, grid in enumerate(seg_grids):
            cumulative += grid.types
            colored = gradient_array[cumulative]
            cell = Cell2d(colors=colored)
            image = cell.to_image(1).convert("RGB")
            fp = f"{output_dir}/{saga.key}_{cursor + i + 1:03d}.{FORMAT}"
            image.save(fp, format=FORMAT)
            print(f"Saved: {fp}")
        cursor += seg_len
    print(f"Saved {len(saga.grids)} heatmaps to {output_dir}")
    return saga
