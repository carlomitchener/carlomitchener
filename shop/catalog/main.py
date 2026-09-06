import argparse
import sys
from catalog import fetch
from catalog import s3
from catalog.correct import correct_products
from catalog.helpers import all_ids, live_ids, load_catalog, load_corrections
from catalog.helpers import load_product, sort_catalog
from catalog.parse import parse_products
from catalog.sort import sort_products

AOP = "All-Over Print"
CUT_SEW = "CUT-SEW"

def normalize(name: str) -> str:
    return name.replace("’", "'")

def is_aop(item: dict) -> bool:
    return item["type"] == CUT_SEW and AOP in normalize(item["name"])

# GATES

def gate_rows(rows: list[dict], catalog: list[dict]) -> list[str]:
    live = {item["id"]: item for item in rows}
    corrections = load_corrections()["variants"]
    failures = []
    for row in catalog:
        id = row["id"]
        item = live.get(id)
        if item is None:
            failures.append(f"{id} {row['title']}: absent from the live catalog")
            continue
        if item["is_discontinued"]:
            failures.append(f"{id} {row['title']}: is_discontinued")
        techniques = [t["key"] for t in item["techniques"]]
        if techniques != ["cut-sew"]:
            failures.append(f"{id} {row['title']}: techniques {techniques}")
        if len(item["colors"]) != 1 and str(id) not in corrections:
            names = [c["name"] for c in item["colors"]]
            print(f"Colours: {id} {row['title']} - {names}")
    return failures

def gate_products(ids: list[int]) -> list[str]:
    failures = []
    for id in ids:
        product = load_product(id)
        colors = {v.color for v in product.variants if not v.is_ignored}
        if len(colors) != 1:
            failures.append(f"{id} {product.title}: {len(colors)} live colours {sorted(colors)}")
        if not [p for p in product.placements if not p.is_ignored]:
            failures.append(f"{id} {product.title}: no live placement")
        if not [m for m in product.mockups if not m.is_ignored]:
            failures.append(f"{id} {product.title}: no live mockup")
    return failures

def fail(failures: list[str]) -> None:
    if not failures:
        return
    print(f"Failed {len(failures)} checks")
    for line in failures:
        print(f"- {line}")
    sys.exit(1)

# VERBS

def build(args) -> None:
    catalog = load_catalog()
    ids = all_ids() if args.all else live_ids()
    if args.id:
        ids = args.id
    print(f"Building {len(ids)} of {len(catalog)} catalog rows")
    rows = fetch.load_raw_catalog(args.refetch)
    fail(gate_rows(rows, catalog))
    print(f"Gate: {len(catalog)} rows are live, cut-sew and current")
    sort_catalog()
    fetch.fetch_products(ids, args.refetch)
    parse_products(ids)
    sort_products(ids)
    correct_products(ids)
    fail(gate_products(ids))
    print(f"Gate: {len(ids)} products carry one colour, a placement and a mockup")
    if args.local:
        print("Local only, nothing uploaded")
        return
    s3.upload_products(ids)

def new(args) -> None:
    rows = fetch.load_raw_catalog(args.refetch)
    known = set(all_ids())
    for item in sorted(rows, key=lambda i: i["id"]):
        if is_aop(item) and item["id"] not in known:
            print(f"{item['id']} - {normalize(item['name'])}")

def gate(args) -> None:
    rows = fetch.load_raw_catalog(args.refetch)
    catalog = load_catalog()
    fail(gate_rows(rows, catalog))
    print(f"Gate: {len(catalog)} rows are live, cut-sew and current")

def show(args) -> None:
    for row in load_catalog():
        mark = "LIVE" if row.get("live") else "    "
        print(f"{mark} {row['id']:>5} {row['category']:<12} {row['title']}")

def clean(args) -> None:
    s3.delete_products()

# CLI

def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="catalog.main")
    subs = p.add_subparsers(dest="verb", required=True)

    b = subs.add_parser("build")
    b.add_argument("--all", action="store_true")
    b.add_argument("--id", type=int, nargs="+")
    b.add_argument("--refetch", action="store_true")
    b.add_argument("--local", action="store_true")
    b.add_argument("--yes", action="store_true")
    b.set_defaults(run=build, gated=True)

    n = subs.add_parser("new")
    n.add_argument("--refetch", action="store_true")
    n.set_defaults(run=new, gated=False)

    g = subs.add_parser("gate")
    g.add_argument("--refetch", action="store_true")
    g.set_defaults(run=gate, gated=False)

    s = subs.add_parser("show")
    s.set_defaults(run=show, gated=False)

    c = subs.add_parser("clean")
    c.add_argument("--yes", action="store_true")
    c.set_defaults(run=clean, gated=True)

    return p

def main() -> None:
    args = parser().parse_args()
    if args.gated and not args.yes:
        print(f"PLAN {args.verb}. Add --yes to run it")
        sys.exit(1)
    args.run(args)

if __name__ == "__main__":
    main()
