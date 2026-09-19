import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DATA_DIR = os.path.join("data", os.path.relpath(HERE, ROOT))
PAGE = "file://" + os.path.join(HERE, "sky.html")
W, H = 720, 450
MOMENTS = [
    ("dawn spring", "time=dawn&season=spring&jump=8"),
    ("morning rain", "time=morning&weather=rain&jump=8"),
    ("noon", "time=noon&jump=8"),
    ("afternoon friends", "time=afternoon&friends=2&jump=18"),
    ("golden autumn", "time=afternoon&season=autumn&jump=8"),
    ("dusk", "time=dusk&jump=8"),
    ("storm", "time=afternoon&weather=storm&jump=8"),
    ("winter snow", "time=noon&season=winter&weather=snow&jump=8"),
    ("fog dawn", "time=dawn&weather=fog&jump=8"),
    ("night full moon", "time=night&moon=0.5&jump=8"),
    ("night crescent", "time=night&moon=0.2&jump=8"),
    ("dive", "time=noon&dive=0.9"),
]

def shot(item):
    label, hooks = item
    out = os.path.join(ROOT, DATA_DIR, "sheet-" + label.replace(" ", "-") + ".png")
    url = f"{PAGE}?{hooks}&pause=1&seed=7"
    r = subprocess.run(["bun", os.path.join(HERE, "snap.ts"), url, out, str(W), str(H)], capture_output=True, text=True)
    log = r.stdout.strip().split("\n", 1)
    return label, out, log[1].strip() if len(log) > 1 else ""

def main():
    cols = 3
    with ThreadPoolExecutor(3) as pool:
        shots = list(pool.map(shot, MOMENTS))
    rows = (len(shots) + cols - 1) // cols
    pad, cap = 8, 26
    sheet = Image.new("RGB", (cols * (W + pad) + pad, rows * (H + cap + pad) + pad), (18, 18, 20))
    draw = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
    except OSError: font = ImageFont.load_default()
    for i, (label, out, log) in enumerate(shots):
        x = pad + (i % cols) * (W + pad); y = pad + (i // cols) * (H + cap + pad)
        if os.path.exists(out): sheet.paste(Image.open(out).convert("RGB").resize((W, H)), (x, y + cap))
        draw.text((x + 4, y + 4), label + ("   ! " + log[:60] if log else ""), fill=(230, 230, 230), font=font)
        if log: print(label, "->", log)
    dest = os.path.join(ROOT, DATA_DIR, sys.argv[1] if len(sys.argv) > 1 else "sheet.png")
    sheet.save(dest)
    print("sheet:", dest)

if __name__ == "__main__":
    main()
