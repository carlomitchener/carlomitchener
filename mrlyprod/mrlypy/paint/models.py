from dataclasses import dataclass
from typing import Any, Dict, List
from .enums import Edition, Ink, Scheme, Type

# PAINT

@dataclass
class Paint:

    edition: Edition = None
    scheme: Scheme = None
    target: Type = None
    primary: Ink = None
    secondary: List[Ink] = None
    shades: List[int] = None

    @property
    def is_simple(self) -> bool:
        return self.edition in [Edition.SIMPLE]

    def wipe(self) -> "Paint":
        self.secondary = None
        self.shades = None
        return self

    def to_dict(self) -> Dict[str, Any]:
        data = {}
        data["edition"] = self.edition.value if self.edition else None
        data["scheme"] = self.scheme.value if self.scheme else None
        data["target"] = self.target.value if self.target else None
        data["primary"] = self.primary.value if self.primary else None
        data["secondary"] = [s.value for s in self.secondary] if self.secondary else None
        data["shades"] = self.shades
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Paint":
        p = cls()
        p.edition = Edition(data["edition"]) if data.get("edition") else None
        p.scheme = Scheme(data["scheme"]) if data.get("scheme") else None
        p.target = Type(data["target"]) if data.get("target") else None
        p.primary = Ink(data["primary"]) if data.get("primary") else None
        p.secondary = [Ink(s) for s in data["secondary"]] if data.get("secondary") else None
        p.shades = data.get("shades")
        return p
