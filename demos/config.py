import os

HERE = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join("data", os.path.relpath(HERE))
IMAGE_SIZE = (1000, 1000)

os.makedirs(DATA_DIR, exist_ok=True)
