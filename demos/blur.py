import mrlypy.two as m2
from mrlypy.core.colors import Color
from mrlypy.core.enums import Mode
import os
from config import DATA_DIR
from PIL import Image

def rc(): return Color.random()

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    cell = m2.carpet_2d(5, level=1)
    palette = {
        0: [rc(), rc(), rc()],
        1: [rc(), rc(), rc()],
    }
    cell.paint(palette, mode=Mode.RANDOM)
    SIZE = (1000, 1000)
    image = cell.to_image()
    image = image.resize(SIZE, resample=Image.Resampling.LANCZOS)
    fp = os.path.join(DATA_DIR, "blur.png")
    image.save(fp)
    print(f"Saved: {fp}")
    SIZE = (1920, 1080)
    cell.tile(16, 9)
    cell.paint(palette, mode=Mode.RANDOM)
    image = cell.to_image()
    image = image.resize(SIZE, resample=Image.Resampling.LANCZOS)
    image = image.convert("RGB")
    fp = os.path.join(DATA_DIR, "blur.jpg")
    image.save(fp, "JPEG")
    print(f"Saved: {fp}")

if __name__ == "__main__":
    main()
