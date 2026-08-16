import os
import sys
import time
from .models import Life

FILL = "\u2B1B\uFE0F"
VOID = "\u2B1C\uFE0F"
FPS = 4

def clear_console():
    os.system("clear")

def resize_console(rows, cols):
    cols = 32 if cols < 32 else cols
    command = "\x1b[8;{rows};{cols}t".format(rows=rows, cols=cols + cols)
    sys.stdout.write(command)

def print_grid(rows, cols, grid):
    clear_console()
    output_str = ""
    for row in range(rows):
        output_str += "".join([FILL if c else VOID for c in grid[row]])
        output_str += "\n\r"
    print(output_str, end="")

def run_animation(result: Life):
    rows, cols = result.grids[0].height, result.grids[0].width
    resize_console(rows, cols)
    delay = 1 / FPS
    for i, grid in enumerate(result.grids):
        print_grid(rows, cols, grid.types.tolist())
        print(f"Generation: {i + 1} / {result.count} - {result.fate.value}")
        time.sleep(delay)

def play(result: Life):
    while True:
        run_animation(result)
