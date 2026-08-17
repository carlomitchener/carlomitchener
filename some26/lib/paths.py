from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
FILES = HERE / "files"
CUTS = FILES / "cuts"
GRIDS = FILES / "grids"
GIFS = FILES / "gifs"
EXTRAS = FILES / "extras"
HERO = FILES / "hero.png"

def ensure():
    for folder in (CUTS, GRIDS, GIFS, EXTRAS):
        folder.mkdir(parents=True, exist_ok=True)

def show(path):
    return path.relative_to(HERE.parent)

def write(path, body):
    with open(path, "w") as f:
        f.write(body if body.endswith("\n") else body + "\n")
