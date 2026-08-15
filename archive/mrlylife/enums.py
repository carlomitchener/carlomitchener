from enum import Enum

class Fate(Enum):
    LIFE = "life"
    DEAD = "dead"
    LOOP = "loop"
    TIME = "time"

class Boundary(Enum):
    CONSTANT = "constant"
    WRAP = "wrap"
