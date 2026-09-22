import random
from mrlypy.core.colors import ALPHA, BLACK, BLUE, BROWN, CYAN, GRAY, GREEN, INDIGO, MINT, ORANGE, PINK, PURPLE, RED, TEAL, WHITE, YELLOW, gradient

PRIMARIES = [BLACK, WHITE]
SECONDARIES = [RED, ORANGE, YELLOW, GREEN, MINT, TEAL, CYAN, BLUE, INDIGO, PURPLE, PINK, BROWN, GRAY]

def random_color():
    return random.choice([ALPHA, *PRIMARIES, *SECONDARIES])

def random_primary():
    return random.choice(PRIMARIES)

def random_secondary():
    return random.choice(SECONDARIES)

def random_gradient(steps: int = 10):
    c1, c2 = random.sample(SECONDARIES, 2)
    return gradient([c1, c2], steps)
