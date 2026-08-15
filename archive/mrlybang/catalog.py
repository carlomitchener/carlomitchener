import os
import json
import time
from itertools import product, permutations
from .bang import (
    corners,
    code_to_filled,
    algebraic_degree,
    anf_string,
    genus,
    level_set,
    axis_pins,
)
from .complexity import measures

# THE COMPLEXITY CATALOG - JOIN GEOMETRY TO COMPLEXITY ON THE FULL FINITE FAMILY

def _perm_maps(dimension):
    cells = corners(dimension)
    index = {c: i for i, c in enumerate(cells)}
    maps = []
    for perm in permutations(range(dimension)):
        for flips in product((0, 1), repeat=dimension):
            m = [0] * len(cells)
            for i, c in enumerate(cells):
                image = tuple(c[perm[k]] ^ flips[k] for k in range(dimension))
                m[i] = index[image]
            maps.append(tuple(m))
    return maps, cells

def _orbit(code, maps, ncorners):
    images = set()
    for m in maps:
        v = 0
        c = code
        i = 0
        while c:
            if c & 1:
                v |= 1 << m[i]
            c >>= 1
            i += 1
        images.add(v)
    return images

def canonical_codes(dimension):
    maps, cells = _perm_maps(dimension)
    ncorners = len(cells)
    total = 1 << ncorners
    seen = bytearray(total)
    reps = []
    orbit_sizes = {}
    for code in range(total):
        if seen[code]:
            continue
        orbit = _orbit(code, maps, ncorners)
        rep = min(orbit)
        for v in orbit:
            seen[v] = 1
        reps.append(rep)
        orbit_sizes[rep] = len(orbit)
    return sorted(reps), maps, cells, orbit_sizes

def _width(dimension):
    return len(str((1 << (1 << dimension)) - 1))

def _design_row(code, cells, dimension, orbit_size):
    filled = code_to_filled(code, cells)
    ls = level_set(filled, cells)
    ax = axis_pins(filled, cells)
    m = measures(filled, cells)
    fp = m.pop("fill_fingerprint")
    row = {
        "name": f"mrly_{code:0{_width(dimension)}d}",
        "i": code,
        "dimension": dimension,
        "genus": genus(filled, cells),
        "gf2_degree": algebraic_degree(filled, cells),
        "level_set_S": list(ls) if ls is not None else None,
        "axis_pins": list(ax) if ax is not None else None,
        "anf": anf_string(filled, cells),
        "orbit_size": orbit_size,
        "fill_fingerprint": [str(x) for x in fp],
    }
    row.update(m)
    return row

def build(dimension):
    reps, maps, cells, orbit_sizes = canonical_codes(dimension)
    rows = []
    for code in reps:
        rows.append(_design_row(code, cells, dimension, orbit_sizes[code]))
    return rows

def write_catalog(dimension, directory):
    rows = build(dimension)
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, f"complexity_{dimension}d.json")
    with open(path, "w") as fh:
        json.dump(rows, fh, indent=2)
    return path, rows

def load_catalog(dimension, directory):
    path = os.path.join(directory, f"complexity_{dimension}d.json")
    with open(path) as fh:
        return json.load(fh)

def _data_dir():
    return os.path.join(os.path.dirname(__file__), "data")

if __name__ == "__main__":
    here = _data_dir()
    for D in (3, 4):
        t0 = time.time()
        path, rows = write_catalog(D, here)
        print(f"D={D}: {len(rows)} designs -> {path}  ({round(time.time()-t0,1)}s)")
