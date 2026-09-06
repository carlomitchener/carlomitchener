import math
import mrlypy.gen
from mrlypy.core.state import seed
from utils.boto import put_png, s3_url
from core.config import MRLYCDN_BUCKET
from core.helpers import logger
from core.models import Mockup, Task
from core.steps import Step
from io import BytesIO
from PIL import Image, ImageCms

FORMAT = "PNG"
UNIT_SCALE = 1
TILE_SCALE = 10
UNIT_IN = 0.25
DPI = 300

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

def prepare_printfiles(task: Task, gen: mrlypy.gen.Gen) -> mrlypy.gen.Gen:
    tile_width, tile_height = gen.tile.unit_width, gen.tile.unit_height
    for pf in task.printfiles:
        grid_width = math.ceil(pf.width / (tile_width * UNIT_IN))
        grid_height = math.ceil(pf.height / (tile_height * UNIT_IN))
        file = mrlypy.gen.File(width=grid_width, height=grid_height)
        gen.files.append(file)
    return gen

def prepare_tiles(task: Task, gen: mrlypy.gen.Gen) -> mrlypy.gen.Gen:
    sizes = [1, 3, 5, 7, 9]
    for size in sizes:
        file = mrlypy.gen.File(width=size, height=size)
        gen.files.append(file)
    return gen

def process_printfiles(task: Task, gen: mrlypy.gen.Gen, start: int) -> Task:
    for i, pf in enumerate(task.printfiles):
        pf.dpi = DPI
        file_index = start + i
        image = gen.files[file_index].data
        full_width = int(image.width * UNIT_IN * pf.dpi)
        full_height = int(image.height * UNIT_IN * pf.dpi)
        image = image.resize(
            size=(full_width, full_height),
            resample=Image.Resampling.NEAREST
        )
        final_width = int(pf.width * pf.dpi)
        final_height = int(pf.height * pf.dpi)
        image = crop(image, final_width, final_height)
        with BytesIO() as data:
            image.save(
                data,
                format=FORMAT,
                optimize=True,
                dpi=(pf.dpi, pf.dpi),
                icc_profile=SRGB,
            )
            data.seek(0)
            key = f"mrlyshop/tasks/{task.key}/{pf.name}.png"
            put_png(key, data, MRLYCDN_BUCKET)
            pf.url = s3_url(key, MRLYCDN_BUCKET)
            logger.info(f"{task.desc} uploaded_printfile {pf.url}")
    return task

def process_tiles(task: Task, gen: mrlypy.gen.Gen, start: int) -> Task:
    sizes = [1, 3, 5, 7, 9]
    for i, size in enumerate(sizes):
        file_index = start + i
        with BytesIO() as data:
            image = gen.files[file_index].data
            final_width = image.width * TILE_SCALE
            final_height = image.height * TILE_SCALE
            image = image.resize(
                size=(final_width, final_height),
                resample=Image.Resampling.NEAREST
            )
            image.save(
                data,
                format=FORMAT,
                optimize=True,
                icc_profile=SRGB,
            )
            data.seek(0)
            key = f"mrlyshop/tasks/{task.key}/{task.key}-{size}.png"
            put_png(key, data, MRLYCDN_BUCKET)
            url = s3_url(key, MRLYCDN_BUCKET)
            logger.info(f"{task.desc} uploaded_tile {url}")
            task.mockups.append(
                Mockup(
                    id=size,
                    key=task.key,
                    name=f"{task.key}-{size}",
                    category="Tile",
                    title=f"{size}x{size}",
                    url=url
                )
            )
    return task

def mrly_generate(task: Task) -> Task:
    gen = mrlypy.gen.Gen.from_dict(task.variation)
    seed(gen.seed)
    gen = prepare_printfiles(task, gen)
    gen = prepare_tiles(task, gen)
    gen = mrlypy.gen.generate(gen)
    gen = mrlypy.gen.render(gen, scale=UNIT_SCALE)
    task = process_printfiles(task, gen, 0)
    task = process_tiles(task, gen, len(task.printfiles))
    task.variation = gen.to_dict()
    task.place(Step.MOCKUP)
    return task

def test_generate():
    from core.amazon import load_task, save_task
    task = load_task()
    task = mrly_generate(task)
    save_task(task)

if __name__ == "__main__":
    test_generate()
