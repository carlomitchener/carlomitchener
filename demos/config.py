import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

DATA_DIR = os.path.join(REPO, "data", os.path.relpath(HERE, REPO))
IMAGE_SIZE = (1000, 1000)

os.makedirs(DATA_DIR, exist_ok=True)
