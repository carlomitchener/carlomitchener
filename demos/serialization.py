import json
import numpy as np
from config import DATA_DIR
from mrlypy.core.cell import moore
from mrlypy.core.colors import BLUE, RED, WHITE
from mrlypy.math import three, two
from mrlypy.math.cell import models, paint

FORMATS = {
    "2d": {
        "dict": (lambda cell: json.loads(two.to_json(cell)), lambda data: two.from_json(json.dumps(data))),
        "strings": (two.text, two.from_strings),
        "array": (lambda cell: cell["types"].tolist(), lambda data: models.new(np.array(data, dtype=np.uint8))),
    },
    "3d": {
        "dict": (lambda cell: json.loads(three.to_json(cell)), lambda data: three.from_json(json.dumps(data))),
        "strings": (three.to_strings, three.from_strings),
        "array": (lambda cell: cell["types"].tolist(), lambda data: models.new(np.array(data, dtype=np.uint8))),
    },
}

def cell_2d():
    cell = models.neighbors(two.carpet(3, 1), two.net(3, 1)["types"], 1, False)
    return paint(cell, {0: [RED, BLUE], 1: [WHITE]}, "Tag")

def cell_3d():
    cell = models.neighbors(three.carpet(3, 1), moore(3), 1, False)
    return paint(cell, {0: [RED, BLUE], 1: [WHITE]}, "Tag")

def roundtrip(name, kind, cell):
    write, read = FORMATS[name][kind]
    fp = f"{DATA_DIR}/cell_{name}_{kind}.json"
    with open(fp, "w") as f:
        json.dump(write(cell), f)
    print(f"Saved: {fp}")
    with open(fp, "r") as f:
        data = json.load(f)
    print(f"Loaded: {fp}")
    print(json.dumps(write(read(data))))

def main():
    for kind in ["dict", "strings", "array"]:
        roundtrip("2d", kind, cell_2d())
        roundtrip("3d", kind, cell_3d())

if __name__ == "__main__":
    main()
