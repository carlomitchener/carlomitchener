from dataclasses import asdict, dataclass, field

@dataclass
class Placement:

    name: str = None
    display: str = None
    width: float = None
    height: float = None
    dpi: int = None
    is_ignored: bool = None

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict):
        return cls(**data)

    @property
    def dims(self):
        return (self.width, self.height)

    @property
    def desc(self):
        return f"{self.name} - {self.display}"

    @property
    def id(self):
        w = f"{int(self.width * 100):04d}"
        h = f"{int(self.height * 100):04d}"
        d = f"{int(self.dpi):04d}"
        return f"{w}-{h}-{d}"

@dataclass
class Variant:

    id: int = None
    size: str = None
    color: str = None
    price: str = None
    is_ignored: bool = None

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict):
        return cls(**data)

    @property
    def desc(self):
        return f"{self.id} - {self.size} - {self.color}"

@dataclass
class Mockup:

    id: int = None
    category: str = None
    title: str = None
    variant_ids: list[int] = field(default_factory=list)
    is_ignored: bool = None

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict):
        return cls(**data)

    @property
    def alt(self):
        return f"{self.category} - {self.title} - {self.id}"

@dataclass
class Product:

    id: int = None
    category: str = None
    title: str = None
    technique: str = None
    primaries: list[str] = field(default_factory=list)
    stitch_colors: list[str] = field(default_factory=list)
    placements: list[Placement] = field(default_factory=list)
    variants: list[Variant] = field(default_factory=list)
    mockups: list[Mockup] = field(default_factory=list)

    def to_dict(self):
        data = asdict(self)
        return data

    @classmethod
    def from_dict(cls, data: dict):
        data = data.copy()
        data["placements"] = [Placement.from_dict(p) for p in data["placements"]]
        data["variants"] = [Variant.from_dict(v) for v in data["variants"]]
        data["mockups"] = [Mockup.from_dict(m) for m in data["mockups"]]
        return cls(**data)

    @property
    def desc(self):
        return f"{self.id} - {self.title}"
