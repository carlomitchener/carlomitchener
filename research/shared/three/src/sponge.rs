use std::f64::consts::{PI, SQRT_2};
use std::sync::OnceLock;

pub const EDGE: f64 = 1.0 / 6.0;

pub const COVER: f64 = SQRT_2 / 6.0;

const PLUS: f64 = 7.0 / 27.0;

const DEPTH: usize = 40;

const DIGITS: usize = 40;

const FLOOR: i64 = 32;

const REACH: i64 = 14;

const NEGLIGIBLE: f64 = 1e-17;

const NODES: usize = 16;

const WEIGHT: [f64; 3] = [3.0, 2.0, 3.0];

const RUNNING: [f64; 3] = [0.0, 3.0, 5.0];

fn split(x: f64) -> (usize, f64) {
    let digit = (3.0 * x).floor().clamp(0.0, 2.0);
    (digit as usize, (3.0 * x - digit).clamp(0.0, 1.0))
}

fn carpet(mut across: f64, mut along: f64) -> f64 {
    let mut scale = 1.0 / 3.0;
    for _ in 0..DIGITS {
        let ((a, fa), (b, fb)) = (split(across), split(along));
        if a == 1 && b == 1 {
            return scale * fa.min(1.0 - fa).min(fb).min(1.0 - fb);
        }
        across = fa;
        along = fb;
        scale /= 3.0;
    }
    0.0
}

fn gap(v: f64) -> f64 {
    (v - 1.0 / 3.0).abs().min((v - 2.0 / 3.0).abs())
}

fn plus(point: [f64; 3]) -> f64 {
    let middle = point.map(|v| (1.0 / 3.0..=2.0 / 3.0).contains(&v));
    let gaps = point.map(gap);
    match (0..3).find(|&k| !middle[k]) {
        None => {
            let mut sorted = gaps;
            sorted.sort_by(f64::total_cmp);
            sorted[0].hypot(sorted[1])
        }
        Some(axis) => {
            let v = point[axis];
            let along = 3.0 * if v < 1.0 / 3.0 { v } else { v - 2.0 / 3.0 };
            let (i, j) = ((axis + 1) % 3, (axis + 2) % 3);
            let wall_i = carpet(3.0 * point[j] - 1.0, along) / 3.0;
            let wall_j = carpet(3.0 * point[i] - 1.0, along) / 3.0;
            gaps[i].hypot(wall_i).min(gaps[j].hypot(wall_j))
        }
    }
}

fn sweep(t: f64, radius: f64) -> f64 {
    if t >= radius {
        return PI * radius * radius / 4.0;
    }
    t / 2.0 * (radius * radius - t * t).sqrt() + radius * radius / 2.0 * (t / radius).asin()
}

fn moment(t: f64, radius: f64) -> f64 {
    let r2 = radius * radius;
    if t >= radius {
        return r2 * radius / 3.0;
    }
    let rest = r2 - t * t;
    t * t * (3.0 * r2 * r2 - 3.0 * r2 * t * t + t.powi(4))
        / (3.0 * (r2 * radius + rest * rest.sqrt()))
}

fn piece(from: f64, to: f64, width: f64, slope: f64, radius: f64) -> f64 {
    if to <= from {
        return 0.0;
    }
    width * (sweep(to, radius) - sweep(from, radius))
        - slope * (moment(to, radius) - moment(from, radius))
}

fn hole(side: f64, radius: f64) -> f64 {
    4.0 * piece(0.0, side / 2.0, side, 2.0, radius)
}

fn partial(side: f64, cut: f64, radius: f64) -> f64 {
    let left = piece(0.0, (side / 2.0).min(cut), side, 2.0, radius);
    let right = piece((side - cut).max(0.0), side / 2.0, side, 2.0, radius);
    let bottom = if cut <= side / 2.0 {
        piece(0.0, cut, cut, 1.0, radius)
    } else {
        piece(0.0, side - cut, cut, 1.0, radius) + piece(side - cut, side / 2.0, side, 2.0, radius)
    };
    left + right + 2.0 * bottom
}

fn places(mut count: f64, digits: usize) -> Vec<usize> {
    let mut out = Vec::with_capacity(digits);
    for _ in 0..digits {
        let rest = (count / 3.0).floor();
        out.push(((count - 3.0 * rest) as usize).min(2));
        count = rest;
    }
    out
}

fn column(index: f64, digits: usize) -> f64 {
    places(index, digits).iter().map(|&k| WEIGHT[k]).product()
}

fn below(count: f64, digits: usize) -> f64 {
    if count >= 3f64.powi(digits as i32) {
        return 8f64.powi(digits as i32);
    }
    let (mut total, mut prefix, mut eight) = (0.0, 1.0, 8f64.powi(digits as i32));
    for &k in places(count, digits).iter().rev() {
        eight /= 8.0;
        total += prefix * RUNNING[k] * eight;
        prefix *= WEIGHT[k];
    }
    total
}

fn levels(radius: f64) -> usize {
    ((1.0 / radius).log(3.0).ceil() as i64 + REACH).max(FLOOR) as usize
}

fn width(level: usize) -> f64 {
    3f64.powi(-(level as i32) - 1)
}

fn wall(radius: f64, top: usize) -> f64 {
    let mut total = 0.0;
    for level in 1..=top {
        total += 8f64.powi(level as i32 - 1) * hole(width(level), radius);
    }
    total / 2.0 + radius * (8.0f64 / 9.0).powi(top as i32) / 18.0
}

fn strip(radius: f64, top: usize) -> f64 {
    let (mut total, mut share) = (0.0, 0.0);
    for level in 1..=top {
        let side = width(level);
        let ratio = radius / side;
        let columns = 3f64.powi(level as i32 - 1);
        let mut here = 0.0;
        let full = ((ratio - 2.0) / 3.0).floor() + 1.0;
        if full > 0.0 {
            here += below(full.min(columns), level - 1) * hole(side, radius);
        }
        let cut = ((ratio - 1.0) / 3.0).floor();
        let start = (3.0 * cut + 1.0) * side;
        if cut >= 0.0 && cut < columns && start < radius && radius < start + side {
            here += column(cut, level - 1) * partial(side, radius - start, radius);
        }
        total += here;
        share = here / (8f64.powi(level as i32 - 1) * radius * side * side);
    }
    total + share * radius * (8.0f64 / 9.0).powi(top as i32) / 9.0
}

fn inside(radius: f64) -> f64 {
    let top = levels(radius);
    (PI + 8.0) * radius * radius - 8.0 * SQRT_2 * radius.powi(3)
        + 48.0 * (wall(radius, top) - strip(radius, top))
}

fn crown(radius: f64) -> f64 {
    let lap = (radius * radius - EDGE * EDGE).max(0.0).sqrt();
    PI * radius * radius
        - 8.0 * SQRT_2 * radius.powi(3)
        - 4.0 * radius * radius * (EDGE / radius).min(1.0).acos()
        + (2.0 / 3.0 + 16.0 * lap * lap) * lap
        + 2.0 / 9.0
}

fn legendre() -> &'static [(f64, f64)] {
    static RULE: OnceLock<Vec<(f64, f64)>> = OnceLock::new();
    RULE.get_or_init(|| {
        let n = NODES as f64;
        (1..=NODES)
            .map(|i| {
                let mut x = (PI * (i as f64 - 0.25) / (n + 0.5)).cos();
                let mut slope = 1.0;
                for _ in 0..64 {
                    let (mut low, mut high) = (1.0, x);
                    for k in 2..=NODES {
                        let k = k as f64;
                        (low, high) = (high, ((2.0 * k - 1.0) * x * high - (k - 1.0) * low) / k);
                    }
                    slope = n * (x * high - low) / (x * x - 1.0);
                    let step = high / slope;
                    x -= step;
                    if step.abs() < 1e-17 {
                        break;
                    }
                }
                (x, 2.0 / ((1.0 - x * x) * slope * slope))
            })
            .collect()
    })
}

fn pair(radius: f64, start: f64, side: f64, line: f64) -> f64 {
    let (half, reach) = (side / 2.0, line - start);
    let angle = |depth: f64| (depth / radius).clamp(0.0, 1.0).asin();
    let edge = |y: f64| ((radius - y) * (radius + y)).max(0.0).sqrt().atan2(y);
    let (low, high) = (edge(line), edge(start));
    let mut cuts = vec![low, high];
    for depth in [half, reach, side - reach] {
        cuts.push(angle(depth));
    }
    for shift in [start, start + side] {
        let spread = 2.0 * radius * radius - shift * shift;
        if spread >= 0.0 {
            cuts.push(angle(
                ((radius - shift) * (radius + shift) / (spread.sqrt() + shift)).abs(),
            ));
        }
    }
    cuts.retain(|phi| (low..=high).contains(phi));
    cuts.sort_by(f64::total_cmp);
    let mut total = 0.0;
    for window in cuts.windows(2) {
        let (middle, span) = ((window[0] + window[1]) / 2.0, (window[1] - window[0]) / 2.0);
        for &(x, weight) in legendre() {
            let phi = middle + span * x;
            let depth = radius * phi.sin();
            let across = radius - start - 2.0 * radius * (phi / 2.0).sin().powi(2);
            let width = reach.min(side - depth) - across.max(depth);
            if depth < half && width > 0.0 {
                total += weight * span * (half - depth) * width * depth;
            }
        }
    }
    4.0 * total
}

pub fn dimension() -> f64 {
    20f64.ln() / 3f64.ln()
}

pub fn distance(point: [f64; 3]) -> f64 {
    let mut local = point.map(|v| v.clamp(0.0, 1.0));
    let mut scale = 1.0;
    for _ in 0..DIGITS {
        let digits = local.map(split);
        if digits.iter().filter(|(d, _)| *d == 1).count() >= 2 {
            return scale * plus(local);
        }
        local = digits.map(|(_, rest)| rest);
        scale /= 3.0;
    }
    0.0
}

pub fn tube(radius: f64) -> Option<f64> {
    if radius.is_nan() || (radius > EDGE && radius < COVER) {
        return None;
    }
    if radius <= 0.0 {
        return Some(0.0);
    }
    if radius >= COVER {
        return Some(PLUS);
    }
    Some(inside(radius))
}

pub fn deep(radius: f64) -> f64 {
    if !(radius > 0.0 && radius.is_finite()) {
        return 0.0;
    }
    let line = radius.min(EDGE);
    let square = radius * radius;
    let (mut local, mut start, mut count, mut total) = (3.0 * line, 0.0, 1.0, 0.0);
    for level in 1..=levels(radius) {
        let side = width(level);
        let digit = (3.0 * local).floor().clamp(0.0, 2.0);
        local = 3.0 * local - digit;
        if digit == 1.0 {
            if count * 2.0 * (side / 2.0).powi(5) < NEGLIGIBLE * square * square {
                break;
            }
            total += count * pair(radius, start + side, side, line);
        }
        start += digit * side;
        count *= if digit == 1.0 { 2.0 } else { 3.0 };
    }
    total
}

pub fn exact(radius: f64) -> f64 {
    if radius <= 0.0 {
        return 0.0;
    }
    if radius >= COVER {
        return PLUS;
    }
    let body = if radius <= EDGE {
        inside(radius)
    } else {
        crown(radius)
    };
    body - 24.0 * deep(radius)
}

pub fn volume(radius: f64) -> Option<f64> {
    if radius.is_nan() {
        return None;
    }
    if radius <= 0.0 {
        return Some(0.0);
    }
    let (mut total, mut weight, mut reach) = (0.0, 1.0, radius);
    while reach < COVER {
        total += weight * tube(reach)?;
        weight *= 20.0 / 27.0;
        reach *= 3.0;
    }
    Some(total + weight)
}

pub fn reading(radius: f64) -> Option<f64> {
    Some(radius.powf(dimension() - 3.0) * volume(radius)?)
}

pub fn profile(radius: f64) -> Option<f64> {
    if !(radius > 0.0 && radius.is_finite()) {
        return None;
    }
    let mut phase = radius;
    while phase > COVER {
        phase /= 3.0;
    }
    while phase <= COVER / 3.0 {
        phase *= 3.0;
    }
    if phase > EDGE {
        return None;
    }
    let (mut total, mut weight, mut reach) = (20.0 / 27.0, 1.0, phase);
    for _ in 0..=DEPTH {
        total += weight * tube(reach)?;
        weight *= 27.0 / 20.0;
        reach /= 3.0;
    }
    Some(phase.powf(dimension() - 3.0) * total)
}
