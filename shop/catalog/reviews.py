import re
import time
from collections import Counter
from config import DELAY, REVIEWS
from fetch import load_raw_catalog
from helpers import load_catalog, save_json
from urllib.request import Request, urlopen

BASE = "https://www.printful.com/custom/products/all/"
AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
TECHNIQUES = ["cut-sew", "direct-to-fabric"]
RATING = re.compile(r'"aggregateRating":\{[^}]*"ratingValue":([0-9.]+),"reviewCount":(\d+)')
REVIEW = re.compile(r'"reviewRating":\{"@type":"Rating","ratingValue":(\d)')

def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def fetch_page(link: str) -> tuple[str, str]:
    request = Request(BASE + link, headers={"User-Agent": AGENT})
    with urlopen(request, timeout=30) as response:
        page = response.read().decode()
        final = response.geturl()
    time.sleep(DELAY)
    return page, final

def review(link: str) -> dict:
    page, final = fetch_page(link)
    if final.rstrip("/") == BASE.rstrip("/"):
        return {"status": "missing"}
    result = {"status": "ok"}
    if final != BASE + link:
        result["moved"] = final.replace(BASE, "")
    match = RATING.search(page)
    if not match:
        result["status"] = "unrated"
        return result
    result["rating"] = float(match.group(1))
    result["count"] = int(match.group(2))
    visible = [int(v) for v in REVIEW.findall(page)]
    if visible:
        result["sample"] = round(sum(visible) / len(visible), 2)
    return result

def review_products() -> dict:
    links = {row["id"]: row["link"] for row in load_catalog()}
    rows = load_raw_catalog()
    targets = {id: title for id, title in rows.items() if title.rsplit(" - ", 1)[1] in TECHNIQUES}
    print(f"Reviewing {len(targets)} products")
    results = {}
    for id, title in targets.items():
        name, technique = title.rsplit(" - ", 1)
        link = links.get(id, slug(name))
        result = {"title": name, "technique": technique, "catalog": id in links, "link": link}
        result.update(review(link))
        results[id] = result
        rating = result.get("rating", "-")
        count = result.get("count", "-")
        print(f"{id:>5} {technique:<17} {name:<48} {rating:>4} {count:>5} {result['status']} {result.get('moved', '')}")
    ordered = sorted(
        results.items(),
        key=lambda item: (item[1]["technique"], -item[1].get("rating", 0), -item[1].get("count", 0)),
    )
    save_json(REVIEWS, dict(ordered))
    print(f"Saved {len(results)} reviews to {REVIEWS}")
    return results

def summarize(results: dict) -> None:
    for technique in TECHNIQUES:
        rows = [r for r in results.values() if r["technique"] == technique]
        rated = [r for r in rows if "rating" in r]
        print(f"\n{technique}: {len(rows)} products, {len(rated)} rated")
        for status, n in Counter(r["status"] for r in rows).items():
            print(f"  {status}: {n}")
        print(f"  moved: {sum('moved' in r for r in rows)}")
        for rating, n in sorted(Counter(r["rating"] for r in rated).items(), reverse=True):
            print(f"  {rating}: {n}")
        if rated:
            print(f"  median reviews: {sorted(r['count'] for r in rated)[len(rated) // 2]}")

if __name__ == "__main__":
    results = review_products()
    summarize(results)
