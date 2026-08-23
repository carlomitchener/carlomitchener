import itertools
from math import gcd, log, sqrt

# PINCER

F = ((0, 0), (1, 0), (0, 1))
FS = set(F)
PHI = (1 + sqrt(5)) / 2

def near(got, want, tol, what):
    assert abs(got - want) <= tol, "%s: got %.12f want %.12f" % (what, got, want)

def same(got, want, what):
    assert got == want, "%s: got %r want %r" % (what, got, want)

def klass(a, b):
    if a % 3 and b % 3:
        if (a - b) % 3 == 0:
            return "eq", 0
        k = 0
        s = a + b
        while s % 3 == 0:
            s //= 3
            k += 1
        return "opp", k
    x = a if a % 3 == 0 else b
    k = 0
    while x % 3 == 0:
        x //= 3
        k += 1
    return "div", k

def oriented(a, b):
    if a % 3 == 0:
        return a, b
    if b % 3 == 0:
        return b, a
    return a, b

def edges(a, b):
    out = [[] for _ in range(a * b)]
    for c1 in range(a):
        for c2 in range(b):
            s = c1 * b + c2
            for d in range(3):
                x = a * d + c1
                y = b * d + c2
                if (x % 3, y % 3) in FS:
                    out[s].append((d, (x // 3) * b + (y // 3)))
    return out

def rowsums(out, w):
    v = [1] * len(out)
    for _ in range(w):
        v = [sum(v[t] for _, t in row) for row in out]
    return v

def fib(n):
    x, y = 0, 1
    for _ in range(n):
        x, y = y, x + y
    return x

def dfree(k, w):
    p = 1
    for r in range(k):
        m = len([i for i in range(1, w + 1) if i % k == r])
        p *= fib(m + 2)
    return p

def dfree_brute(k, w):
    c = 0
    for mask in range(1 << w):
        ok = True
        for i in range(w - k):
            if (mask >> i) & 1 and (mask >> (i + k)) & 1:
                ok = False
                break
        if ok:
            c += 1
    return c

def rays(h):
    return [(a, b) for a in range(1, h + 1) for b in range(a, h + 1) if gcd(a, b) == 1]

def typ(cls, a, b, s):
    c1, c2 = divmod(s, b)
    return c1 % 3 if cls == "div" else (c1 + c2) % 3

def constants():
    L = log(PHI, 3)
    near(1 / (2 - L), 0.6402121938, 5e-10, "top edge")
    near((1 - L) / (2 - L), 0.3597878, 5e-7, "c star")
    x = 1.5
    for _ in range(80):
        x -= (x ** 3 - x * x - 1) / (3 * x * x - 2 * x)
    near(x, 1.4655712319, 5e-10, "supergolden root")
    near(1 / (2 - log(x, 3)), 0.6053028664, 5e-10, "supergolden edge")
    near(2 / (3 + log(5, 3)), 0.447930988, 5e-9, "ladder cap")
    kap = 3 - log(5, 3)
    l8 = 456 + 3 * sqrt(11017)
    k8 = 8 - log(l8, 3)
    near(k8 / (2 * k8 + 2 - kap), 0.446717310462, 5e-12, "rung 8")
    l10 = 6664.113662506
    k10 = 10 - log(l10, 3)
    near(k10 / (2 * k10 + 2 - kap), 0.447597813454, 5e-12, "rung 10")
    near(1 / (2 - log(1.0639086, 3)), 0.5145062, 5e-8, "quarantined 0.5145062")
    near(1 / (2 - log(1.0997454, 3)), 0.5226147, 5e-8, "quarantined 0.5226147")
    print("constants: edge 0.6402121938, rungs 0.446717310462 / 0.447597813454, cap 0.447930988")

def subsets():
    for k in range(1, 6):
        for w in range(1, 15):
            same(dfree(k, w), dfree_brute(k, w), "D_%d(%d)" % (k, w))
    for k in range(1, 7):
        for w in range(1, 61):
            assert dfree(k, w) <= PHI ** (w + k), "D_%d(%d) exceeds phi^(w+k)" % (k, w)
    print("subsets: D_k(w) exact for w <= 14, k <= 5; D_k(w) <= phi^(w+k) for k <= 6, w <= 60")

def branching(h):
    n2 = 0
    for (a, b) in rays(h):
        cls, k = klass(a, b)
        a, b = oriented(a, b)
        out = edges(a, b)
        for s, row in enumerate(out):
            if cls == "eq":
                assert len(row) <= 1, "eq ray (%d,%d) state %d: got %d digits want <= 1" % (a, b, s, len(row))
                continue
            t = typ(cls, a, b, s)
            want = {0: 2, 1: 1, 2: 0}[t] if cls == "div" else {0: 1, 1: 2, 2: 0}[t]
            same(len(row), want, "ray (%d,%d) state %d type %d" % (a, b, s, t))
            if want == 2:
                n2 += 1
                same(len({d % 3 for d, _ in row}), 2, "ray (%d,%d) state %d digits" % (a, b, s))
    print("branching: exact 2/1/0 counts at every state of every ray of height <= %d (%d branching states)" % (h, n2))

def delay(h):
    tested = 0
    for (a, b) in rays(h):
        cls, k = klass(a, b)
        if cls == "eq":
            continue
        a, b = oriented(a, b)
        out = edges(a, b)
        for s in range(len(out)):
            paths = [(s, [])]
            for _ in range(k):
                nxt = []
                for st, seq in paths:
                    for d, t in out[st]:
                        nxt.append((t, seq + [(d, typ(cls, a, b, t))]))
                paths = nxt
            if not paths:
                continue
            for j in range(k - 1):
                vals = {seq[j][1] for _, seq in paths}
                same(len(vals), 1, "ray (%d,%d) state %d step %d predetermination" % (a, b, s, j + 1))
            heads = {}
            for _, seq in paths:
                heads.setdefault(seq[0][0], set()).add(seq[k - 1][1])
            if len(heads) == 2:
                (d1, t1), (d2, t2) = list(heads.items())
                same(len(t1) * len(t2), 1, "ray (%d,%d) state %d split determinism" % (a, b, s))
                assert t1 != t2, "ray (%d,%d) state %d: got equal types %r want distinct" % (a, b, s, t1)
                tested += 1
    print("delay: predetermination and the k-step split at every state of every div/opp ray of height <= %d (%d splits)" % (h, tested))

def burst(h, wmax):
    for (a, b) in rays(h):
        cls, k = klass(a, b)
        a, b = oriented(a, b)
        out = edges(a, b)
        v = [1] * len(out)
        for w in range(1, wmax + 1):
            v = [sum(v[t] for _, t in row) for row in out]
            cap = 1 if cls == "eq" else dfree(k, w)
            got = max(v)
            assert got <= cap, "ray (%d,%d) w=%d: got P_w %d want <= %d" % (a, b, w, got, cap)
    print("burst: P_w(s) <= D_k(w) at every start state, every ray of height <= %d, every w <= %d" % (h, wmax))

def saturation():
    same(rowsums(edges(9, 1), 36)[0], 45765225, "P_36 at (9,1)")
    same(dfree(2, 36), 45765225, "D_2(36)")
    same(rowsums(edges(27, 1), 36)[0], 53582633, "P_36 at (27,1)")
    same(dfree(3, 36), 53582633, "D_3(36)")
    print("saturation: P_36 = D_2(36) = 45765225 at (9,1) and P_36 = D_3(36) = 53582633 at (27,1)")

def catalogue():
    cat = rays(40)
    same(len(cat), 490, "primitive rays of height <= 40")
    shifts = [(1, 3), (1, 9), (1, 27)]
    body = [r for r in cat if r != (1, 1)]
    same(len(body), 489, "catalogue after removing (1,1)")
    nonshift = [r for r in body if r not in shifts]
    same(len(nonshift), 486, "non-shift rays")
    best = []
    wsum = 0.0
    wnum = 0.0
    for (a, b) in body:
        w = 1.0 / (a * a + b * b)
        if (a, b) in shifts:
            r = PHI
        else:
            r = max(rowsums(edges(*oriented(a, b)), 55)) ** (1.0 / 55)
            assert r < PHI, "ray (%d,%d): got certificate %.10f want < phi" % (a, b, r)
            best.append((r, (a, b)))
        wsum += w
        wnum += w * r
    best.sort(reverse=True)
    top = [(p, round(r, 10)) for r, p in best[:3]]
    same(top, [((4, 9), 1.481203426), ((3, 10), 1.4765525267), ((1, 12), 1.4728541511)], "top three certificates")
    near(wnum / wsum, 1.0997454, 5e-8, "inverse-square-weighted upper mean")
    print("catalogue: 490 rays of height <= 40, 489 = 486 + 3 after removing (1,1), top certificate 1.4812034260 at (4,9), weighted upper mean 1.0997454")

def census(jmax):
    for j in range(1, jmax + 1):
        lo, hi = 3 ** j, 3 ** (j + 1)
        counts = {}
        for (a, b) in rays(hi - 1):
            if max(a, b) < lo:
                continue
            cls, k = klass(a, b)
            counts[(cls, k)] = counts.get((cls, k), 0) + 1
        for (cls, k), c in counts.items():
            if cls == "eq":
                cap = 9 * 3 ** (2 * j)
            elif cls == "div":
                cap = 9 * 3 ** (2 * j - k)
                assert k <= j, "octave %d div: got k %d want <= %d" % (j, k, j)
            else:
                cap = 18 * 3 ** (2 * j - k)
                assert k <= j + 1, "octave %d opp: got k %d want <= %d" % (j, k, j + 1)
            assert c <= cap, "octave %d %s k=%d: got %d want <= %d" % (j, cls, k, c, cap)
        d1 = counts.get(("div", 1), 0)
        want = 3 ** (2 * j - 1)
        assert d1 >= want, "octave %d depth-one census: got %d want >= %d" % (j, d1, want)
    print("census: div, opp and eq upper bounds and the depth-one count against 3^(2j-1) for every octave 1 <= j <= %d" % jmax)

def main():
    constants()
    subsets()
    branching(24)
    delay(24)
    burst(24, 20)
    saturation()
    catalogue()
    census(4)
    print("all green")

if __name__ == "__main__":
    main()
