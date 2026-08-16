import mrlytwo as m2
import mrlythree as m3
import numpy as np
from config import DATA_DIR

def tree_mask(n: int) -> np.ndarray:
    t1 = m3.tree_3d(n).types
    t2 = m3.tree_3d(n).rotate(1).types
    mask = np.zeros_like(t1, dtype=np.uint8)
    mask[(t1 == 1) | (t2 == 1)] = 1
    mask[(t1 == 1) & (t2 == 1)] = 2
    return mask

def sponge():
    cell = m3.carpet_3d(5, 2)
    fp = f"{DATA_DIR}/sponge.obj"
    cell.save_obj(fp)
    print(f"Saved: {fp}")

def carpet():
    cell = m2.random_2d(3, 3)
    cell = m3.Cell3d.from_2d(cell)
    cell.extrude(1)
    fp = f"{DATA_DIR}/carpet.obj"
    cell.save_obj(fp)
    print(f"Saved: {fp}")

def magic():
    cell_1 = m3.random_3d(3, 1)
    cell_2 = m3.random_3d(3, 1)
    cell = m3.magic_3d([cell_1, cell_2])
    fp = f"{DATA_DIR}/magic.obj"
    cell.save_obj(fp)
    print(f"Saved: {fp}")

def special():
    mask = m3.random_3d(3, 1).types
    cell = m3.special_3d(mask, m3.tree_3d(3, 1))
    fp = f"{DATA_DIR}/special.obj"
    cell.save_obj(fp)
    print(f"Saved: {fp}")

def mosaic():
    mask = tree_mask(3)
    cell_1 = m3.random_3d(3, 1)
    cell_2 = m3.random_3d(3, 1)
    cell_3 = m3.random_3d(3, 1)
    cell = m3.mosaic_3d(mask, [cell_1, cell_2, cell_3])
    fp = f"{DATA_DIR}/mosaic.obj"
    cell.save_obj(fp)
    print(f"Saved: {fp}")

def main():
    sponge()
    carpet()
    magic()
    special()
    mosaic()

if __name__ == "__main__":
    main()
