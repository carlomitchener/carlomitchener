from dataclasses import asdict, dataclass, field
from .steps import Step

TILE = "Tile"

@dataclass
class Product:

    id: int = None
    shopify_id: str = None
    printful_id: int = None
    synced: bool = None
    category: str = None
    title: str = None
    technique: str = None
    primaries: list[str] = field(default_factory=list)
    stitch_colors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Product":
        return cls(**data)

@dataclass
class Printfile:

    id: str = None
    key: str = None
    name: str = None
    url: str = None
    width: float = None
    height: float = None
    dpi: int = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Printfile":
        return cls(**data)

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
        return cls(**data)

    @property
    def id(self) -> str:
        width = f"{round(self.width * 100):04d}"
        height = f"{round(self.height * 100):04d}"
        dpi = f"{round(self.dpi):04d}"
        return f"{width}-{height}-{dpi}"

@dataclass
class Variant:

    id: int = None
    key: str = None
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
        return cls(**data)

@dataclass
class Mockup:

    id: int = None
    key: str = None
    name: str = None
    shopify_id: str = None
    category: str = None
    title: str = None
    variant_ids: list[int] = None
    url: str = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Mockup":
        return cls(**data)

    @property
    def alt(self) -> str:
        return f"{self.id} - {self.category} - {self.title}"

    @property
    def is_tile(self) -> bool:
        return self.category == TILE

    @property
    def extension(self) -> str:
        return self.url.split("?")[0].split(".")[-1]

@dataclass
class Task:

    key: str = None
    step: str = None
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
        data["product"] = Product.from_dict(data["product"])
        data["printfiles"] = [Printfile.from_dict(p) for p in data["printfiles"]]
        data["placements"] = [Placement.from_dict(p) for p in data["placements"]]
        data["variants"] = [Variant.from_dict(v) for v in data["variants"]]
        data["mockups"] = [Mockup.from_dict(m) for m in data["mockups"]]
        return cls(**data)

    @property
    def desc(self) -> str:
        if self.product.title:
            return f"{self.product.title} ({self.key})"
        return f"({self.key})"

    @property
    def stitch_color(self) -> str:
        return self.variation["paint"]["primary"].lower()

    def place(self, step: Step) -> None:
        self.step = step.value

    def wipe(self) -> None:
        self.metadata = {}
