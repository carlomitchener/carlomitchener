from enum import Enum

class Design(Enum):
    CARPET = "Carpet"
    NET = "Net"
    TREE = "Tree"
    VOID = "Void"

class Group(Enum):
    GENERAL = "General"
    FRACTAL = "Fractal"
    MAGIC = "Magic"
    SPECIAL = "Special"
    MOSAIC = "Mosaic"

class Dimension(Enum):
    TWO = "2D"
    THREE = "3D"
    SIX = "6D"
