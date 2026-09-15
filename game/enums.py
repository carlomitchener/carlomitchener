from enum import Enum

class Path(Enum):
    SIMPLE = "simple"
    BASIC = "basic"
    COPY = "copy"

class Sequence(Enum):
    ALL = "all"
    CUSTOM = "custom"
    EVENS = "evens"
    ODDS = "odds"
    RANDOM = "random"
    PRIME = "prime"
    BINARY = "binary"
    FIBONACCI = "fibonacci"
    GRID_SQUARES = "grid_squares"
    CARPET_FILL_SQUARES = "carpet_fill_squares"
    CARPET_VOID_SQUARES = "carpet_void_squares"
    NET_FILL_SQUARES = "net_fill_squares"
    NET_VOID_SQUARES = "net_void_squares"
    TREE_FILL_SQUARES = "tree_fill_squares"
    TREE_VOID_SQUARES = "tree_void_squares"
    VOID_FILL_SQUARES = "void_fill_squares"
    VOID_VOID_SQUARES = "void_void_squares"

class Way(Enum):
    CONWAY = "conway"
    MRLYWAY = "mrlyway"
