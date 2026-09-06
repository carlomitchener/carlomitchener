import numpy as np
from typing import List, Tuple
from mrlypy.core.errors import MrlyError
from .models import Network

# ABSTRACT FRACTAL TREE

def tree_2d(
    depth: int = 6,
    angle: float = 30.0,
    ratio: float = 0.7,
    children: int = 2,
    length: float = 1.0,
) -> Network:
    if depth < 1:
        raise MrlyError("Tree depth must be at least 1.")
    if children < 1:
        raise MrlyError("Tree must have at least one child per node.")
    network = Network(dim=2)
    root = network.add_node((0.0, 0.0))
    spread = np.radians(angle)
    _grow_2d(network, root, np.array([0.0, 1.0]), length, depth, spread, ratio, children)
    return network

def _grow_2d(
    network: Network,
    parent: int,
    direction: np.ndarray,
    length: float,
    depth: int,
    spread: float,
    ratio: float,
    children: int,
):
    if depth == 0:
        return
    base = network.nodes[parent].position
    if children == 1:
        offsets = [0.0]
    else:
        offsets = list(np.linspace(-spread, spread, children))
    for offset in offsets:
        rotated = _rotate(direction, offset)
        tip = (base[0] + rotated[0] * length, base[1] + rotated[1] * length)
        child = network.add_node(tip)
        network.add_branch(parent, child, radius=ratio ** (0) + depth)
        _grow_2d(network, child, rotated, length * ratio, depth - 1, spread, ratio, children)

def _rotate(vector: np.ndarray, angle: float) -> np.ndarray:
    cos_a, sin_a = np.cos(angle), np.sin(angle)
    matrix = np.array([[cos_a, -sin_a], [sin_a, cos_a]])
    return matrix @ vector

# L-SYSTEM PLANT

def plant_2d(
    depth: int = 5,
    angle: float = 25.0,
    ratio: float = 0.65,
    length: float = 1.0,
) -> Network:
    return tree_2d(depth=depth, angle=angle, ratio=ratio, children=2, length=length)

# 3D TREE

def tree_3d(
    depth: int = 5,
    angle: float = 30.0,
    ratio: float = 0.7,
    children: int = 3,
    length: float = 1.0,
) -> Network:
    if depth < 1:
        raise MrlyError("Tree depth must be at least 1.")
    network = Network(dim=3)
    root = network.add_node((0.0, 0.0, 0.0))
    spread = np.radians(angle)
    _grow_3d(network, root, np.array([0.0, 0.0, 1.0]), length, depth, spread, ratio, children)
    return network

def _grow_3d(
    network: Network,
    parent: int,
    direction: np.ndarray,
    length: float,
    depth: int,
    spread: float,
    ratio: float,
    children: int,
):
    if depth == 0:
        return
    base = network.nodes[parent].position
    axis_a, axis_b = _frame(direction)
    for k in range(children):
        phi = 2.0 * np.pi * k / children
        bend = axis_a * np.cos(phi) + axis_b * np.sin(phi)
        rotated = _normalize(direction * np.cos(spread) + bend * np.sin(spread))
        tip = tuple(base[i] + rotated[i] * length for i in range(3))
        child = network.add_node(tip)
        network.add_branch(parent, child, radius=float(depth))
        _grow_3d(network, child, rotated, length * ratio, depth - 1, spread, ratio, children)

def _frame(direction: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    reference = np.array([1.0, 0.0, 0.0]) if abs(direction[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    axis_a = _normalize(np.cross(direction, reference))
    axis_b = _normalize(np.cross(direction, axis_a))
    return axis_a, axis_b

def _normalize(vector: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vector)
    if norm == 0:
        return vector
    return vector / norm
