import numpy as np
import zlib
from typing import List

def chaos(grid: np.ndarray) -> float:
    raw = grid.tobytes()
    if len(raw) == 0:
        return 0.0
    compressed = zlib.compress(raw)
    return len(compressed) / len(raw)

def temporal_chaos(grids: List[np.ndarray]) -> float:
    if len(grids) < 2:
        return 0.0
    diffs = [np.mean(grids[i] != grids[i - 1]) for i in range(1, len(grids))]
    return float(np.mean(diffs))
