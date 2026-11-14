use crate::{Pencil, Track, trace};
use mrly_error::{Result, value_error};
use mrly_num::factor::gcd;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const GRID: (usize, usize) = (8, 1024);
const JOIN: f64 = 1e-5;

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Nodes {
    pub curves: usize,
    pub selves: Vec<usize>,
    pub pairs: Vec<usize>,
    pub most: usize,
    pub crowded: usize,
    pub points: usize,
    pub branches: usize,
    pub touches: usize,
}

impl Nodes {
    pub fn pair(&self, i: usize, j: usize) -> usize {
        if i == j || i >= self.curves || j >= self.curves {
            return 0;
        }
        let (i, j) = (i.min(j), i.max(j));
        self.pairs[i * self.curves - i * (i + 1) / 2 + j - i - 1]
    }

    pub fn selved(&self) -> usize {
        self.selves.iter().sum()
    }

    pub fn paired(&self) -> usize {
        self.pairs.iter().sum()
    }

    pub fn total(&self) -> usize {
        self.selved() + self.paired()
    }
}

pub fn nodes(track: &Track, pencils: &[Pencil], samples: usize, tol: f64) -> Result<Nodes> {
    if pencils.is_empty() {
        return value_error("a roulette needs a pencil.");
    }
    if samples < 3 {
        return value_error("a node count needs at least three samples.");
    }
    if !(0.0..1.0).contains(&tol) {
        return value_error("the tolerance is a fraction of the picture's longer side.");
    }
    let trail = trace(track, pencils, samples)?;
    let (curves, steps) = (pencils.len(), samples - 1);
    let at = |k: usize, i: usize| {
        let base = (k * samples + i) * 2;
        [f64::from(trail[base]), f64::from(trail[base + 1])]
    };
    let (low, high) = box_of(&trail);
    let span = (high[0] - low[0]).max(high[1] - low[1]);
    if span <= 0.0 {
        return value_error("the trace has no extent.");
    }
    let size = [
        (high[0] - low[0]).max(span * 1e-9),
        (high[1] - low[1]).max(span * 1e-9),
    ];
    let g = ((curves * steps) as f64).sqrt() as usize;
    let g = g.clamp(GRID.0, GRID.1);
    let cell = |p: [f64; 2]| {
        let place = |v: f64, k: usize| (((v - low[k]) / size[k] * g as f64) as usize).min(g - 1);
        (place(p[0], 0), place(p[1], 1))
    };
    let joined: Vec<bool> = (0..curves)
        .map(|k| {
            let (first, last) = (at(k, 0), at(k, steps));
            (first[0] - last[0]).hypot(first[1] - last[1]) < span * JOIN
        })
        .collect();
    let mut buckets: Vec<Vec<u32>> = vec![Vec::new(); g * g];
    for k in 0..curves {
        for i in 0..steps {
            let (lo, hi) = ends(at(k, i), at(k, i + 1));
            let ((x0, y0), (x1, y1)) = (cell(lo), cell(hi));
            for x in x0..=x1 {
                for y in y0..=y1 {
                    buckets[x * g + y].push((k * steps + i) as u32);
                }
            }
        }
    }
    let mut out = Nodes {
        curves,
        selves: vec![0; curves],
        pairs: vec![0; curves * (curves - 1) / 2],
        ..Nodes::default()
    };
    let mut found: Vec<[f64; 2]> = Vec::new();
    for x in 0..g {
        for y in 0..g {
            let list = &buckets[x * g + y];
            for (u, &left) in list.iter().enumerate() {
                for &right in &list[u + 1..] {
                    let (p, q) = (left as usize, right as usize);
                    let ((kp, ip), (kq, iq)) = ((p / steps, p % steps), (q / steps, q % steps));
                    if kp == kq && neighbours(ip, iq, steps, joined[kp]) {
                        continue;
                    }
                    let (a, b) = (at(kp, ip), at(kp, ip + 1));
                    let (c, d) = (at(kq, iq), at(kq, iq + 1));
                    let (first, second) = (ends(a, b), ends(c, d));
                    let (one, two) = (cell(first.0), cell(second.0));
                    if (one.0.max(two.0), one.1.max(two.1)) != (x, y) {
                        continue;
                    }
                    let (s1, s2) = (side(a, b, c), side(a, b, d));
                    let (s3, s4) = (side(c, d, a), side(c, d, b));
                    if s1 * s2 < 0 && s3 * s4 < 0 {
                        if kp == kq {
                            out.selves[kp] += 1;
                        } else {
                            let (i, j) = (kp.min(kq), kp.max(kq));
                            out.pairs[i * curves - i * (i + 1) / 2 + j - i - 1] += 1;
                        }
                        found.push(meet(a, b, c, d));
                    } else if s1 * s2 <= 0 && s3 * s4 <= 0 {
                        out.touches += 1;
                    }
                }
            }
        }
    }
    let (most, crowded, points, branches) = crowd(&found, tol * span);
    out.most = most;
    out.crowded = crowded;
    out.points = points;
    out.branches = branches;
    Ok(out)
}

pub fn spread(track: &Track, pencils: &[Pencil], exact: bool) -> Vec<Pencil> {
    if !exact {
        return pencils.to_vec();
    }
    let mut seen: HashMap<(i64, i64), usize> = HashMap::new();
    let mut out = Vec::new();
    for pencil in pencils {
        let key = match track.kind.as_str() {
            "in" | "out" => least(pencil.seat, gcd(track.ratio.1 as u128, 4) as usize),
            _ => (out.len() as i64, 1),
        };
        if seen.insert(key, out.len()).is_none() {
            out.push(*pencil);
        }
    }
    out
}

fn least(seat: (i64, i64), order: usize) -> (i64, i64) {
    let quarter = |(u, v): (i64, i64)| (-v, u);
    let (mut best, mut turned) = (seat, seat);
    for _ in 1..order {
        for _ in 0..4 / order {
            turned = quarter(turned);
        }
        best = best.min(turned);
    }
    best
}

fn box_of(trail: &[f32]) -> ([f64; 2], [f64; 2]) {
    let mut low = [f64::MAX; 2];
    let mut high = [f64::MIN; 2];
    for pair in trail.as_chunks::<2>().0 {
        for k in 0..2 {
            let value = f64::from(pair[k]);
            low[k] = low[k].min(value);
            high[k] = high[k].max(value);
        }
    }
    (low, high)
}

fn ends(a: [f64; 2], b: [f64; 2]) -> ([f64; 2], [f64; 2]) {
    (
        [a[0].min(b[0]), a[1].min(b[1])],
        [a[0].max(b[0]), a[1].max(b[1])],
    )
}

fn neighbours(i: usize, j: usize, steps: usize, joined: bool) -> bool {
    let (i, j) = (i.min(j), i.max(j));
    j == i + 1 || (joined && i == 0 && j == steps - 1)
}

pub fn side(a: [f64; 2], b: [f64; 2], c: [f64; 2]) -> i32 {
    let (ux, uy) = (b[0] - a[0], b[1] - a[1]);
    let (vx, vy) = (c[0] - a[0], c[1] - a[1]);
    let cross = uy * vx;
    let slip = f64::mul_add(uy, vx, -cross);
    let turn = f64::mul_add(ux, vy, -cross) - slip;
    match turn.partial_cmp(&0.0) {
        Some(std::cmp::Ordering::Greater) => 1,
        Some(std::cmp::Ordering::Less) => -1,
        _ => 0,
    }
}

fn meet(a: [f64; 2], b: [f64; 2], c: [f64; 2], d: [f64; 2]) -> [f64; 2] {
    let run = [b[0] - a[0], b[1] - a[1]];
    let other = [d[0] - c[0], d[1] - c[1]];
    let denominator = run[0] * other[1] - run[1] * other[0];
    let step = ((c[0] - a[0]) * other[1] - (c[1] - a[1]) * other[0]) / denominator;
    [a[0] + step * run[0], a[1] + step * run[1]]
}

fn crowd(found: &[[f64; 2]], tol: f64) -> (usize, usize, usize, usize) {
    if found.is_empty() {
        return (0, 0, 0, 0);
    }
    if tol <= 0.0 {
        return (1, 0, found.len(), 2 * found.len());
    }
    let key = |p: [f64; 2]| ((p[0] / tol).floor() as i64, (p[1] / tol).floor() as i64);
    let mut cells: HashMap<(i64, i64), Vec<usize>> = HashMap::new();
    for (index, &point) in found.iter().enumerate() {
        cells.entry(key(point)).or_default().push(index);
    }
    let mut parent: Vec<usize> = (0..found.len()).collect();
    for (index, &point) in found.iter().enumerate() {
        let (x, y) = key(point);
        for dx in -1..=1 {
            for dy in -1..=1 {
                for &other in cells.get(&(x + dx, y + dy)).into_iter().flatten() {
                    let far = (found[other][0] - point[0]).hypot(found[other][1] - point[1]);
                    if other != index && far <= tol {
                        join(&mut parent, index, other);
                    }
                }
            }
        }
    }
    let mut sizes: HashMap<usize, usize> = HashMap::new();
    for index in 0..found.len() {
        *sizes.entry(root(&mut parent, index)).or_default() += 1;
    }
    let meeting = |count: usize| {
        let mut n = 2;
        while n * (n - 1) / 2 < count {
            n += 1;
        }
        n
    };
    (
        sizes.values().copied().max().unwrap_or(0),
        sizes.values().filter(|&&count| count > 1).count(),
        sizes.len(),
        sizes.values().map(|&count| meeting(count)).sum(),
    )
}

fn root(parent: &mut [usize], mut index: usize) -> usize {
    while parent[index] != index {
        parent[index] = parent[parent[index]];
        index = parent[index];
    }
    index
}

fn join(parent: &mut [usize], a: usize, b: usize) {
    let (a, b) = (root(parent, a), root(parent, b));
    if a != b {
        parent[a.max(b)] = a.min(b);
    }
}
