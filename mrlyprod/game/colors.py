from mrlypy.core.colors import Color
from mrlypy.core.state import randint, sample, shuffle
from mrlypy.paint.colors import get_color
from mrlypy.paint.enums import Ink
from typing import List, Tuple
from models import Task

# PRIMARIES

PRIMARIES = {
    Ink.BLACK: get_color(Ink.BLACK),
    Ink.WHITE: get_color(Ink.WHITE),
}

# SECONDARIES

SECONDARIES = {
    Ink.RED: get_color(Ink.RED),
    Ink.ORANGE: get_color(Ink.ORANGE),
    Ink.YELLOW: get_color(Ink.YELLOW),
    Ink.GREEN: get_color(Ink.GREEN),
    Ink.MINT: get_color(Ink.MINT),
    Ink.TEAL: get_color(Ink.TEAL),
    Ink.CYAN: get_color(Ink.CYAN),
    Ink.BLUE: get_color(Ink.BLUE),
    Ink.INDIGO: get_color(Ink.INDIGO),
    Ink.PURPLE: get_color(Ink.PURPLE),
    Ink.PINK: get_color(Ink.PINK),
    Ink.BROWN: get_color(Ink.BROWN),
    Ink.GRAY: get_color(Ink.GRAY),
}

# FRAMES

def create_frames_colors(task: Task, k: int) -> Tuple[Color, List[Color]]:
    print(f"Creating frames colors for variation: {task.key}")
    primary = PRIMARIES[task.primary]
    if not task.is_simple():
        k = randint(2, len(SECONDARIES))
    print(f"Secondary count: {k}")
    secondary_inks = sample(list(SECONDARIES.keys()), k)
    if task.secondary not in secondary_inks:
        secondary_inks.pop()
        secondary_inks.append(task.secondary)
        shuffle(secondary_inks)
    print(f"Secondary inks: {[ink.value for ink in secondary_inks]}")
    secondary = [SECONDARIES[ink] for ink in secondary_inks]
    return primary, secondary

# HEATMAP

def create_heatmap_colors(task: Task) -> Tuple[Color, List[Color]]:
    print(f"Creating heatmap colors for variation: {task.key}")
    primary = PRIMARIES[task.primary]
    secondary = SECONDARIES[task.secondary]
    if primary == PRIMARIES[Ink.WHITE]:
        print(f"Heatmap colors: {task.primary.value}, {task.secondary.value}, {Ink.BLACK.value}")
        return primary, [secondary, PRIMARIES[Ink.BLACK]]
    if primary == PRIMARIES[Ink.BLACK]:
        print(f"Heatmap colors: {task.primary.value}, {task.secondary.value}, {Ink.WHITE.value}")
        return primary, [secondary, PRIMARIES[Ink.WHITE]]
