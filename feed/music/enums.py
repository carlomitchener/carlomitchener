from enum import Enum

class Scale(Enum):
    MAJOR = "major"

class WaveType(Enum):
    SINE = "sine"
    TRIANGLE = "triangle"
    SQUARE = "square"
    SAWTOOTH = "sawtooth"

class ChordType(Enum):
    TRIAD = "triad"
    SEVENTH = "seventh"

class Movement(Enum):
    REPEAT = "repeat"
    RANDOM = "random"
    UP = "up"
    DOWN = "down"
    PAUSE = "pause"
