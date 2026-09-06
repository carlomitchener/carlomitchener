from enum import Enum

class Edition(Enum):
    SIMPLE = "Simple"
    INDEX = "Index"
    LAYERS = "Layers"
    NEIGHBORS = "Neighbors"
    ROWS = "Rows"
    COLUMNS = "Columns"
    RANDOM = "Random"

class Ink(Enum):
    BLACK = "Black"
    WHITE = "White"
    RED = "Red"
    ORANGE = "Orange"
    YELLOW = "Yellow"
    GREEN = "Green"
    MINT = "Mint"
    TEAL = "Teal"
    CYAN = "Cyan"
    BLUE = "Blue"
    INDIGO = "Indigo"
    PURPLE = "Purple"
    PINK = "Pink"
    BROWN = "Brown"
    GRAY = "Gray"

class Scheme(Enum):
    MULTICOLOR = "Multicolor"
    MULTITONE = "Multitone"

class Type(Enum):
    FILL = "Fill"
    VOID = "Void"
