import numpy as np
from config import DATA_DIR
from helpers import save
from mrlypy.core.cell import mosaic
from mrlypy.core.colors import BLACK, WHITE
from mrlypy.math import two
from mrlypy.math.cell import models, paint

string = "Hello, World!"

def str_to_bits(s: str) -> np.ndarray:
    result = []
    for char in s:
        bits = bin(ord(char))[2:]
        bits = bits.zfill(8)
        result.extend([int(b) for b in bits])
    return np.array(result, dtype=np.uint8)

def embed_data(cell: dict, bits: np.ndarray) -> dict:
    types = cell["types"].copy()
    indices = np.where(types == 1)
    capacity = len(indices[0])
    if len(bits) > capacity:
        print(f"Warning: Message truncated. Capacity: {capacity}, Message: {len(bits)}")
        bits = bits[:capacity]
    if len(bits) < capacity:
        repeats = capacity // len(bits) + 1
        bits = np.tile(bits, repeats)[:capacity]
    types[indices] = bits
    return {**cell, "types": types}

def main():
    number = 3
    level = 2
    tile_0 = two.carpet(number, level)
    tile_1 = models.rotate(two.vtree(number, level), 90)
    tile_2 = two.vtree(number, level)
    tile_3 = two.carpet(number, level)
    bits = str_to_bits(string)
    tile_3 = embed_data(tile_3, bits)
    mask = np.array([
        [0, 1, 1, 1, 0],
        [2, 3, 3, 3, 2],
        [2, 3, 3, 3, 2],
        [2, 3, 3, 3, 2],
        [0, 1, 1, 1, 0]
    ], dtype=np.uint8)
    cells = [tile_0, tile_1, tile_2, tile_3]
    qr_cell = mosaic(mask, cells)
    qr_cell = paint(qr_cell, {0: [WHITE], 1: [BLACK]})
    save(f"{DATA_DIR}/qrcode.png", two.png(qr_cell, 10, None, 0, "Square"))

if __name__ == "__main__":
    main()
