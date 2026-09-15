import matplotlib.pyplot as plt
import mrlypy.three as m3

def view(cell: m3.Cell3d):
    facecolors = "white"
    edgecolors = "black"    
    fig = plt.figure(figsize=(8, 8))
    ax = fig.add_subplot(111, projection="3d")
    ax.voxels(cell.types.astype(bool), facecolors=facecolors, edgecolors=edgecolors)
    ax.set_title(f"{cell.__repr__()}")
    ax.set_aspect("equal")
    plt.show()

def main():
    number = 3
    level = 1
    # MRLY
    view(m3.carpet_3d(number, level))
    view(m3.net_3d(number, level))
    view(m3.tree_3d(number, level))
    view(m3.void_3d(number, level))
    # ANTI
    view(m3.carpet_3d(number).invert().fractal(level))
    view(m3.net_3d(number).invert().fractal(level))
    view(m3.tree_3d(number).invert().fractal(level))
    view(m3.void_3d(number).invert().fractal(level))

if __name__ == "__main__":
    main()
