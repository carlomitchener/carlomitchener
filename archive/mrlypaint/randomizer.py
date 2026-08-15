from typing import List
from mrlycore.state import choice, randint, sample, shuffle
from .enums import Edition, Ink, Scheme, Type

# EDITION

def random_edition(editions: List[Edition] = None) -> Edition:
    choices = list(Edition) if editions is None else editions
    return choice(choices)

# PAINT

def random_primary(primaries: List[Ink] = None) -> Ink:
    if primaries and len(primaries) == 1:
        return primaries[0]
    choices = [Ink.BLACK, Ink.WHITE]
    if primaries:
        choices = [ink for ink in choices if ink in primaries]
    return choice(choices)

def random_secondary(count: int = None, primary: Ink = None) -> List[Ink]:
    inks = list(Ink)
    if primary is None:
        inks.remove(Ink.BLACK)
        inks.remove(Ink.WHITE)
    else:
        inks.remove(primary)
    if count is None:
        count = randint(2, 9)
    return sample(inks, count)

def random_shades(count: int = None, primary: Ink = None) -> List[int]:
    if count == 1:
        return [0] if primary == Ink.BLACK else [1]
    if count is None:
        count = randint(2, 9)
    shades = list(range(count))
    shuffle(shades)
    return shades
