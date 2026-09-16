import os

# GENERATION
MIN_GENERATIONS = 8
MAX_GENERATIONS = 64
MAX_SEGMENTS = 8
ATTEMPTS = 64

# CANVAS
MIN_CANVAS = 0
MAX_CANVAS = 256
MIN_TILE = 0
MAX_TILE = 128
MIN_MASK = 0
MAX_MASK = 64

# VIDEO
FPS = 8
HEATMAP_FPS = 32
FREEZE_DURATION = 0.5
INTER_SEGMENT_FREEZE = 0.5
SIZE = 1080
WEB_MIN = 640
RATE = 32
CRF = 23
PRESET = "medium"

# OUTPUT
HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join("data", os.path.relpath(HERE))
FORMAT = "png"
FRAMES_DIR = "frames"
HEATMAP_DIR = "heatmap"

# FEED
VERSION = 2
LIVE_DAYS = 29.53
PREFIX = "site/cdn/feed"
POSTS = "p"
INDEX = "index.json"
MASTER = "-1080.mp4"
WEB = ".mp4"
POSTER = ".webp"
MANIFEST = ".json"
FILES = (MASTER, WEB, POSTER, MANIFEST)

def files(name):
    return [name + suffix for suffix in FILES]
