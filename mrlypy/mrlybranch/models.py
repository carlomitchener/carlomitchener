import numpy as np
from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple
from mrlycore.errors import MrlyError

class Node:

    def __init__(self, position: Tuple[float, ...], index: Optional[int] = None):
        self.position = tuple(float(c) for c in position)
        self.index = index

    @property
    def dim(self) -> int:
        return len(self.position)

    def __repr__(self) -> str:
        coords = ", ".join(f"{c:g}" for c in self.position)
        return f"Node({coords})"

class Branch:

    def __init__(self, parent: int, child: int, radius: float = 1.0):
        self.parent = parent
        self.child = child
        self.radius = float(radius)

    def __repr__(self) -> str:
        return f"Branch({self.parent}->{self.child}, r={self.radius:g})"

class Network:

    def __init__(self, dim: int = 2):
        self._dim = dim
        self.nodes: List[Node] = []
        self.branches: List[Branch] = []

    @property
    def dim(self) -> int:
        return self._dim

    # MAIN

    def add_node(self, position: Tuple[float, ...]) -> int:
        if len(position) != self._dim:
            raise MrlyError(f"Expected {self._dim}D position, got {len(position)}D")
        index = len(self.nodes)
        self.nodes.append(Node(position, index))
        return index

    def add_branch(self, parent: int, child: int, radius: float = 1.0) -> Branch:
        n = len(self.nodes)
        if not (0 <= parent < n and 0 <= child < n):
            raise MrlyError(f"Branch endpoints out of range: {parent}, {child}")
        branch = Branch(parent, child, radius)
        self.branches.append(branch)
        return branch

    def copy(self) -> "Network":
        return deepcopy(self)

    def __repr__(self) -> str:
        return f"Network(dim={self._dim}, nodes={len(self.nodes)}, branches={len(self.branches)})"

    # DERIVED

    def positions(self) -> np.ndarray:
        if not self.nodes:
            return np.zeros((0, self._dim))
        return np.array([node.position for node in self.nodes], dtype=float)

    def edge_array(self) -> np.ndarray:
        if not self.branches:
            return np.zeros((0, 2), dtype=np.int64)
        return np.array([(b.parent, b.child) for b in self.branches], dtype=np.int64)

    def degree(self) -> np.ndarray:
        deg = np.zeros(len(self.nodes), dtype=np.int64)
        for branch in self.branches:
            deg[branch.parent] += 1
            deg[branch.child] += 1
        return deg

    def adjacency(self) -> Dict[int, List[int]]:
        adj: Dict[int, List[int]] = {i: [] for i in range(len(self.nodes))}
        for branch in self.branches:
            adj[branch.parent].append(branch.child)
            adj[branch.child].append(branch.parent)
        return adj

    # SERIALIZER

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dim": self._dim,
            "nodes": [list(node.position) for node in self.nodes],
            "branches": [[b.parent, b.child, b.radius] for b in self.branches],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Network":
        network = cls(dim=data["dim"])
        for position in data["nodes"]:
            network.add_node(tuple(position))
        for parent, child, radius in data["branches"]:
            network.add_branch(parent, child, radius)
        return network

    # CENSUS

    def census(self) -> Dict[str, float]:
        from . import census
        return census.census(self)
