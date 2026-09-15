import json
import mrlypy.two as m2
import mrlypy.three as m3
from mrlypy.core.colors import blue, red, white
from mrlypy.core.enums import Mode
import numpy as np
from config import DATA_DIR

def cell_2d():
    cell = m2.carpet_2d(3, 1)
    cell.neighbors(m2.net_2d(3).types)
    cell.paint({0: [red, blue], 1: [white]}, mode=Mode.TAG)
    return cell

def cell_3d():
    cell = m3.carpet_3d(3, 1)
    cell.neighbors()
    cell.paint({0: [red, blue], 1: [white]}, mode=Mode.TAG)
    return cell

def test_dict(name, cls, cell):
    fp = f"{DATA_DIR}/cell_{name}_dict.json"
    data = cell.to_dict()
    with open(fp, "w") as f:
        json.dump(data, f)
    print(f"Saved: {fp}")
    with open(fp, "r") as f:
        data = json.load(f)
    print(f"Loaded: {fp}")
    cell = cls.from_dict(data)
    print(json.dumps(cell.to_dict()))

def test_strings(name, cls, cell):
    fp = f"{DATA_DIR}/cell_{name}_strings.json"
    data = cell.to_strings()
    with open(fp, "w") as f:
        json.dump(data, f)
    print(f"Saved: {fp}")
    with open(fp, "r") as f:
        data = json.load(f)
    print(f"Loaded: {fp}")
    cell = cls.from_strings(data)
    print(json.dumps(cell.to_strings()))

def test_array(name, cls, cell):
    fp = f"{DATA_DIR}/cell_{name}_array.json"
    data = cell.to_array()
    with open(fp, "w") as f:
        json.dump(data.tolist(), f)
    print(f"Saved: {fp}")
    with open(fp, "r") as f:
        data = json.load(f)
    print(f"Loaded: {fp}")
    cell = cls.from_array(np.array(data, dtype=np.int8))
    print(json.dumps(cell.to_array().tolist()))

def test_list(name, cls, cell):
    fp = f"{DATA_DIR}/cell_{name}_list.json"
    data = cell.to_list()
    with open(fp, "w") as f:
        json.dump(data, f)
    print(f"Saved: {fp}")
    with open(fp, "r") as f:
        data = json.load(f)
    print(f"Loaded: {fp}")
    cell = cls.from_list(data)
    print(json.dumps(cell.to_list()))

def main():
    test_dict("2d", m2.Cell2d, cell_2d())
    test_dict("3d", m3.Cell3d, cell_3d())
    test_strings("2d", m2.Cell2d, cell_2d())
    test_strings("3d", m3.Cell3d, cell_3d())
    test_array("2d", m2.Cell2d, cell_2d())
    test_array("3d", m3.Cell3d, cell_3d())
    test_list("2d", m2.Cell2d, cell_2d())
    test_list("3d", m3.Cell3d, cell_3d())

if __name__ == "__main__":
    main()
