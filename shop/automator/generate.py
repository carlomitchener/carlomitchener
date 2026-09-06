import math
import mrlypy.gen
from automator.core.api import logger
from automator.core.errors import TaskAborted
from automator.core.models import Mockup, Task
from automator.core.s3 import art_key, put_png, s3_url, save_task
from automator.core.steps import Step
from io import BytesIO
from mrlypy.core.state import seed
from PIL import Image, ImageCms

FORMAT = "PNG"
UNIT_SCALE = 1
TILE_SCALE = 10
UNIT_IN = 0.25
DPI = 300
TILES = [1, 3, 5, 7, 9]
OG_TILE = 3
OG_SIZE = 1200
MAX_RENDERS = 3

PROFILE = ImageCms.createProfile("sRGB")
SRGB = ImageCms.ImageCmsProfile(PROFILE).tobytes()

Image.MAX_IMAGE_PIXELS = None

def crop(image: Image.Image, width: int, height: int) -> Image.Image:
    if image.width == width and image.height == height:
        return image
    w, h = image.size
    left = (w - width) // 2
    top = (h - height) // 2
    return image.crop(box=(left, top, left + width, top + height))

def guard_renders(task: Task) -> Task:
    count = task.metadata.get("render_count", 0) + 1
    task.metadata["render_count"] = count
    if count >= MAX_RENDERS:
        raise TaskAborted(f"render_count {count} for task {task.key}")
    save_task(task)
    return task

def prepare_printfiles(task: Task, gen: mrlypy.gen.Gen) -> mrlypy.gen.Gen:
    tile_width, tile_height = gen.tile.unit_width, gen.tile.unit_height
    for pf in task.printfiles:
        grid_width = math.ceil(pf.width / (tile_width * UNIT_IN))
        grid_height = math.ceil(pf.height / (tile_height * UNIT_IN))
        gen.files.append(mrlypy.gen.File(width=grid_width, height=grid_height))
    return gen

def prepare_tiles(task: Task, gen: mrlypy.gen.Gen) -> mrlypy.gen.Gen:
    for size in TILES:
        gen.files.append(mrlypy.gen.File(width=size, height=size))
    return gen

def save_png(key: str, image: Image.Image, dpi: int = None) -> str:
    with BytesIO() as data:
        options = {"format": FORMAT, "optimize": True, "icc_profile": SRGB}
        if dpi:
            options["dpi"] = (dpi, dpi)
        image.save(data, **options)
        data.seek(0)
        put_png(key, data)
    return s3_url(key)

def process_printfiles(task: Task, gen: mrlypy.gen.Gen, start: int) -> Task:
    for i, pf in enumerate(task.printfiles):
        pf.dpi = DPI
        image = gen.files[start + i].data
        full_width = round(image.width * UNIT_IN * pf.dpi)
        full_height = round(image.height * UNIT_IN * pf.dpi)
        image = image.resize(
            size=(full_width, full_height),
            resample=Image.Resampling.NEAREST,
        )
        image = crop(image, round(pf.width * pf.dpi), round(pf.height * pf.dpi))
        pf.url = save_png(art_key(task.key, pf.name), image, pf.dpi)
        logger.info(f"{task.desc} uploaded_printfile {pf.url}")
    return task

def process_og(task: Task, image: Image.Image) -> None:
    og = image.resize(size=(OG_SIZE, OG_SIZE), resample=Image.Resampling.NEAREST)
    url = save_png(art_key(task.key, f"{task.key}-og"), og)
    logger.info(f"{task.desc} uploaded_og {url}")

def process_tiles(task: Task, gen: mrlypy.gen.Gen, start: int) -> Task:
    for i, size in enumerate(TILES):
        raw = gen.files[start + i].data
        image = raw.resize(
            size=(raw.width * TILE_SCALE, raw.height * TILE_SCALE),
            resample=Image.Resampling.NEAREST,
        )
        name = f"{task.key}-{size}"
        url = save_png(art_key(task.key, name), image)
        logger.info(f"{task.desc} uploaded_tile {url}")
        task.mockups.append(
            Mockup(
                id=size,
                key=task.key,
                name=name,
                category="Tile",
                title=f"{size}x{size}",
                url=url,
            )
        )
        if size == OG_TILE:
            process_og(task, raw)
    return task

def mrly_generate(task: Task) -> Task:
    gen = mrlypy.gen.Gen.from_dict(task.variation)
    seed(gen.seed)
    gen = prepare_printfiles(task, gen)
    gen = prepare_tiles(task, gen)
    task = guard_renders(task)
    gen = mrlypy.gen.generate(gen)
    gen = mrlypy.gen.render(gen, scale=UNIT_SCALE)
    task = process_printfiles(task, gen, 0)
    task = process_tiles(task, gen, len(task.printfiles))
    task.variation = gen.to_dict()
    task.place(Step.MOCKUP)
    return task
