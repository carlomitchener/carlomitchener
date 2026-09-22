import random
from io import BytesIO
from PIL import Image

def hex_key(count: int):
    return "".join(random.choices("abcdef123456789", k=count))

def is_prime(n: int) -> bool:
    if n <= 1:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

def decode(png: bytes) -> Image.Image:
    return Image.open(BytesIO(png)).convert("RGBA")

def save(fp: str, data: bytes | str):
    with open(fp, "wb" if isinstance(data, bytes) else "w") as f:
        f.write(data)
    print(f"Saved: {fp}")
