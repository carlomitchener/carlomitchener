import os
import sys

# MRLYPY

LIB = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(LIB, "..", ".."))

if not os.path.isdir(os.path.join(ROOT, "mrlypy", "six")):
    sys.exit(f"missing mrlypy: expected it at {ROOT}")

sys.path.insert(0, ROOT)
