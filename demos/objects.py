import random
import numpy as np
from config import DATA_DIR
from helpers import save
from mrlypy.core import Rng
from mrlypy.math import three, two
from mrlypy.math.cell import models

RNG = Rng(random.getrandbits(32))

def random_2d(number: int, level: int) -> dict:
    return [two.carpet, two.net, two.vtree, two.void][RNG.below(4)](number, level)

def random_3d(number: int, level: int) -> dict:
    return [three.carpet, three.net, three.ztree, three.void][RNG.below(4)](number, level)

def tree_mask(n: int) -> np.ndarray:
    t1 = three.ztree(n, 1)["types"]
    t2 = models.rotate(three.ztree(n, 1), 1, (1, 2))["types"]
    mask = np.zeros_like(t1, dtype=np.uint8)
    mask[(t1 == 1) | (t2 == 1)] = 1
    mask[(t1 == 1) & (t2 == 1)] = 2
    return mask

def sponge():
    save(f"{DATA_DIR}/sponge.obj", three.to_obj(three.carpet(5, 2)))

def carpet():
    cell = three.extrude_cube(two.to_3d(random_2d(3, 3)), 1)
    save(f"{DATA_DIR}/carpet.obj", three.to_obj(cell))

def magic():
    cell = three.magic([random_3d(3, 1), random_3d(3, 1)])
    save(f"{DATA_DIR}/magic.obj", three.to_obj(cell))

def special():
    mask = random_3d(3, 1)["types"]
    cell = three.special(mask, three.ztree(3, 1))
    save(f"{DATA_DIR}/special.obj", three.to_obj(cell))

def mosaic():
    mask = tree_mask(3)
    cell = three.mosaic(mask, [random_3d(3, 1), random_3d(3, 1), random_3d(3, 1)])
    save(f"{DATA_DIR}/mosaic.obj", three.to_obj(cell))

def main():
    sponge()
    carpet()
    magic()
    special()
    mosaic()

if __name__ == "__main__":
    main()
