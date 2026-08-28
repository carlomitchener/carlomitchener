import builtins
import numpy as np
from typing import Any, Optional

class State:

    def __init__(self):
        self._rng = np.random.RandomState()

    @property
    def rng(self):
        return self._rng

    def seed(self, seed: Optional[int] = None):
        self._rng = np.random.RandomState(seed)

state = State()

# API

def seed(s: Optional[int] = None):
    state.seed(s)

def bool() -> builtins.bool:
    return builtins.bool(state.rng.choice([True, False]))

def choice(seq: list) -> Any:
    idx = state.rng.randint(0, len(seq))
    return seq[idx]

def sample(seq: list, k: int) -> list:
    indices = state.rng.choice(len(seq), size=k, replace=False)
    return [seq[i] for i in indices]

def shuffle(seq: list):
    state.rng.shuffle(seq)

def randint(a: int, b: int) -> int:
    return int(state.rng.randint(a, b + 1))
