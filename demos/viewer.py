import matplotlib.pyplot as plt
from mrlypy.math import three
from mrlypy.math.cell import models

def view(cell: dict):
    facecolors = "white"
    edgecolors = "black"
    depth, height, width = cell["types"].shape
    fig = plt.figure(figsize=(8, 8))
    ax = fig.add_subplot(111, projection="3d")
    ax.voxels(cell["types"].astype(bool), facecolors=facecolors, edgecolors=edgecolors)
    ax.set_title(f"Cell3d(width={width}, height={height}, depth={depth})")
    ax.set_aspect("equal")
    plt.show()

def anti(design, number: int, level: int) -> dict:
    return models.fractal(models.invert(design(number, 1)), level)

def main():
    number = 3
    level = 1
    # MRLY
    view(three.carpet(number, level))
    view(three.net(number, level))
    view(three.ztree(number, level))
    view(three.void(number, level))
    # ANTI
    view(anti(three.carpet, number, level))
    view(anti(three.net, number, level))
    view(anti(three.ztree, number, level))
    view(anti(three.void, number, level))

if __name__ == "__main__":
    main()
