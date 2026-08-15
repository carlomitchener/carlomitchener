import mrlytwo as m2
from mrlycore.colors import black, white
import numpy as np
from config import DATA_DIR

string = "Hello, World!"

def str_to_bits(s: str) -> np.ndarray:
    result = []
    for char in s:
        bits = bin(ord(char))[2:]
        bits = bits.zfill(8)
        result.extend([int(b) for b in bits])
    return np.array(result, dtype=np.uint8)

def embed_data(cell: m2.Cell2d, bits: np.ndarray) -> m2.Cell2d:
    indices = np.where(cell.types == 1)
    capacity = len(indices[0])
    if len(bits) > capacity:
        print(f"Warning: Message truncated. Capacity: {capacity}, Message: {len(bits)}")
        bits = bits[:capacity]
    if len(bits) < capacity:
        repeats = capacity // len(bits) + 1
        bits = np.tile(bits, repeats)[:capacity]
    cell.types[indices] = bits
    return cell

def main():
    number = 3
    level = 2
    tile_0 = m2.carpet_2d(number, level)
    tile_1 = m2.tree_2d(number, level).rotate(90)
    tile_2 = m2.tree_2d(number, level)
    tile_3 = m2.carpet_2d(number, level).copy()
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
    qr_cell = m2.mosaic_2d(mask, cells)
    qr_cell = qr_cell.paint({0: [white], 1: [black]})
    fp = f"{DATA_DIR}/qrcode.png"
    image = qr_cell.to_image(scale=10) 
    image.save(fp)
    print(f"Saved: {fp}")

if __name__ == "__main__":
    main()
