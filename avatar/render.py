import argparse, json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
from mrlypy.core.colors import NAMES, PALETTE

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join("data", os.path.relpath(HERE))
BIRD = json.load(open(os.path.join(HERE, "bird.json")))
LAYERS = ["background", "glow", "fringe", "bird"]
RGB = {name: color[:3] for name, color in zip(NAMES, PALETTE)}

def rgb(name):
    return np.array(RGB[name], float) / 255

def hexa(name):
    return "#%02x%02x%02x" % RGB[name]

def direction(deg):
    a = np.radians(deg)
    return np.array([np.cos(a), -np.sin(a)])

# GEOMETRY

def flatten(cubics, n=12):
    t = np.linspace(0, 1, n)[:-1, None]
    return np.concatenate([(1 - t) ** 3 * np.array(p0) + 3 * (1 - t) ** 2 * t * np.array(p1) + 3 * (1 - t) * t ** 2 * np.array(p2) + t ** 3 * np.array(p3) for p0, p1, p2, p3 in cubics])

def width():
    return max(p[0] for seg in BIRD["outline"]["cubics"] for p in seg)

def place(points, dx=0.0, dy=0.0):
    return (np.asarray(points) - [width() / 2, 0.5]) * BIRD["bird"]["height"] + np.array(BIRD["bird"]["center"]) + [dx, dy]

def fringe_offsets():
    f = BIRD["fringe"]
    return [-(k + 1) * f["step"] * direction(f["angle"]) for k in range(len(f["colors"]))]

def viewbox(o):
    if not o.crop:
        return 0.0, 0.0, float(BIRD["canvas"]), float(BIRD["canvas"])
    h = BIRD["bird"]["height"]
    pts = np.concatenate([place(flatten(BIRD["outline"]["cubics"], 4), *d) for d in [np.zeros(2)] + fringe_offsets()])
    m = 0.05 * h
    x0, y0 = pts.min(axis=0) - m
    x1, y1 = pts.max(axis=0) + m
    return x0, y0, x1 - x0, y1 - y0

def conic_color(angle):
    g = BIRD["gradient"]
    n = len(g["colors"])
    pos = ((angle - g["start"]) % 360) / (360 / n)
    i = int(np.floor(pos)) % n
    t = pos - np.floor(pos)
    return rgb(g["colors"][i]) * (1 - t) + rgb(g["colors"][(i + 1) % n]) * t

# RASTER

class Raster:
    def __init__(self, o):
        self.vx, self.vy, self.vw, self.vh = viewbox(o)
        self.s = o.size / max(self.vw, self.vh)
        self.W, self.H = int(round(self.vw * self.s)), int(round(self.vh * self.s))

    def px(self, pts):
        return (np.asarray(pts) - [self.vx, self.vy]) * self.s

    def polygon(self, pts, ss=4):
        img = Image.new("L", (self.W * ss, self.H * ss), 0)
        ImageDraw.Draw(img).polygon([tuple(p) for p in self.px(pts) * ss], fill=255)
        return np.asarray(img.resize((self.W, self.H), Image.BOX), float) / 255

    def disc(self, center, radius):
        cx, cy = self.px([center])[0]
        yy, xx = np.mgrid[0:self.H, 0:self.W] + 0.5
        return np.clip(0.5 - (np.hypot(xx - cx, yy - cy) - radius * self.s), 0, 1)

    def conic(self):
        g = BIRD["gradient"]
        cx, cy = self.px([g["center"]])[0]
        yy, xx = np.mgrid[0:self.H, 0:self.W] + 0.5
        n = len(g["colors"])
        pos = ((np.degrees(np.arctan2(-(yy - cy), xx - cx)) - g["start"]) % 360) / (360 / n)
        i = np.floor(pos).astype(int) % n
        t = (pos - np.floor(pos))[..., None]
        table = np.array([rgb(c) for c in g["colors"]])
        return table[i] * (1 - t) + table[(i + 1) % n] * t

    def blur(self, color, alpha, sigma):
        sigma *= self.s
        k = min(1.0, 24 / sigma)
        nw, nh = max(32, int(round(self.W * k))), max(32, int(round(self.H * k)))
        out = []
        for chan in [color[..., c] * alpha for c in range(3)] + [alpha]:
            small = np.asarray(Image.fromarray(chan.astype(np.float32), "F").resize((nw, nh), Image.BOX), float)
            small = gaussian_filter(small, sigma * nw / self.W, mode="constant")
            out.append(np.asarray(Image.fromarray(small.astype(np.float32), "F").resize((self.W, self.H), Image.BICUBIC), float) if nw < self.W else small)
        return np.clip(np.dstack(out[:3]), 0, 1), np.clip(out[3], 0, 1)

def over(dst, premul, alpha):
    return dst * (1 - alpha[..., None]) + np.dstack([premul, alpha])

def render(o):
    r = Raster(o)
    theme = BIRD["themes"][o.theme]
    canvas = np.zeros((r.H, r.W, 4))
    if "background" in o.layers:
        bg = rgb(o.background or theme["background"])
        canvas = over(canvas, np.ones((r.H, r.W, 3)) * bg, np.ones((r.H, r.W)))
    poly = flatten(BIRD["outline"]["cubics"])
    bird = r.polygon(place(poly))
    if "glow" in o.layers:
        grad = r.conic()
        for i, g in enumerate(BIRD["glow"]):
            if not o.glow[i]:
                continue
            shape = bird if g["shape"] == "bird" else r.disc(g.get("center", BIRD["gradient"]["center"]), g["radius"])
            canvas = over(canvas, *r.blur(grad, shape, g["sigma"]))
    if "fringe" in o.layers:
        for name, d in reversed(list(zip(BIRD["fringe"]["colors"], fringe_offsets()))):
            a = r.polygon(place(poly, *d))
            canvas = over(canvas, rgb(name) * a[..., None], a)
    if "bird" in o.layers:
        canvas = over(canvas, rgb(o.bird or theme["bird"]) * bird[..., None], bird)
    a = canvas[..., 3:4]
    straight = np.where(a > 0, canvas[..., :3] / np.maximum(a, 1e-6), 0)
    return Image.fromarray((np.clip(np.dstack([straight, a[..., 0]]), 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")

# SVG

def svg(o):
    vx, vy, vw, vh = viewbox(o)
    theme = BIRD["themes"][o.theme]
    f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
    P = lambda p: f"{f(p[0])},{f(p[1])}"
    seg = BIRD["outline"]["cubics"]
    d = "M" + P(place([seg[0][0]])[0]) + "".join("C" + " ".join(P(q) for q in place([p1, p2, p3])) for _, p1, p2, p3 in seg) + "Z"
    gx, gy = BIRD["gradient"]["center"]
    R = np.hypot(vw, vh) + np.hypot(gx - vx, gy - vy)
    w = 360 / o.wedges
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(vx)} {f(vy)} {f(vw)} {f(vh)}">', "<defs>", f'<path id="a-bird" d="{d}"/>', '<g id="a-conic">']
    for i in range(o.wedges):
        p0, p1 = direction(i * w) * R + [gx, gy], direction((i + 1.5) * w) * R + [gx, gy]
        c = conic_color((i + 0.5) * w)
        out.append(f'<path d="M{f(gx)},{f(gy)}L{P(p0)}L{P(p1)}Z" fill="#{"".join("%02x" % int(round(v * 255)) for v in c)}"/>')
    out.append("</g>")
    for i, g in enumerate(BIRD["glow"]):
        shape = f'<circle cx="{f(g.get("center", [gx, gy])[0])}" cy="{f(g.get("center", [gx, gy])[1])}" r="{g["radius"]}"/>' if g["shape"] == "disc" else '<use href="#a-bird"/>'
        out.append(f'<clipPath id="a-clip-{i}">{shape}</clipPath>')
        out.append(f'<filter id="a-blur-{i}" filterUnits="userSpaceOnUse" x="{f(vx)}" y="{f(vy)}" width="{f(vw)}" height="{f(vh)}" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="{g["sigma"]}"/></filter>')
    out.append("</defs>")
    if "background" in o.layers:
        out.append(f'<rect id="a-background" x="{f(vx)}" y="{f(vy)}" width="{f(vw)}" height="{f(vh)}" fill="{hexa(o.background or theme["background"])}"/>')
    if "glow" in o.layers:
        out.append('<g id="a-glow">' + "".join(f'<g filter="url(#a-blur-{i})"><g clip-path="url(#a-clip-{i})"><use href="#a-conic"/></g></g>' for i in range(len(BIRD["glow"])) if o.glow[i]) + "</g>")
    if "fringe" in o.layers:
        out.append('<g id="a-fringe">' + "".join(f'<use href="#a-bird" fill="{hexa(name)}" transform="translate({f(d[0])} {f(d[1])})"/>' for name, d in reversed(list(zip(BIRD["fringe"]["colors"], fringe_offsets())))) + "</g>")
    if "bird" in o.layers:
        out.append(f'<use id="a-top" href="#a-bird" fill="{hexa(o.bird or theme["bird"])}"/>')
    out.append("</svg>")
    return "\n".join(out) + "\n"

# CLI

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=1000)
    ap.add_argument("--theme", default="dark", choices=list(BIRD["themes"]))
    ap.add_argument("--bird", default=None, choices=NAMES)
    ap.add_argument("--background", default=None, choices=NAMES)
    ap.add_argument("--layers", default=",".join(LAYERS))
    ap.add_argument("--glow", default=",".join("1" for _ in BIRD["glow"]))
    ap.add_argument("--crop", action="store_true")
    ap.add_argument("--wedges", type=int, default=360)
    ap.add_argument("--svg", action="store_true")
    ap.add_argument("--name", default=None)
    o = ap.parse_args()
    o.layers = set(o.layers.split(","))
    o.glow = [v == "1" for v in o.glow.split(",")]
    name = o.name or f"bird-{o.theme}-{o.size}"
    os.makedirs(DATA_DIR, exist_ok=True)
    render(o).save(os.path.join(DATA_DIR, name + ".png"))
    print("wrote", os.path.join(DATA_DIR, name + ".png"))
    if o.svg:
        open(os.path.join(DATA_DIR, name + ".svg"), "w").write(svg(o))
        print("wrote", os.path.join(DATA_DIR, name + ".svg"))

if __name__ == "__main__":
    main()
