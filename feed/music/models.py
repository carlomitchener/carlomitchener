import json
from dataclasses import dataclass, field
from typing import Any, Dict, List
from .enums import ChordType, Movement, Scale, WaveType

# VOICE

@dataclass
class Voice:
    note_pool: list[int] = field(default_factory=list)
    movements: list[Movement] = field(default_factory=list)
    chord_type: ChordType = None
    num_notes: list[int] = None
    wave_type: WaveType = WaveType.SINE
    num_harmonics: int = 1
    harmonic_wave: WaveType = WaveType.TRIANGLE

    def __post_init__(self):
        if self.num_notes is None:
            self.num_notes = [1]

# MUSIC

@dataclass
class Music:
    scale: Scale = None
    progression: str = None
    voices: list["Voice"] = None
    track: List[List[int]] = None

    def to_dict(self) -> Dict[str, Any]:
        data = {}
        data["scale"] = self.scale.value if self.scale else None
        data["progression"] = self.progression
        data["track"] = self.track
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Music":
        s = cls()
        s.scale = Scale(data["scale"]) if data.get("scale") else None
        s.progression = data.get("progression")
        s.track = data.get("track")
        return s

    # JSON

    def to_json_string(self) -> str:
        return json.dumps({
            "scale": self.scale.value if self.scale else None,
            "progression": self.progression,
            "track": self.track,
        }, separators=(",", ":"))
