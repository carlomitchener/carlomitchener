import datetime
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITEMAP_BASE = "https://mrly.net"

SITEMAP_ROUTES = [
    ("/", "daily", True),
    # SHOP
    ("/shop", "daily", True),
    ("/shop/accessories", "daily", True),
    ("/shop/bags", "daily", True),
    ("/shop/kids", "daily", True),
    ("/shop/men", "daily", True),
    ("/shop/unisex", "daily", True),
    ("/shop/women", "daily", True),
    ("/shop/youth", "daily", True),
    # GAMES
    ("/captcha", "monthly", False),
    ("/memory", "monthly", False),
    ("/quiz", "monthly", False),
    ("/snake", "monthly", False),
    ("/tennis", "monthly", False),
    ("/2048", "monthly", False),
    ("/chess", "monthly", False),
    ("/crush", "monthly", False),
    ("/mines", "monthly", False),
    ("/ttt", "monthly", False),
    ("/escape", "monthly", False),
    # DESIGN
    ("/two", "monthly", False),
    ("/three", "monthly", False),
    ("/six", "monthly", False),
    # OTHER
    ("/piano", "monthly", False),
    ("/calculator", "monthly", False),
    ("/calendar", "monthly", False),
    ("/timer", "monthly", False),
    ("/clock", "monthly", False),
    ("/settings", "monthly", False),
    ("/theme", "monthly", False),
    ("/extras", "monthly", False),
    ("/colors", "monthly", False),
    ("/dice", "monthly", False),
    ("/font", "monthly", False),
    ("/text", "monthly", False),
    ("/life", "monthly", False),
    ("/berg", "monthly", False),
    ("/julia", "monthly", False),
    ("/mandelbrot", "monthly", False),
    ("/matrix", "monthly", False),
]

# GENERATE

def generate():
    today = datetime.date.today().isoformat()
    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for path, changefreq, lastmod in SITEMAP_ROUTES:
        url = f"  <url><loc>{SITEMAP_BASE}{path}</loc>"
        if path == "/":
            url += "<priority>1.0</priority>"
        url += f"<changefreq>{changefreq}</changefreq>"
        if lastmod:
            url += f"<lastmod>{today}</lastmod>"
        url += "</url>"
        lines.append(url)
    lines.append("</urlset>")
    sitemap_path = os.path.join(ROOT_DIR, "public", "sitemap.xml")
    with open(sitemap_path, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Generated sitemap.xml ({len(SITEMAP_ROUTES)} routes, lastmod={today})")

if __name__ == "__main__":
    pass
