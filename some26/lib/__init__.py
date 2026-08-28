import os
import sys

# MRLYPROD

LIB = os.path.dirname(os.path.abspath(__file__))
MRLYPROD = os.path.normpath(os.path.join(LIB, "..", "..", "mrlyprod"))

if not os.path.isdir(os.path.join(MRLYPROD, "mrlypy", "six")):
    sys.exit(f"missing mrlypy: expected it at {MRLYPROD}")

sys.path.insert(0, MRLYPROD)
