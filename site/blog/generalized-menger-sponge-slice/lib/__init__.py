import os
import sys

# MRLYPY

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def root():
    folder = HERE
    while folder != os.path.dirname(folder):
        if os.path.isdir(os.path.join(folder, "mrlypy", "six")):
            return folder
        folder = os.path.dirname(folder)
    sys.exit(f"missing mrlypy: no mrlypy/six above {HERE}")

sys.path.insert(0, root())
