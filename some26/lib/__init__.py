import os
import sys

# MRLYPY

LIB = os.path.dirname(os.path.abspath(__file__))
MRLYPY = os.path.normpath(os.path.join(LIB, "..", "..", "mrlypy"))

if not os.path.isdir(os.path.join(MRLYPY, "mrlysix")):
    sys.exit(f"missing mrlysix: expected mrlypy at {MRLYPY}")

sys.path.insert(0, MRLYPY)
