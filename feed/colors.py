from mrlypy.core.paint import Ink
from typing import List, Tuple
from models import Task

Color = Tuple[int, int, int, int]

# PRIMARIES

PRIMARIES = {ink: Ink.color(ink) for ink in ("Black", "White")}

# SECONDARIES

SECONDARIES = {ink: Ink.color(ink) for ink in Ink.all() if ink not in PRIMARIES}

# FRAMES

def create_frames_colors(task: Task, k: int, rng) -> Tuple[Color, List[Color]]:
    print(f"Creating frames colors for variation: {task.key}")
    primary = PRIMARIES[task.primary]
    if not task.is_simple():
        k = rng.range(2, len(SECONDARIES))
    print(f"Secondary count: {k}")
    inks = list(SECONDARIES)
    secondary_inks = [inks[i] for i in rng.sample_indices(len(inks), k)]
    if task.secondary not in secondary_inks:
        secondary_inks.pop()
        secondary_inks.append(task.secondary)
        rng.shuffle(secondary_inks)
    print(f"Secondary inks: {secondary_inks}")
    secondary = [SECONDARIES[ink] for ink in secondary_inks]
    return primary, secondary

# HEATMAP

def create_heatmap_colors(task: Task) -> Tuple[Color, List[Color]]:
    print(f"Creating heatmap colors for variation: {task.key}")
    primary = PRIMARIES[task.primary]
    secondary = SECONDARIES[task.secondary]
    other = "Black" if task.primary == "White" else "White"
    print(f"Heatmap colors: {task.primary}, {task.secondary}, {other}")
    return primary, [secondary, PRIMARIES[other]]
