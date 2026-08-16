from mrlycore.colors import Color, gradient
import random

alpha = Color(0, 0, 0, 0)
black = Color(0, 0, 0)
white = Color(255, 255, 255)
red = Color(255, 61, 64)
orange = Color(255, 143, 44)
yellow = Color(255, 209, 0)
green = Color(50, 204, 88)
mint = Color(0, 209, 187)
teal = Color(0, 202, 216)
cyan = Color(30, 201, 243)
blue = Color(0, 140, 255)
indigo = Color(103, 104, 250)
purple = Color(211, 50, 233)
pink = Color(255, 50, 90)
brown = Color(177, 132, 98)
gray = Color(142, 142, 147)

primaries = [black, white]
secondaries = [red, orange, yellow, green, mint, teal, cyan, blue, indigo, purple, pink, brown, gray]

def random_color():
    choices = [alpha, black, white, red, orange, yellow, green, mint, teal, cyan, blue, indigo, purple, pink, brown, gray]
    return random.choice(choices)

def random_primary():
    return random.choice(primaries)

def random_secondary():
    return random.choice(secondaries)

def random_gradient(steps: int = 10):
    c1, c2 = random.sample(secondaries, 2)
    colors = gradient([c1, c2], steps)
    return colors
