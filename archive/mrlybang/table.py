import os
import csv
import json
from .bang import bang

# MRLYTABLE

FIELDS = [
    "name", "i", "dimension", "genus", "degree", "anf",
    "level_set_S", "axis_pins", "canonical", "class_rep", "orbit_size", "parity_rule",
]

def rows(dimension):
    u = bang(dimension)
    out = []
    for d in u.all():
        m = d.metadata()
        m["class_rep"] = f"mrly_{d.class_rep:0{len(str(u.total - 1))}d}"
        out.append(m)
    return out

def write_json(dimension, directory):
    data = rows(dimension)
    path = os.path.join(directory, f"mrlytable_{dimension}d.json")
    with open(path, "w") as fh:
        json.dump(data, fh, indent=2)
    return path

def write_csv(dimension, directory):
    data = rows(dimension)
    path = os.path.join(directory, f"mrlytable_{dimension}d.csv")
    with open(path, "w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(FIELDS)
        for m in data:
            writer.writerow([
                m["name"], m["i"], m["dimension"], m["genus"], m["degree"], m["anf"],
                "" if m["level_set_S"] is None else " ".join(map(str, m["level_set_S"])),
                "" if m["axis_pins"] is None else " ".join(map(str, m["axis_pins"])),
                int(bool(m["canonical"])), m["class_rep"], m["orbit_size"],
                ";".join("".join(map(str, c)) for c in m["parity_rule"]),
            ])
    return path

def generate(directory):
    os.makedirs(directory, exist_ok=True)
    written = []
    for dimension in (1, 2, 3):
        written.append(write_json(dimension, directory))
        written.append(write_csv(dimension, directory))
    return written

if __name__ == "__main__":
    here = os.path.join(os.path.dirname(__file__), "data")
    for p in generate(here):
        print("wrote", p)
