import os

# ORDER

def bounds(top):
    return [(D, 2 * D + 1, -(-D // 2)) for D in range(2, top + 1)]

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures", "order.svg")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    data = bounds(14)
    left = 56
    base = 250
    unit = 7.0
    slot = 44
    width = left + slot * len(data) + 20
    height = 300
    rows = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">']
    rows.append(f'<rect width="{width}" height="{height}" fill="white"/>')
    rows.append(f'<line x1="{left - 12}" y1="{base}" x2="{width - 10}" y2="{base}" stroke="#1a1a1a" stroke-width="1.2"/>')
    for D, free, sharp in data:
        x = left + slot * (D - 2)
        rows.append(f'<rect x="{x}" y="{base - free * unit:.1f}" width="16" height="{free * unit:.1f}" fill="#c8ccd4"/>')
        rows.append(f'<rect x="{x + 18}" y="{base - sharp * unit:.1f}" width="16" height="{sharp * unit:.1f}" fill="#1a3f8f"/>')
        rows.append(f'<text x="{x + 17}" y="{base + 16}" font-family="Helvetica,Arial,sans-serif" font-size="11" fill="#1a1a1a" text-anchor="middle">{D}</text>')
    rows.append(f'<text x="{left - 16}" y="{base + 16}" font-family="Helvetica,Arial,sans-serif" font-size="11" fill="#555" text-anchor="end">D</text>')
    rows.append(f'<rect x="{left}" y="24" width="12" height="12" fill="#c8ccd4"/>')
    rows.append(f'<text x="{left + 18}" y="34" font-family="Helvetica,Arial,sans-serif" font-size="12" fill="#1a1a1a">free bound 2D+1</text>')
    rows.append(f'<rect x="{left}" y="44" width="12" height="12" fill="#1a3f8f"/>')
    rows.append(f'<text x="{left + 18}" y="54" font-family="Helvetica,Arial,sans-serif" font-size="12" fill="#1a1a1a">this paper, ceil(D/2)</text>')
    rows.append(f'<text x="{left}" y="278" font-family="Helvetica,Arial,sans-serif" font-size="12" fill="#555">terms of memory the diagonal slice census needs</text>')
    rows.append("</svg>")
    with open(out, "w") as handle:
        handle.write("\n".join(rows) + "\n")
    print("drew figures/order.svg")

if __name__ == "__main__":
    main()
