from fractions import Fraction
from collections import defaultdict
from .catalog import load_catalog, _data_dir
from .structure import determination_report, invariant_keys
from .average import (
    expected_average_sensitivity,
    variance_average_sensitivity,
)

# HEADLINE RESULTS - ONE SCRIPT, EVERY CLAIM AS A NUMBER THAT HELD

def q1_determination():
    out = {}
    for D in (3, 4):
        rows = load_catalog(D, _data_dir())
        out[D] = determination_report(rows)
    return out

def q1_minimal_witness():
    rows = load_catalog(4, _data_dir())
    groups = defaultdict(list)
    for r in rows:
        sig = (r["genus"], r["gf2_degree"], r["popcount"], tuple(r["fill_fingerprint"]))
        groups[sig].append(r)
    witnesses = []
    for sig, members in groups.items():
        if len(members) < 2:
            continue
        if len({x["block_sensitivity"] for x in members}) > 1:
            names = [x["name"] for x in members]
            vals = sorted({x["block_sensitivity"] for x in members})
            witnesses.append((sig, names, vals, len(members)))
    witnesses.sort(key=lambda w: w[3])
    return witnesses

def q2_certificate_equals_block_sensitivity():
    out = {}
    for D in (3, 4):
        rows = load_catalog(D, _data_dir())
        out[D] = all(r["certificate"] == r["block_sensitivity"] for r in rows)
    return out

def q2_huang_boundary():
    rows = load_catalog(4, _data_dir())
    return [(r["name"], r["real_degree"], r["sensitivity"], r["anf"])
            for r in rows if r["real_degree"] == r["sensitivity"] ** 2 and r["sensitivity"] >= 2]

def q2_sensitivity_blocksensitivity_gap():
    rows = load_catalog(4, _data_dir())
    best = max(r["block_sensitivity"] - r["sensitivity"] for r in rows)
    holders = [(r["name"], r["sensitivity"], r["block_sensitivity"], r["anf"])
               for r in rows if r["block_sensitivity"] - r["sensitivity"] == best]
    return best, holders

def q3_average_sensitivity():
    out = {}
    for D in range(1, 9):
        out[D] = (expected_average_sensitivity(D), variance_average_sensitivity(D))
    return out

if __name__ == "__main__":
    print("=" * 70)
    print("Q1 - geometry-to-complexity determination (coarsest key per measure)")
    for D, rep in q1_determination().items():
        print(f"  D={D}:")
        for m, det in rep.items():
            print(f"     {m:22s} -> {det}")
    print()
    print("Q1 - minimal collision witness (same full invariants, different bs):")
    for sig, names, vals, n in q1_minimal_witness()[:3]:
        print(f"     {names} bs={vals}  invariants={sig}")
    print()
    print("=" * 70)
    print("Q2 - C(f) = bs(f) for every design:", q2_certificate_equals_block_sensitivity())
    print("Q2 - Huang boundary deg = s^2 (s>=2):")
    for nm, deg, s, anf in q2_huang_boundary():
        print(f"     {nm}: deg={deg} s={s} (s^2={s*s})  anf={anf}")
    gap, holders = q2_sensitivity_blocksensitivity_gap()
    print(f"Q2 - max bs - s = {gap}:")
    for nm, s, bs, anf in holders:
        print(f"     {nm}: s={s} bs={bs}  anf={anf}")
    print()
    print("=" * 70)
    print("Q3 - average sensitivity I(f) under uniform-over-designs:")
    for D, (mean, var) in q3_average_sensitivity().items():
        print(f"     D={D}: E[I]={mean}  Var[I]={var}={float(var):.5f}")
