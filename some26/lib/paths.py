import os
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
DATA_DIR = os.path.join("data", os.path.relpath(HERE))
FILES = HERE / "files"
CUTS = FILES / "cuts"
GRIDS = FILES / "grids"
GIFS = FILES / "gifs"
EXTRAS = FILES / "extras"
HERO = FILES / "hero.png"

def ensure():
    for folder in (CUTS, GRIDS, GIFS, EXTRAS):
        folder.mkdir(parents=True, exist_ok=True)

def data(name):
    os.makedirs(DATA_DIR, exist_ok=True)
    return Path(DATA_DIR) / name

def show(path):
    return os.path.relpath(path)

def write(path, body):
    with open(path, "w") as f:
        f.write(body if body.endswith("\n") else body + "\n")
