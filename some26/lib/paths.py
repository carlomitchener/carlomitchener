import os
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
REPO = HERE.parent
DATA_DIR = os.path.join(REPO, "data", os.path.relpath(HERE, REPO))
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
    return os.path.relpath(path, REPO)

def write(path, body):
    with open(path, "w") as f:
        f.write(body if body.endswith("\n") else body + "\n")
