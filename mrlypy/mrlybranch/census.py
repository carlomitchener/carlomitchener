import numpy as np
from typing import Dict, TYPE_CHECKING
from mrlycore.errors import MrlyError

if TYPE_CHECKING:
    from .models import Network

# PRIMITIVES

def branches(network: "Network") -> int:
    return len(network.branches)

def nodes(network: "Network") -> int:
    return len(network.nodes)

def total_length(network: "Network") -> float:
    positions = network.positions()
    total = 0.0
    for branch in network.branches:
        a = positions[branch.parent]
        b = positions[branch.child]
        total += float(np.linalg.norm(a - b))
    return total

def tips(network: "Network") -> int:
    degree = network.degree()
    if len(degree) == 0:
        return 0
    return int((degree == 1).sum())

def junctions(network: "Network") -> int:
    degree = network.degree()
    if len(degree) == 0:
        return 0
    return int((degree >= 3).sum())

def components(network: "Network") -> int:
    n = len(network.nodes)
    if n == 0:
        return 0
    adjacency = network.adjacency()
    seen = np.zeros(n, dtype=bool)
    count = 0
    for start in range(n):
        if seen[start]:
            continue
        count += 1
        stack = [start]
        seen[start] = True
        while stack:
            current = stack.pop()
            for neighbor in adjacency[current]:
                if not seen[neighbor]:
                    seen[neighbor] = True
                    stack.append(neighbor)
    return count

# FRACTAL DIMENSION - BOX COUNTING ON NODE POSITIONS

def fractal_dimension(network: "Network", samples: int = 12) -> float:
    positions = network.positions()
    if len(positions) < 2:
        return 0.0
    mins = positions.min(axis=0)
    maxs = positions.max(axis=0)
    extent = float((maxs - mins).max())
    if extent == 0:
        return 0.0
    normalized = (positions - mins) / extent
    sizes = np.geomspace(1.0, 1.0 / 256.0, samples)
    counts = []
    used = []
    for size in sizes:
        keys = np.floor(normalized / size).astype(np.int64)
        unique = {tuple(row) for row in keys}
        counts.append(len(unique))
        used.append(size)
    log_inv_size = np.log(1.0 / np.array(used))
    log_count = np.log(np.array(counts))
    slope = np.polyfit(log_inv_size, log_count, 1)[0]
    return float(slope)

# PUBLIC

def census(network: "Network") -> Dict[str, float]:
    return {
        "nodes": nodes(network),
        "branches": branches(network),
        "tips": tips(network),
        "junctions": junctions(network),
        "components": components(network),
        "total_length": round(total_length(network), 6),
        "fractal_dimension": round(fractal_dimension(network), 4),
    }
