import mrlypy.two as m2
from mrlypy.core.colors import black, white

def mrly(number, level, palette):
    mrly_factory = {
        "carpet": m2.carpet_2d(number, level),
        "net": m2.net_2d(number, level),
        "tree": m2.tree_2d(number, level),
        "void": m2.void_2d(number, level),
    }
    for key, value in mrly_factory.items():
        value.paint(palette).to_image().show(key)

def anti(number, level, palette):
    anti_factory = {
        "point": m2.carpet_2d(number).invert().fractal(level),
        "dust": m2.net_2d(number).invert().fractal(level),
        "line": m2.tree_2d(number).invert().fractal(level),
        "star": m2.void_2d(number).invert().fractal(level),
    }
    for key, value in anti_factory.items():
        value.paint(palette).to_image().show(key)

def main():
    number = 3
    level = 3
    palette = {0: [white], 1: [black]}
    mrly(number, level, palette)
    anti(number, level, palette)

if __name__ == "__main__":
    main()
