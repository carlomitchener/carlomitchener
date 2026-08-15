import numpy as np
from config import DATA_DIR
from helpers import is_prime
from PIL import Image, ImageDraw

def heatmap(size: int, limit: int):
    x, y = np.indices((size, size))
    x = x + 1
    y = y + 1
    u = x / size
    v = y / size
    heatmap = np.zeros((size, size), dtype=np.float32)
    for n in range(1, limit + 1, 2):
        parity_x = (np.floor(n * u) % 2 == 0).astype(float)
        parity_y = (np.floor(n * v) % 2 == 0).astype(float)
        heatmap += parity_x * parity_y
    heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min()) * 255
    img = Image.fromarray(heatmap.astype(np.uint8))
    fp = f"{DATA_DIR}/heatmap_size_{size}_limit_{limit}.png"
    img.save(fp)
    print(f"Saved: {fp}")

def lines(size: int, limit: int):
    img = Image.new('RGB', (size, size), 'white')
    draw = ImageDraw.Draw(img)
    for n in range(2, limit + 1, 2):
        if is_prime(n):
            continue
        dots = []
        for k in range(0, n + 1):
            dots.append((k/n, 0))
            dots.append((k/n, 1))
        for k in range(1, n):
            dots.append((0, k/n))
            dots.append((1, k/n))
        dots = list(set(dots))
        for i in range(len(dots)):
            p1 = dots[i]
            x1, y1 = p1[0] * (size - 1), p1[1] * (size - 1)
            for j in range(i + 1, len(dots)):
                p2 = dots[j]
                x2, y2 = p2[0] * (size - 1), p2[1] * (size - 1)
                draw.line([x1, y1, x2, y2], fill=(0, 0, 0), width=1)
    fp = f"{DATA_DIR}/lines_size_{size}_limit_{limit}.png"
    img.save(fp)
    print(f"Saved: {fp}")

def main():
    size = 1000
    limit = 5
    heatmap(size, limit)
    lines(size, limit)

if __name__ == "__main__":
    main()
