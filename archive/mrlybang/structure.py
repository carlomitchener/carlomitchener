import json
import os
from collections import defaultdict
from fractions import Fraction
from .catalog import load_catalog, _data_dir

MEASURE_KEYS = [
    "sensitivity",
    "block_sensitivity",
    "certificate",
    "certificate_0",
    "certificate_1",
    "decision_tree_depth",
    "real_degree",
    "dnf_size",
    "cnf_size",
]

def _fp_tuple(row):
    return tuple(row["fill_fingerprint"])

def invariant_keys(row):
    genus = row["genus"]
    gf2 = row["gf2_degree"]
    pop = row["popcount"]
    fp = _fp_tuple(row)
    return {
        "genus": (genus,),
        "gf2_degree": (gf2,),
        "popcount": (pop,),
        "genus+gf2": (genus, gf2),
        "genus+pop": (genus, pop),
        "gf2+pop": (gf2, pop),
        "genus+gf2+pop": (genus, gf2, pop),
        "fingerprint": fp,
        "genus+fingerprint": (genus,) + fp,
    }

KEY_ORDER = [
    "genus", "gf2_degree", "popcount",
    "genus+gf2", "genus+pop", "gf2+pop", "genus+gf2+pop",
    "fingerprint", "genus+fingerprint",
]

def determines(rows, key_name, measure):
    groups = defaultdict(set)
    for row in rows:
        k = invariant_keys(row)[key_name]
        groups[k].add(row[measure])
    bad = {k: sorted(v) for k, v in groups.items() if len(v) > 1}
    return (len(bad) == 0), bad

def coarsest_determiner(rows, measure):
    for key_name in KEY_ORDER:
        ok, _ = determines(rows, key_name, measure)
        if ok:
            return key_name
    return None

def determination_report(rows):
    report = {}
    for measure in MEASURE_KEYS:
        det = coarsest_determiner(rows, measure)
        report[measure] = det
    return report

def collisions(rows, key_name, measure):
    _, bad = determines(rows, key_name, measure)
    out = []
    members = defaultdict(list)
    for row in rows:
        k = invariant_keys(row)[key_name]
        members[k].append(row["name"])
    for k, vals in bad.items():
        out.append((k, vals, members[k]))
    return out

def measure_gap(rows, big, small):
    out = []
    for row in rows:
        a = row[big]
        b = row[small]
        out.append((row["name"], a, b, a - b))
    return out

def extremal_on(rows, measure_a, measure_b, ratio=False):
    best = None
    holders = []
    for row in rows:
        a = max(row[measure_a], 0)
        b = max(row[measure_b], 0)
        if ratio:
            if b == 0:
                continue
            val = Fraction(a, b)
        else:
            val = a - b
        if best is None or val > best:
            best = val
            holders = [row["name"]]
        elif val == best:
            holders.append(row["name"])
    return best, holders

if __name__ == "__main__":
    here = _data_dir()
    for D in (3, 4):
        rows = load_catalog(D, here)
        print(f"=== D={D} ({len(rows)} designs) ===")
        rep = determination_report(rows)
        for measure, det in rep.items():
            print(f"  {measure:22s} determined by: {det}")
        print()
