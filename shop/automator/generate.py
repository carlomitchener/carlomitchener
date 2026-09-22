import math
from automator.core.api import logger
from automator.core.config import MAX_RENDERS, TILES
from automator.core.errors import TaskAborted
from automator.core.models import Task
from automator.core.s3 import cdn_key, load_batch, put_png, s3_url, save_batch, save_task
from automator.core.steps import Step
from automator.create import design_config
from io import BytesIO
from mrlypy.core import Rng
from mrlypy.gen import variation
from PIL import Image, ImageCms

FORMAT = "PNG"
UNIT_SCALE = 1
TILE_SCALE = 10
UNIT_IN = 0.25
TILE_NAME = "tile"

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
    if count > MAX_RENDERS:
        raise TaskAborted(f"render_count {count} for task {task.key}")
    save_task(task)
    return task

def prepare(task: Task, gen: variation.Variation, tiles: bool) -> variation.Variation:
    tile_width, tile_height = gen.tile.width, gen.tile.height
    files = []
    for pf in task.printfiles:
        grid_width = math.ceil(pf.width / (tile_width * UNIT_IN))
        grid_height = math.ceil(pf.height / (tile_height * UNIT_IN))
        files.append(variation.File.new(grid_width, grid_height).to_dict())
    if tiles:
        for size in TILES:
            files.append(variation.File.new(size, size).to_dict())
    return variation.Variation.from_dict({**gen.to_dict(), "files": files})

def save_png(key: str, image: Image.Image, dpi: int = None) -> str:
    with BytesIO() as data:
        options = {"format": FORMAT, "optimize": True, "icc_profile": SRGB}
        if dpi:
            options["dpi"] = (dpi, dpi)
        image.save(data, **options)
        data.seek(0)
        put_png(key, data)
    return s3_url(key)

def process_printfiles(task: Task, gen: variation.Variation) -> Task:
    for i, pf in enumerate(task.printfiles):
        image = Image.open(BytesIO(gen.files[i].png)).convert("RGBA")
        full_width = round(image.width * UNIT_IN * pf.dpi)
        full_height = round(image.height * UNIT_IN * pf.dpi)
        image = image.resize(size=(full_width, full_height), resample=Image.Resampling.NEAREST)
        image = crop(image, round(pf.width * pf.dpi), round(pf.height * pf.dpi))
        pf.url = save_png(cdn_key(task.key, pf.name), image, pf.dpi)
        logger.info(f"{task.desc} uploaded printfile {image.width}x{image.height} {pf.url}")
    return task

def process_tiles(task: Task, gen: variation.Variation, start: int) -> None:
    for i, size in enumerate(TILES):
        raw = Image.open(BytesIO(gen.files[start + i].png)).convert("RGBA")
        image = raw.resize(size=(raw.width * TILE_SCALE, raw.height * TILE_SCALE), resample=Image.Resampling.NEAREST)
        url = save_png(cdn_key(task.design, f"{task.primary}-{TILE_NAME}-{size}"), image)
        logger.info(f"design {task.design} uploaded {task.primary} tile {url}")

def mrly_generate(task: Task) -> Task:
    batch = load_batch()
    tiles = bool(batch) and batch.design == task.design and not batch.tiles.get(task.primary)
    gen = variation.Variation.from_dict({**task.variation, "primaries": [task.ink]})
    gen = prepare(task, gen, tiles)
    task = guard_renders(task)
    gen = variation.generate(gen, design_config(task.ink), Rng(gen.seed))
    gen = variation.render(gen, UNIT_SCALE, Rng(gen.seed))
    task = process_printfiles(task, gen)
    if tiles:
        process_tiles(task, gen, len(task.printfiles))
        batch.tiles[task.primary] = True
        save_batch(batch)
    task.variation = gen.to_dict()
    task.place(Step.MOCKUP)
    return task

if __name__ == "__main__":
    from automator.core.s3 import load_task
    task = load_task()
    save_task(mrly_generate(task))
    print(task.key, task.step)
