from typing import TYPE_CHECKING
from mrlypy.three.designs import (
    carpet_3d, net_3d, tree_3d, void_3d,
    level_set_3d, xtree_3d, ytree_3d, ztree_3d,
)
from .geometry import iso, pro, cut

if TYPE_CHECKING:
    from .models import Cell6d

# CARPET

def carpet_iso(number: int, level: int = 1) -> "Cell6d":
    return iso(carpet_3d(number, level))

def carpet_pro(number: int, level: int = 1) -> "Cell6d":
    return pro(carpet_3d(number, level))

def carpet_cut(number: int, level: int = 1) -> "Cell6d":
    return cut(carpet_3d(number, level))

# NET

def net_iso(number: int, level: int = 1) -> "Cell6d":
    return iso(net_3d(number, level))

def net_pro(number: int, level: int = 1) -> "Cell6d":
    return pro(net_3d(number, level))

def net_cut(number: int, level: int = 1) -> "Cell6d":
    return cut(net_3d(number, level))

# TREE

def tree_iso(number: int, level: int = 1) -> "Cell6d":
    return iso(tree_3d(number, level))

def tree_pro(number: int, level: int = 1) -> "Cell6d":
    return pro(tree_3d(number, level))

def tree_cut(number: int, level: int = 1) -> "Cell6d":
    return cut(tree_3d(number, level))

# VOID

def void_iso(number: int, level: int = 1) -> "Cell6d":
    return iso(void_3d(number, level))

def void_pro(number: int, level: int = 1) -> "Cell6d":
    return pro(void_3d(number, level))

def void_cut(number: int, level: int = 1) -> "Cell6d":
    return cut(void_3d(number, level))

def xtree_iso(number: int, level: int = 1) -> "Cell6d":
    return iso(xtree_3d(number, level))

def xtree_pro(number: int, level: int = 1) -> "Cell6d":
    return pro(xtree_3d(number, level))

def xtree_cut(number: int, level: int = 1) -> "Cell6d":
    return cut(xtree_3d(number, level))

def ytree_iso(number: int, level: int = 1) -> "Cell6d":
    return iso(ytree_3d(number, level))

def ytree_pro(number: int, level: int = 1) -> "Cell6d":
    return pro(ytree_3d(number, level))

def ytree_cut(number: int, level: int = 1) -> "Cell6d":
    return cut(ytree_3d(number, level))

def ztree_iso(number: int, level: int = 1) -> "Cell6d":
    return iso(ztree_3d(number, level))

def ztree_pro(number: int, level: int = 1) -> "Cell6d":
    return pro(ztree_3d(number, level))

def ztree_cut(number: int, level: int = 1) -> "Cell6d":
    return cut(ztree_3d(number, level))

def level_set_iso(number: int, levels, level: int = 1) -> "Cell6d":
    return iso(level_set_3d(number, levels, level))

def level_set_pro(number: int, levels, level: int = 1) -> "Cell6d":
    return pro(level_set_3d(number, levels, level))

def level_set_cut(number: int, levels, level: int = 1) -> "Cell6d":
    return cut(level_set_3d(number, levels, level))

def anti_iso(design_3d) -> "Cell6d":
    return iso(design_3d.copy().invert())

def anti_pro(design_3d) -> "Cell6d":
    return pro(design_3d.copy().invert())

def anti_cut(design_3d) -> "Cell6d":
    return cut(design_3d.copy().invert())
