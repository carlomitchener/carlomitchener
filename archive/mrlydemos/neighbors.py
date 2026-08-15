import mrlytwo as m2
from mrlycore.colors import Color, black
from mrlycore.enums import Mode
import numpy as np

def main():
    cell = m2.net_2d(5, 2)
    mask = m2.net_2d(3).types
    mask[1, 1] = 0
    num_colors = np.sum(mask)
    mode = Mode.TAG
    fill = [black]
    void = [Color.random() for _ in range(num_colors + 1)]
    params = ({0: void, 1: fill}, mode)
    cell.neighbors(mask).paint(*params).to_image(10).show()
    print(cell.tags)

if __name__ == "__main__":
    main()
