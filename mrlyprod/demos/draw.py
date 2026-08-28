import mrlypy.two as m2
from mrlypy.core.colors import red
from config import DATA_DIR

def cell2d_image():
    cell = m2.carpet_2d(3, 2)
    cell = cell.tile(2, 2)
    cell = cell.paint()
    image = cell.to_image(10)
    fp = f"{DATA_DIR}/cell_2d_image.png"
    image.save(fp)
    print(f"Saved: {fp}")

def cell2d_squares():
    cell = m2.carpet_2d(3, 2)
    cell = cell.tile(2, 2)
    cell = cell.paint()
    image = cell.draw_square(10)
    fp = f"{DATA_DIR}/cell_2d_squares.png"
    image.save(fp)
    print(f"Saved: {fp}")

def cell2d_circles():
    cell = m2.carpet_2d(3, 2)
    cell = cell.tile(2, 2)
    cell = cell.paint()
    image = cell.draw_circle(10)
    fp = f"{DATA_DIR}/cell_2d_circles.png"
    image.save(fp)
    print(f"Saved: {fp}")

def cell2d_diamonds():
    cell = m2.carpet_2d(3, 2)
    cell = cell.tile(2, 2)
    cell = cell.paint()
    image = cell.draw_diamond(10)
    fp = f"{DATA_DIR}/cell_2d_diamonds.png"
    image.save(fp)
    print(f"Saved: {fp}")

def cell2d_squares_outline():
    cell = m2.carpet_2d(3, 2)
    cell = cell.tile(2, 2)
    cell = cell.paint()
    image = cell.draw_square(10, red)
    fp = f"{DATA_DIR}/cell_2d_squares_outline.png"
    image.save(fp)
    print(f"Saved: {fp}")

def cell2d_circles_outline():
    cell = m2.carpet_2d(3, 2)
    cell = cell.tile(2, 2)
    cell = cell.paint()
    image = cell.draw_circle(10, red)
    fp = f"{DATA_DIR}/cell_2d_circles_outline.png"
    image.save(fp)
    print(f"Saved: {fp}")

def cell2d_diamonds_outline():
    cell = m2.carpet_2d(3, 2)
    cell = cell.tile(2, 2)
    cell = cell.paint()
    image = cell.draw_diamond(10, red)
    fp = f"{DATA_DIR}/cell_2d_diamonds_outline.png"
    image.save(fp)
    print(f"Saved: {fp}")

def main():
    cell2d_image()
    cell2d_squares()
    cell2d_circles()
    cell2d_diamonds()
    cell2d_squares_outline()
    cell2d_circles_outline()
    cell2d_diamonds_outline()

if __name__ == "__main__":
    main()
