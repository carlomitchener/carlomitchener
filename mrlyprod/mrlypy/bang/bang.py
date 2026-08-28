import itertools
from itertools import product, permutations

# THE BANG

def corners(dimension):
    return list(product((0, 1), repeat=dimension))

def code_to_filled(code, cells):
    return frozenset(cells[i] for i in range(len(cells)) if (code >> i) & 1)

def filled_to_code(filled, cells):
    return sum(1 << i for i, c in enumerate(cells) if c in filled)

# SYMMETRY

def symmetries(dimension):
    return [(perm, flips)
            for perm in permutations(range(dimension))
            for flips in product((0, 1), repeat=dimension)]

def apply_symmetry(element, corner):
    perm, flips = element
    return tuple(corner[perm[i]] ^ flips[i] for i in range(len(corner)))

def orbit_codes(filled, cells, group):
    out = set()
    for g in group:
        image = frozenset(apply_symmetry(g, c) for c in filled)
        out.add(filled_to_code(image, cells))
    return out

# ALGEBRA - GF(2) ALGEBRAIC NORMAL FORM

def anf_coefficients(filled, cells):
    dimension = len(cells[0])
    coeff = {c: (1 if c in filled else 0) for c in cells}
    for axis in range(dimension):
        for c in cells:
            if c[axis] == 1:
                lower = tuple(c[j] if j != axis else 0 for j in range(dimension))
                coeff[c] ^= coeff[lower]
    return coeff

def algebraic_degree(filled, cells):
    coeff = anf_coefficients(filled, cells)
    return max([sum(c) for c in cells if coeff[c] == 1], default=-1)

def anf_string(filled, cells):
    dimension = len(cells[0])
    coeff = anf_coefficients(filled, cells)
    names = ["x", "y", "z", "w", "v", "u"]
    terms = []
    for c in sorted(cells, key=lambda t: (sum(t), t)):
        if coeff[c] == 1:
            terms.append("1" if sum(c) == 0 else "".join(names[i] for i in range(dimension) if c[i]))
    return "+".join(terms) if terms else "0"

# GENUS - WHICH KIND OF RULE

def _level_set_aligned(filled, cells):
    by_popcount = {}
    for c in cells:
        by_popcount.setdefault(sum(c), set()).add(c in filled)
    if all(len(v) == 1 for v in by_popcount.values()):
        return tuple(sorted(pc for pc, v in by_popcount.items() if True in v))
    return None

def _axis_pins_aligned(filled, cells):
    dimension = len(cells[0])
    for r in range(dimension + 1):
        for axes in itertools.combinations(range(dimension), r):
            predicted = frozenset(c for c in cells if all(c[a] == 0 for a in axes))
            if predicted == filled:
                return tuple(axes)
    return None

def _orbit_members(filled, cells):
    dimension = len(cells[0])
    group = symmetries(dimension)
    out = set()
    for g in group:
        out.add(frozenset(apply_symmetry(g, c) for c in filled))
    return out

def level_set(filled, cells):
    found = [_level_set_aligned(m, cells) for m in _orbit_members(filled, cells)]
    found = [f for f in found if f is not None]
    return min(found) if found else None

def axis_pins(filled, cells):
    found = [_axis_pins_aligned(m, cells) for m in _orbit_members(filled, cells)]
    found = [f for f in found if f is not None]
    return min(found) if found else None

def genus(filled, cells):
    if level_set(filled, cells) is not None:
        return "iso"
    if axis_pins(filled, cells) is not None:
        return "axis"
    return "compound"

# INDEX WIDTH

def index_width(dimension):
    return len(str(2 ** (2 ** dimension) - 1))

# THE DESIGN

class Design:

    def __init__(self, code, dimension, cells, canonical=None, class_rep=None, orbit_size=None):
        self.i = code
        self.dimension = dimension
        self._cells = cells
        self.filled = code_to_filled(code, cells)
        self.canonical = canonical
        self.class_rep = class_rep
        self.orbit_size = orbit_size

    @property
    def name(self):
        return f"mrly_{self.i:0{index_width(self.dimension)}d}"

    def parity_rule(self):
        return sorted(self.filled)

    def degree(self):
        return algebraic_degree(self.filled, self._cells)

    def anf(self):
        return anf_string(self.filled, self._cells)

    def genus(self):
        return genus(self.filled, self._cells)

    def level_set(self):
        return level_set(self.filled, self._cells)

    def axis_pins(self):
        return axis_pins(self.filled, self._cells)

    def metadata(self):
        ls = self.level_set()
        ax = self.axis_pins()
        return {
            "name": self.name,
            "i": self.i,
            "dimension": self.dimension,
            "parity_rule": [list(c) for c in self.parity_rule()],
            "genus": self.genus(),
            "level_set_S": list(ls) if ls is not None else None,
            "axis_pins": list(ax) if ax is not None else None,
            "degree": self.degree(),
            "anf": self.anf(),
            "canonical": self.canonical,
            "class_rep": self.class_rep,
            "orbit_size": self.orbit_size,
        }

    def __repr__(self):
        flag = "*" if self.canonical else " "
        return f"<{self.name}{flag} d={self.dimension} {self.genus()} deg={self.degree()} anf={self.anf()}>"

# THE UNIVERSE - ONE BANG PER DIMENSION

class Universe:

    def __init__(self, dimension):
        self.dimension = dimension
        self._cells = corners(dimension)
        self.total = 2 ** (2 ** dimension)
        self._group = symmetries(dimension)
        self._class_of = {}
        self._first_of_class = {}
        self._orbit_size = {}
        self._bang()

    def _bang(self):
        for code in range(self.total):
            filled = code_to_filled(code, self._cells)
            orbit = orbit_codes(filled, self._cells, self._group)
            rep = min(orbit)
            self._class_of[code] = rep
            self._orbit_size[code] = len(orbit)
            if rep not in self._first_of_class:
                self._first_of_class[rep] = code

    def _is_canonical(self, code):
        return self._first_of_class[self._class_of[code]] == code

    def design(self, code):
        rep_code = self._first_of_class[self._class_of[code]]
        return Design(code, self.dimension, self._cells,
                      canonical=self._is_canonical(code),
                      class_rep=rep_code,
                      orbit_size=self._orbit_size[code])

    def all(self):
        return [self.design(code) for code in range(self.total)]

    def canonical(self):
        return [d for d in self.all() if d.canonical]

    def distinct_count(self):
        return len(self._first_of_class)

def bang(dimension):
    return Universe(dimension)
