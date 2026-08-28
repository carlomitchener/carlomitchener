import os

HERE = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(HERE, "data")
IMAGE_SIZE = (1000, 1000)

os.makedirs(DATA_DIR, exist_ok=True)
