import json, os
from mrlypy.core.palette import PALETTE

HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    bird = json.load(open(os.path.join(HERE, "bird.json")))
    palette = {name: "#%02x%02x%02x" % rgb for name, rgb in PALETTE.items()}
    with open(os.path.join(HERE, "bird.js"), "w") as f:
        f.write("const BIRD = " + json.dumps(bird, separators=(",", ":")) + ";\n")
        f.write("const PALETTE = " + json.dumps(palette, separators=(",", ":")) + ";\n")
    print("wrote bird.js")

if __name__ == "__main__":
    main()
