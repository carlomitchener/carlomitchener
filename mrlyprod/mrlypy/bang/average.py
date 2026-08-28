from fractions import Fraction
from collections import defaultdict
from itertools import product
from .bang import corners, code_to_filled
from .complexity import sensitivity_at

# AVERAGE-CASE COMPLEXITY OVER THE FAMILY - Q3, ANALYTIC VIA THE UNIFORM MEASURE

def point_sensitivity_law(dimension):
    from math import comb
    return {k: Fraction(comb(dimension, k), 2 ** dimension) for k in range(dimension + 1)}

def expected_average_sensitivity(dimension):
    return Fraction(dimension, 2)

def variance_average_sensitivity(dimension):
    return Fraction(dimension, 2 ** (dimension + 1))

def average_sensitivity(filled, cells):
    D = len(cells[0])
    total = 0
    for x in cells:
        total += sensitivity_at(filled, cells, x)
    return Fraction(total, 2 ** D)

def exact_average_sensitivity_moments(dimension):
    cells = corners(dimension)
    total = 1 << (1 << dimension)
    s_sum = Fraction(0)
    s2_sum = Fraction(0)
    for code in range(total):
        filled = code_to_filled(code, cells)
        I = average_sensitivity(filled, cells)
        s_sum += I
        s2_sum += I * I
    mean = s_sum / total
    var = s2_sum / total - mean * mean
    return mean, var

def exact_point_sensitivity_law(dimension):
    cells = corners(dimension)
    index = {c: i for i, c in enumerate(cells)}
    total = 1 << (1 << dimension)
    x0 = cells[0]
    neighbours = [tuple(x0[j] ^ (1 if j == a else 0) for j in range(dimension)) for a in range(dimension)]
    dist = defaultdict(int)
    for code in range(total):
        fx = (code >> index[x0]) & 1
        s = sum(1 for nb in neighbours if ((code >> index[nb]) & 1) != fx)
        dist[s] += 1
    return {k: Fraction(v, total) for k, v in dist.items()}

def orbit_weighted_distribution(rows, measure, dimension):
    total = 1 << (1 << dimension)
    dist = defaultdict(Fraction)
    for row in rows:
        dist[row[measure]] += Fraction(row["orbit_size"], total)
    return dict(dist)
