import os

# PINCER

W = 900
H = 250
X0 = 60
X1 = 840
Y = 96

LOW = 0.4475978
HIGH = 0.640212

def px(t):
    return X0 + (X1 - X0) * t

def text(x, y, s, size=15, anchor="middle", fill="#1b1b1b", weight="normal"):
    return (
        '<text x="%.1f" y="%.1f" font-family="Helvetica,Arial,sans-serif" '
        'font-size="%d" text-anchor="%s" fill="%s" font-weight="%s">%s</text>'
        % (x, y, size, anchor, fill, weight, s)
    )

def build():
    p = []
    p.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">' % (W, H, W, H))
    p.append('<rect width="%d" height="%d" fill="#ffffff"/>' % (W, H))
    p.append('<rect x="%.1f" y="%.1f" width="%.1f" height="10" fill="#d5d5d5"/>' % (px(0), Y - 5, px(LOW) - px(0)))
    p.append('<rect x="%.1f" y="%.1f" width="%.1f" height="10" fill="#d5d5d5"/>' % (px(HIGH), Y - 5, px(1) - px(HIGH)))
    p.append('<rect x="%.1f" y="%.1f" width="%.1f" height="10" fill="#c0392b"/>' % (px(LOW), Y - 5, px(HIGH) - px(LOW)))
    p.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#1b1b1b" stroke-width="1.5"/>' % (px(0), Y, px(1) + 18, Y))
    for t, lab in ((0.0, "0"), (1.0, "1")):
        p.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#1b1b1b" stroke-width="1.5"/>' % (px(t), Y - 14, px(t), Y + 14))
        p.append(text(px(t), Y - 22, lab, 15))
    for t in (LOW, HIGH):
        p.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#1b1b1b" stroke-width="2"/>' % (px(t), Y - 20, px(t), Y + 20))
    p.append(text(px(0.22), Y - 22, "closed", 15, fill="#555555"))
    p.append(text(px(0.82), Y - 22, "closed", 15, fill="#555555"))
    p.append(text(px((LOW + HIGH) / 2), Y - 22, "open window", 15, fill="#c0392b", weight="bold"))
    p.append(text(px(LOW) - 6, Y + 42, "0.4475978", 15, anchor="end"))
    p.append(text(px(LOW) - 6, Y + 60, "moment ladder", 12, anchor="end", fill="#555555"))
    p.append(text(px(HIGH), Y + 42, "0.640212", 15))
    p.append(text(px(HIGH), Y + 60, "burst certificate", 12, fill="#555555"))
    for t, lab, dy, anchor in (
        (0.447931, "0.447931  ladder cap, only 0.00034 above the edge", 96, "start"),
        (0.5, "1/2  per-ray wall", 118, "start"),
        (0.605303, "0.605303  supergolden target", 140, "end"),
    ):
        p.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#9a9a9a" stroke-width="1" stroke-dasharray="4 4"/>' % (px(t), Y + 12, px(t), Y + dy - 12))
        off = 6 if anchor == "start" else -6
        p.append(text(px(t) + off, Y + dy, lab, 12, anchor=anchor, fill="#555555"))
    p.append(text(px(0.5), 30, "Lemma G, the gasket case: the prime exponent beta = log_3 p / n", 16, weight="bold"))
    p.append("</svg>")
    return "\n".join(p) + "\n"

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "figures")
    if not os.path.isdir(out):
        os.makedirs(out)
    with open(os.path.join(out, "pincer.svg"), "w") as f:
        f.write(build())
    print("wrote figures/pincer.svg")

if __name__ == "__main__":
    main()
