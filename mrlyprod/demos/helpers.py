import random

def hex_key(count: int):
    return "".join(random.choices("abcdef123456789", k=count))

def is_prime(n: int) -> bool:
    if n <= 1:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True
