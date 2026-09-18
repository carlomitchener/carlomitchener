from dataclasses import asdict, dataclass, field, fields
from .config import PRIMARIES
from .steps import Step

def known(cls, data: dict) -> dict:
    names = {one.name for one in fields(cls)}
    return {key: value for key, value in data.items() if key in names}

OPEN = "open"
USED = "used"
DROPPED = "dropped"

@dataclass
class Batch:

    design: str = None
    seed: int = None
    created_at: int = None
    released_at: int = None
    variation: dict = field(default_factory=dict)
    tiles: dict = field(default_factory=dict)
    rows: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Batch":
        return cls(**known(cls, data))

    @property
    def paint(self) -> dict:
        return self.variation.get("paint") or {}

    @property
    def group(self) -> str:
        return (self.variation.get("tile") or {}).get("group")

    @property
    def complete(self) -> bool:
        return not self.cells(OPEN)

    def cells(self, state: str) -> list[tuple[str, str]]:
        return [(id, primary) for id, row in self.rows.items() for primary, one in row.items() if one == state]

    def row(self, id: int) -> dict:
        return self.rows.setdefault(str(id), {primary: OPEN for primary in PRIMARIES})

    def mark(self, id: int, primary: str, state: str) -> None:
        self.row(id)[primary] = state

    def drop(self, id: int) -> None:
        for primary in self.row(id):
            self.mark(id, primary, DROPPED)

@dataclass
class Product:

    id: int = None
    shopify_id: str = None
    printful_id: int = None
    synced: bool = None
    category: str = None
    title: str = None
    handle: str = None
    technique: str = None
    stitch_colors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Product":
        return cls(**known(cls, data))

@dataclass
class Printfile:

    id: str = None
    name: str = None
    url: str = None
    width: float = None
    height: float = None
    dpi: int = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Printfile":
        return cls(**known(cls, data))

@dataclass
class Placement:

    name: str = None
    width: float = None
    height: float = None
    dpi: int = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Placement":
        return cls(**known(cls, data))

    @property
    def id(self) -> str:
        width = f"{round(self.width * 100):04d}"
        height = f"{round(self.height * 100):04d}"
        dpi = f"{round(self.dpi):04d}"
        return f"{width}-{height}-{dpi}"

@dataclass
class Variant:

    id: int = None
    name: str = None
    shopify_id: str = None
    printful_id: int = None
    synced: bool = None
    cost: str = None
    size: str = None
    color: str = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Variant":
        return cls(**known(cls, data))

@dataclass
class Mockup:

    id: int = None
    name: str = None
    shopify_id: str = None
    category: str = None
    title: str = None
    variant_ids: list[int] = None
    job: str = None
    failures: int = 0
    url: str = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Mockup":
        return cls(**known(cls, data))

    @property
    def alt(self) -> str:
        return f"{self.id} - {self.category} - {self.title}"

    @property
    def extension(self) -> str:
        return self.url.split("?")[0].split(".")[-1]

@dataclass
class Task:

    key: str = None
    step: str = None
    design: str = None
    primary: str = None
    seed: int = None
    created_at: int = None
    updated_at: int = None
    product: Product = field(default_factory=Product)
    variation: dict = field(default_factory=dict)
    printfiles: list[Printfile] = field(default_factory=list)
    placements: list[Placement] = field(default_factory=list)
    variants: list[Variant] = field(default_factory=list)
    mockups: list[Mockup] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        data = {}
        data["key"] = self.key
        data["step"] = self.step
        data["design"] = self.design
        data["primary"] = self.primary
        data["seed"] = self.seed
        data["created_at"] = self.created_at
        data["updated_at"] = self.updated_at
        data["product"] = self.product.to_dict()
        data["variation"] = self.variation
        data["printfiles"] = [p.to_dict() for p in self.printfiles]
        data["placements"] = [p.to_dict() for p in self.placements]
        data["variants"] = [v.to_dict() for v in self.variants]
        data["mockups"] = [m.to_dict() for m in self.mockups]
        data["metadata"] = self.metadata
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "Task":
        data = dict(data)
        data["product"] = Product.from_dict(data["product"])
        data["printfiles"] = [Printfile.from_dict(p) for p in data["printfiles"]]
        data["placements"] = [Placement.from_dict(p) for p in data["placements"]]
        data["variants"] = [Variant.from_dict(v) for v in data["variants"]]
        data["mockups"] = [Mockup.from_dict(m) for m in data["mockups"]]
        return cls(**known(cls, data))

    @property
    def desc(self) -> str:
        if self.product.title:
            return f"{self.product.title} ({self.key})"
        return f"({self.key})"

    @property
    def paint(self) -> dict:
        return self.variation.get("paint") or {}

    @property
    def ink(self) -> str:
        return PRIMARIES.get(self.primary)

    def key_for(self, primary: str) -> str:
        return f"{primary}-{self.product.handle}-{self.design}"

    @property
    def sibling(self) -> str:
        other = next(one for one in PRIMARIES if one != self.primary)
        return self.key_for(other)

    @property
    def stitch_color(self) -> str:
        offered = [color.lower() for color in self.product.stitch_colors]
        primary = str(self.paint.get("primary") or "").lower()
        if primary in offered:
            return primary
        if "clear" in offered:
            return "clear"
        return offered[0] if offered else None

    def place(self, step: Step) -> None:
        self.step = step.value

    def wipe(self) -> None:
        self.metadata = {}
