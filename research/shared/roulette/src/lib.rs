pub mod crossings;

use mrly_error::{Result, value_error};
use mrly_num::factor::gcd;
use mrly_rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::f64::consts::{PI, TAU};

pub const RADIUS_CAP: usize = 96;
pub const SIDES: (usize, usize) = (3, 12);
pub const LAPS_CAP: usize = 24;
pub const PENCIL_CAP: usize = 4096;
pub const POINT_CAP: usize = 4_000_000;
const REACH: (f64, f64) = (0.05, 2.0);
const RING: usize = 360;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Kind {
    Fill,
    Void,
    Corner,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Pencil {
    pub x: f64,
    pub y: f64,
    pub seat: (i64, i64),
    pub kind: Kind,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Seats {
    pub fills: usize,
    pub voids: usize,
    pub corners: usize,
}

pub fn pencils(
    types: &[u8],
    width: usize,
    height: usize,
    mode: &str,
    reach: f64,
    jitter: f64,
    seed: u32,
) -> Result<Vec<Pencil>> {
    if width == 0 || height == 0 || types.len() != width * height {
        return value_error("the wheel must be a grid of width by height bytes.");
    }
    if !(REACH.0..=REACH.1).contains(&reach) {
        return value_error(format!(
            "the reach must be between {} and {} wheel radii.",
            REACH.0, REACH.1
        ));
    }
    if !(0.0..=1.0).contains(&jitter) {
        return value_error("the jitter must be between 0 and 1 cells.");
    }
    if !["fill", "void", "both", "corners"].contains(&mode) {
        return value_error("the pencils sit on fill, void, both or corners.");
    }
    let (w, h) = (width as i64, height as i64);
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for i in 0..height {
        for j in 0..width {
            let on = types[i * width + j] != 0;
            let (i, j) = (i as i64, j as i64);
            if mode == "corners" {
                if !on {
                    continue;
                }
                for (di, dj) in [(0, 0), (0, 1), (1, 0), (1, 1)] {
                    let seat = (2 * (j + dj) - w, h - 2 * (i + di));
                    if seen.insert(seat) {
                        out.push(seat_pencil(seat, Kind::Corner));
                    }
                }
            } else if (on && mode != "void") || (!on && mode != "fill") {
                let kind = if on { Kind::Fill } else { Kind::Void };
                out.push(seat_pencil((2 * j + 1 - w, h - 2 * i - 1), kind));
            }
        }
    }
    if out.len() > PENCIL_CAP {
        return value_error(format!(
            "{} pencils is past the cap of {PENCIL_CAP}: take a lower level or a smaller tile.",
            out.len()
        ));
    }
    let unit = reach / (width as f64 / 2.0).hypot(height as f64 / 2.0);
    let mut rng = Rng::new(u64::from(seed));
    for pencil in &mut out {
        let (dx, dy) = if jitter > 0.0 {
            ((rng.unit() - 0.5) * jitter, (rng.unit() - 0.5) * jitter)
        } else {
            (0.0, 0.0)
        };
        pencil.x = (pencil.seat.0 as f64 / 2.0 + dx) * unit;
        pencil.y = (pencil.seat.1 as f64 / 2.0 + dy) * unit;
    }
    Ok(out)
}

pub fn cell(width: usize, height: usize, reach: f64) -> f64 {
    reach / (width as f64 / 2.0).hypot(height as f64 / 2.0)
}

pub fn seats(pencils: &[Pencil]) -> Seats {
    let mut out = Seats::default();
    for pencil in pencils {
        match pencil.kind {
            Kind::Fill => out.fills += 1,
            Kind::Void => out.voids += 1,
            Kind::Corner => out.corners += 1,
        }
    }
    out
}

fn seat_pencil(seat: (i64, i64), kind: Kind) -> Pencil {
    Pencil {
        x: 0.0,
        y: 0.0,
        seat,
        kind,
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub enum Piece {
    Run {
        from: (f64, f64),
        to: (f64, f64),
    },
    Turn {
        about: (f64, f64),
        radius: f64,
        from: f64,
        to: f64,
    },
}

impl Piece {
    fn len(&self) -> f64 {
        match *self {
            Piece::Run { from, to } => (to.0 - from.0).hypot(to.1 - from.1),
            Piece::Turn {
                radius, from, to, ..
            } => radius * (to - from),
        }
    }

    fn at(&self, s: f64) -> (f64, f64) {
        match *self {
            Piece::Run { from, to } => {
                let len = self.len();
                let t = if len > 0.0 {
                    (s / len).clamp(0.0, 1.0)
                } else {
                    0.0
                };
                (from.0 + (to.0 - from.0) * t, from.1 + (to.1 - from.1) * t)
            }
            Piece::Turn {
                about,
                radius,
                from,
                to,
            } => {
                let angle = (from + s / radius).min(to);
                (
                    about.0 + radius * angle.cos(),
                    about.1 + radius * angle.sin(),
                )
            }
        }
    }

    fn bounds(&self) -> [f64; 4] {
        match *self {
            Piece::Run { from, to } => [
                from.0.min(to.0),
                from.1.min(to.1),
                from.0.max(to.0),
                from.1.max(to.1),
            ],
            Piece::Turn { about, radius, .. } => [
                about.0 - radius,
                about.1 - radius,
                about.0 + radius,
                about.1 + radius,
            ],
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Track {
    pub kind: String,
    pub wheel: f64,
    pub pieces: Vec<Piece>,
    pub total: f64,
    pub side: f64,
    pub outline: Vec<(f64, f64)>,
    pub closed: bool,
    pub ratio: (usize, usize),
    pub orbits: usize,
    pub fold: usize,
}

pub fn track(kind: &str, ring: usize, wheel: usize, sides: usize, laps: usize) -> Result<Track> {
    if !(1..=RADIUS_CAP).contains(&wheel) || !(1..=RADIUS_CAP).contains(&ring) {
        return value_error(format!(
            "the ring and the wheel must have radius between 1 and {RADIUS_CAP}."
        ));
    }
    if !(1..=LAPS_CAP).contains(&laps) {
        return value_error(format!("the laps must be between 1 and {LAPS_CAP}."));
    }
    let r = wheel as f64;
    let big = ring as f64;
    let mut out = Track {
        kind: kind.to_string(),
        wheel: r,
        pieces: Vec::new(),
        total: 0.0,
        side: -1.0,
        outline: Vec::new(),
        closed: false,
        ratio: (0, 0),
        orbits: laps,
        fold: 0,
    };
    match kind {
        "line" => {
            let run = laps as f64 * TAU * r;
            out.pieces.push(Piece::Run {
                from: (0.0, r),
                to: (run, r),
            });
            out.outline = vec![(-r, 0.0), (run + r, 0.0)];
            out.orbits = 1;
        }
        "in" | "out" => {
            let inside = kind == "in";
            if inside && ring <= wheel {
                return value_error("the wheel must be smaller than the ring it rolls inside.");
            }
            let g = gcd(ring as u128, wheel as u128) as usize;
            let (a, b) = (ring / g, wheel / g);
            let rho = if inside { big - r } else { big + r };
            out.side = if inside { -1.0 } else { 1.0 };
            out.pieces.push(Piece::Turn {
                about: (0.0, 0.0),
                radius: rho,
                from: 0.0,
                to: TAU * b as f64,
            });
            out.outline = (0..RING)
                .map(|k| {
                    let angle = TAU * k as f64 / RING as f64;
                    (big * angle.cos(), big * angle.sin())
                })
                .collect();
            out.closed = true;
            out.ratio = (a, b);
            out.orbits = b;
            out.fold = a;
        }
        "polyin" | "polyout" => {
            if !(SIDES.0..=SIDES.1).contains(&sides) {
                return value_error(format!(
                    "the polygon must have between {} and {} sides.",
                    SIDES.0, SIDES.1
                ));
            }
            let corners = polygon(big, sides);
            out.outline = corners.clone();
            out.closed = true;
            if kind == "polyin" {
                let inset = big * (PI / sides as f64).cos() - r;
                if inset <= 0.0 {
                    return value_error("the wheel does not fit inside the polygon.");
                }
                let inner = polygon(inset / (PI / sides as f64).cos(), sides);
                for _ in 0..laps {
                    for k in 0..sides {
                        out.pieces.push(Piece::Run {
                            from: inner[k],
                            to: inner[(k + 1) % sides],
                        });
                    }
                }
            } else {
                out.side = 1.0;
                let normal = |k: usize| {
                    let (p, q) = (corners[k], corners[(k + 1) % sides]);
                    let (dx, dy) = (q.0 - p.0, q.1 - p.1);
                    let len = dx.hypot(dy);
                    (dy / len, -dx / len)
                };
                for _ in 0..laps {
                    for k in 0..sides {
                        let (p, q) = (corners[k], corners[(k + 1) % sides]);
                        let (m, next) = (normal(k), normal((k + 1) % sides));
                        out.pieces.push(Piece::Run {
                            from: (p.0 + r * m.0, p.1 + r * m.1),
                            to: (q.0 + r * m.0, q.1 + r * m.1),
                        });
                        let from = m.1.atan2(m.0);
                        let mut to = next.1.atan2(next.0);
                        while to < from {
                            to += TAU;
                        }
                        out.pieces.push(Piece::Turn {
                            about: q,
                            radius: r,
                            from,
                            to,
                        });
                    }
                }
            }
        }
        _ => return value_error("the track is line, in, out, polyin or polyout."),
    }
    out.total = out.pieces.iter().map(Piece::len).sum();
    Ok(out)
}

fn polygon(radius: f64, sides: usize) -> Vec<(f64, f64)> {
    (0..sides)
        .map(|k| {
            let angle = PI / sides as f64 + TAU * k as f64 / sides as f64;
            (radius * angle.cos(), radius * angle.sin())
        })
        .collect()
}

pub fn pose(track: &Track, s: f64) -> (f64, f64) {
    let mut left = s.clamp(0.0, track.total);
    let last = track.pieces.len() - 1;
    for (k, piece) in track.pieces.iter().enumerate() {
        let len = piece.len();
        if left <= len || k == last {
            return piece.at(left);
        }
        left -= len;
    }
    (0.0, 0.0)
}

pub fn turn(track: &Track, s: f64) -> f64 {
    let angle = track.side * s / track.wheel;
    if angle == 0.0 { 0.0 } else { angle }
}

pub fn point(track: &Track, pencil: &Pencil, s: f64) -> (f64, f64) {
    let (cx, cy) = pose(track, s);
    let phi = turn(track, s);
    let (c, sn) = (phi.cos(), phi.sin());
    let r = track.wheel;
    (
        cx + r * (pencil.x * c - pencil.y * sn),
        cy + r * (pencil.x * sn + pencil.y * c),
    )
}

pub fn trace(track: &Track, pencils: &[Pencil], samples: usize) -> Result<Vec<f32>> {
    if samples < 2 {
        return value_error("a trace needs at least two samples.");
    }
    if pencils.len() * samples > POINT_CAP {
        return value_error(format!(
            "{} points is past the cap of {POINT_CAP}: fewer samples or fewer pencils.",
            pencils.len() * samples
        ));
    }
    let mut out = Vec::with_capacity(pencils.len() * samples * 2);
    for pencil in pencils {
        for k in 0..samples {
            let s = track.total * k as f64 / (samples - 1) as f64;
            let (x, y) = point(track, pencil, s);
            out.push(x as f32);
            out.push(y as f32);
        }
    }
    Ok(out)
}

pub fn distinct(track: &Track, pencils: &[Pencil], exact: bool) -> usize {
    representatives(track, pencils, exact).len()
}

pub fn representatives(track: &Track, pencils: &[Pencil], exact: bool) -> Vec<usize> {
    if !exact {
        return (0..pencils.len()).collect();
    }
    let mut out = Vec::new();
    match track.kind.as_str() {
        "line" => {
            let mut seen = HashSet::new();
            for (k, p) in pencils.iter().enumerate() {
                if seen.insert(p.seat.0 * p.seat.0 + p.seat.1 * p.seat.1) {
                    out.push(k);
                }
            }
        }
        "in" | "out" => {
            let order = gcd(track.ratio.1 as u128, 4) as usize;
            let quarter = |(u, v): (i64, i64)| (-v, u);
            let mut seen = HashSet::new();
            for (k, p) in pencils.iter().enumerate() {
                let mut least = p.seat;
                let mut seat = p.seat;
                for _ in 1..order {
                    for _ in 0..4 / order {
                        seat = quarter(seat);
                    }
                    least = least.min(seat);
                }
                if seen.insert(least) {
                    out.push(k);
                }
            }
        }
        _ => out.extend(0..pencils.len()),
    }
    out
}

pub fn frame(track: &Track, pencils: &[Pencil]) -> [f64; 4] {
    let reach = pencils
        .iter()
        .map(|p| p.x.hypot(p.y))
        .fold(1.0_f64, f64::max);
    let pad = track.wheel * reach;
    let mut box_ = [f64::MAX, f64::MAX, f64::MIN, f64::MIN];
    let mut take = |x: f64, y: f64| {
        box_[0] = box_[0].min(x);
        box_[1] = box_[1].min(y);
        box_[2] = box_[2].max(x);
        box_[3] = box_[3].max(y);
    };
    for piece in &track.pieces {
        let b = piece.bounds();
        take(b[0] - pad, b[1] - pad);
        take(b[2] + pad, b[3] + pad);
    }
    for &(x, y) in &track.outline {
        take(x, y);
    }
    box_
}

pub fn nodes(track: &Track, pencils: &[Pencil], exact: bool) -> Option<u64> {
    if track.kind != "in" && track.kind != "out" {
        return None;
    }
    let (a, b) = (track.ratio.0 as u64, track.ratio.1 as u64);
    let window = (a as f64 / b as f64 + track.side).abs().min(1.0);
    let out = pencils.iter().any(|p| {
        let seat = p.x.hypot(p.y);
        !(seat > 0.0 && seat < window)
    });
    if out {
        return None;
    }
    let k = distinct(track, pencils, exact) as u64;
    Some(2 * a * b * (k * k.saturating_sub(1) / 2) + k * a * (b - 1))
}

pub const RASTER_CAP: usize = 4096;

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Disc {
    pub x: f64,
    pub y: f64,
    pub radius: f64,
    pub hole: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Cover {
    pub mask: Vec<u8>,
    pub side: usize,
    pub covered: f64,
    pub hole: f64,
    pub wall: f64,
    pub winding: f64,
    pub areas: f64,
}

pub fn signed_area(track: &Track, pencil: &Pencil) -> Option<f64> {
    let (_, rho) = ring(track).ok()?;
    let r = track.wheel;
    let d = r * pencil.x.hypot(pencil.y);
    let b = track.ratio.1 as f64;
    Some(PI * b * rho * (rho + track.side * d * d / r))
}

pub fn disc(track: &Track, pencils: &[Pencil]) -> Result<Disc> {
    let ((x, y), rho) = ring(track)?;
    let reach = |p: &Pencil| track.wheel * p.x.hypot(p.y);
    let far = pencils.iter().map(reach).fold(0.0_f64, f64::max);
    let near = pencils
        .iter()
        .map(|p| (rho - reach(p)).abs())
        .fold(f64::MAX, f64::min);
    Ok(Disc {
        x,
        y,
        radius: rho + far,
        hole: if pencils.is_empty() { rho } else { near },
    })
}

pub fn cover(
    track: &Track,
    pencils: &[Pencil],
    exact: bool,
    samples: usize,
    side: usize,
) -> Result<Cover> {
    if !(16..=RASTER_CAP).contains(&side) {
        return value_error(format!(
            "the raster side must be between 16 and {RASTER_CAP}."
        ));
    }
    if samples < 2 {
        return value_error("a cover needs at least two samples.");
    }
    let (_, rho) = ring(track)?;
    let bounds = disc(track, pencils)?;
    let (n, r) = (side, track.wheel);
    let h = 2.0 * bounds.radius / n as f64;
    let left = bounds.x - bounds.radius;
    let top = bounds.y + bounds.radius;
    let drawn = representatives(track, pencils, exact);
    let mut steps = Vec::with_capacity(drawn.len());
    for &k in &drawn {
        let d = r * pencils[k].x.hypot(pencils[k].y);
        let arc = TAU * track.ratio.1 as f64 * rho * (1.0 + d / r);
        steps.push(samples.max((2.0 * arc / h).ceil().max(2.0) as usize));
    }
    let work: usize = steps.iter().sum();
    if work > POINT_CAP {
        return value_error(format!(
            "{work} samples is past the cap of {POINT_CAP}: a coarser raster or fewer curves."
        ));
    }
    let mut wall = vec![false; n * n];
    let mut rows: Vec<Vec<(f64, i32)>> = vec![Vec::new(); n];
    for (&k, &count) in drawn.iter().zip(&steps) {
        let mut last = point(track, &pencils[k], 0.0);
        mark(&mut wall, n, left, top, h, last);
        for step in 1..=count {
            let s = track.total * step as f64 / count as f64;
            let next = point(track, &pencils[k], s);
            mark(&mut wall, n, left, top, h, next);
            scan(&mut rows, n, top, h, last, next);
            last = next;
        }
    }
    let mut code = vec![0u8; n * n];
    let mut stack = Vec::new();
    for j in 0..n {
        for at in [j, (n - 1) * n + j, j * n, j * n + n - 1] {
            if !wall[at] && code[at] == 0 {
                code[at] = 1;
                stack.push(at);
            }
        }
    }
    flood(&mut code, &wall, n, &mut stack);
    let middle = (n / 2) * n + n / 2;
    if !wall[middle] && code[middle] == 0 {
        code[middle] = 2;
        stack.push(middle);
        flood(&mut code, &wall, n, &mut stack);
    }
    let (mut total, mut shape, mut hollow, mut edge, mut turns) =
        (0usize, 0usize, 0usize, 0usize, 0i64);
    for (row, line) in rows.iter_mut().enumerate() {
        let y = top - (row as f64 + 0.5) * h;
        line.sort_by(|a, b| b.0.total_cmp(&a.0));
        let (mut seen, mut winding) = (0usize, 0i64);
        for column in (0..n).rev() {
            let x = left + (column as f64 + 0.5) * h;
            while seen < line.len() && line[seen].0 > x {
                winding += i64::from(line[seen].1);
                seen += 1;
            }
            let at = row * n + column;
            if (x - bounds.x).hypot(y - bounds.y) > bounds.radius {
                code[at] = 0;
                continue;
            }
            total += 1;
            turns += winding;
            if wall[at] {
                edge += 1;
            }
            match code[at] {
                1 => {}
                2 => hollow += 1,
                _ => {
                    code[at] = 3;
                    shape += 1;
                }
            }
        }
    }
    let count = total.max(1) as f64;
    let sum: f64 = drawn
        .iter()
        .filter_map(|&k| signed_area(track, &pencils[k]))
        .sum();
    Ok(Cover {
        mask: code,
        side: n,
        covered: shape as f64 / count,
        hole: hollow as f64 / count,
        wall: edge as f64 / count,
        winding: turns as f64 / count,
        areas: sum / (PI * bounds.radius * bounds.radius),
    })
}

fn ring(track: &Track) -> Result<((f64, f64), f64)> {
    match track.pieces.first() {
        Some(&Piece::Turn { about, radius, .. }) if track.kind == "in" || track.kind == "out" => {
            Ok((about, radius))
        }
        _ => value_error(
            "the cover needs a circle track: the wall of a line or a polygon roulette need not close.",
        ),
    }
}

fn mark(wall: &mut [bool], n: usize, left: f64, top: f64, h: f64, p: (f64, f64)) {
    let column = (((p.0 - left) / h) as isize).clamp(0, n as isize - 1) as usize;
    let row = (((top - p.1) / h) as isize).clamp(0, n as isize - 1) as usize;
    wall[row * n + column] = true;
}

fn scan(rows: &mut [Vec<(f64, i32)>], n: usize, top: f64, h: f64, p: (f64, f64), q: (f64, f64)) {
    if p.1 == q.1 {
        return;
    }
    let (sign, low, high) = if q.1 > p.1 {
        (1, p.1, q.1)
    } else {
        (-1, q.1, p.1)
    };
    let last = n as f64 - 1.0;
    let first = ((top - high) / h - 1.5).clamp(0.0, last) as usize;
    let stop = ((top - low) / h + 0.5).clamp(0.0, last) as usize;
    for (step, line) in rows[first..=stop].iter_mut().enumerate() {
        let y = top - ((first + step) as f64 + 0.5) * h;
        if y < low || y >= high {
            continue;
        }
        line.push((p.0 + (q.0 - p.0) * (y - p.1) / (q.1 - p.1), sign));
    }
}

fn flood(code: &mut [u8], wall: &[bool], n: usize, stack: &mut Vec<usize>) {
    while let Some(at) = stack.pop() {
        let tint = code[at];
        let (row, column) = (at / n, at % n);
        let step = |to: usize, code: &mut [u8], stack: &mut Vec<usize>| {
            if !wall[to] && code[to] == 0 {
                code[to] = tint;
                stack.push(to);
            }
        };
        if row > 0 {
            step(at - n, code, stack);
        }
        if row + 1 < n {
            step(at + n, code, stack);
        }
        if column > 0 {
            step(at - 1, code, stack);
        }
        if column + 1 < n {
            step(at + 1, code, stack);
        }
    }
}
