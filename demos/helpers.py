import random
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

def rgba(pixels) -> Image.Image:
    return Image.fromarray(pixels).convert("RGBA")

def save(fp: str, data):
    if isinstance(data, (bytes, str)):
        with open(fp, "wb" if isinstance(data, bytes) else "w") as f:
            f.write(data)
    else:
        rgba(data).save(fp)
    print(f"Saved: {fp}")
