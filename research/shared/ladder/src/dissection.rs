use crate::design;
use mrly_num::factor::{gcd, mobius_sieve, totient};
use mrly_num::prime::flags;
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

pub const BAR_A: f64 = 0.2;
pub const BAR_B: f64 = 0.25;
pub const GAMMA: f64 = 0.9625229;
pub const CAP_BASE: u64 = 1272;
pub const WINDOW_WALL: u64 = 301;
pub const DIGIT_WALL: u64 = 115;
pub const FIRST_BELOW: u64 = 65;
pub const CERTIFIED: [(u64, u64); 1] = [(65, 0)];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Region {
    A,
    B,
    C1,
    C2,
}

pub fn fraction(a: u64, y: u64, cap: u64) -> (u64, u64) {
    let (mut p0, mut q0, mut p1, mut q1) = (0u64, 1u64, 1u64, 0u64);
    let (mut n, mut d) = (a, y);
    let mut best = (0, 1);
    while d > 0 {
        let c = n / d;
        let (p2, q2) = (c * p1 + p0, c * q1 + q0);
        if q2 > cap {
            break;
        }
        (p0, q0, p1, q1) = (p1, q1, p2, q2);
        best = (p2, q2);
        (n, d) = (d, n - c * d);
    }
    best
}

pub fn cap(y: u64) -> u64 {
    let cube = u128::from(y).pow(3);
    let mut c = (y as f64).powf(0.6) as u64;
    while u128::from(c + 1).pow(5) <= cube {
        c += 1;
    }
    while c > 0 && u128::from(c).pow(5) > cube {
        c -= 1;
    }
    c
}

fn smooth(base: u64, mut d: u64) -> bool {
    loop {
        let g = gcd(u128::from(d), u128::from(base)) as u64;
        if g == 1 {
            return d == 1;
        }
        while d.is_multiple_of(g) {
            d /= g;
        }
    }
}

pub fn regions(base: u64, level: u32, z: u64) -> Vec<Region> {
    let y = base.pow(level);
    let top = cap(y);
    let square = u128::from(y).pow(2);
    (0..y)
        .map(|a| {
            let (l, d) = fraction(a, y, top);
            let h = (i128::from(a) * i128::from(d) - i128::from(l) * i128::from(y)).unsigned_abs();
            if u128::from(d).pow(5) >= square {
                Region::A
            } else if d < z && h < u128::from(z) {
                if smooth(base, d) {
                    Region::C2
                } else {
                    Region::C1
                }
            } else {
                Region::B
            }
        })
        .collect()
}

fn modulus(base: u64, missing: &[u64], digits: &[u64], a: u64, y: u64) -> f64 {
    let turn =
        |k: u64| PI * ((u128::from(k) * u128::from(a) % (2 * u128::from(y))) as f64) / y as f64;
    let term = |k: u64| (2.0 * turn(k)).sin_cos();
    let (im, re) = if missing.len() < digits.len() {
        let kernel = if a == 0 {
            base as f64
        } else {
            turn(base).sin() / turn(1).sin()
        };
        let (sin, cos) = turn(base - 1).sin_cos();
        missing
            .iter()
            .fold((kernel * sin, kernel * cos), |(im, re), &e| {
                let (s, c) = term(e);
                (im - s, re - c)
            })
    } else {
        digits.iter().fold((0.0, 0.0), |(im, re), &d| {
            let (s, c) = term(d);
            (im + s, re + c)
        })
    };
    re.hypot(im)
}

fn rise(base: u64, digits: &[u64], row: &[f64]) -> Vec<f64> {
    let missing: Vec<u64> = (0..base).filter(|d| !digits.contains(d)).collect();
    let below = row.len() as u64;
    let y = below * base;
    (0..y)
        .map(|a| modulus(base, &missing, digits, a, y) * row[(a % below) as usize])
        .collect()
}

pub fn weights(base: u64, digits: &[u64], level: u32) -> Vec<f64> {
    (0..level).fold(vec![1.0], |row, _| rise(base, digits, &row))
}

pub fn masses(base: u64, digits: &[u64], level: u32) -> Vec<f64> {
    let mut row = vec![1.0];
    let mut out = vec![1.0];
    for _ in 0..level {
        row = rise(base, digits, &row);
        out.push(row.iter().sum());
    }
    out
}

pub fn reading(base: u64, fill: usize, masses: &[f64]) -> f64 {
    let n = masses.len();
    if n < 2 {
        return f64::NAN;
    }
    (masses[n - 1] / (fill as f64 * masses[n - 2])).ln() / (base as f64).ln()
}

fn cubic(base: u64, z: f64) -> f64 {
    let slope = 2.0 / PI;
    (z - 1.0).powi(3)
        - (slope * (base as f64).ln() * z
            + GAMMA * (z - 1.0)
            + slope * (z - 1.0).powi(2) / (base as f64 * z - 1.0))
}

pub fn chain_root(base: u64) -> f64 {
    let (mut low, mut high) = (1.0, 11.0);
    while cubic(base, high) < 0.0 {
        high *= 2.0;
    }
    for _ in 0..200 {
        let mid = 0.5 * (low + high);
        if cubic(base, mid) < 0.0 {
            low = mid;
        } else {
            high = mid;
        }
    }
    high
}

pub fn chain_exponent(base: u64) -> f64 {
    let q = base as f64;
    (chain_root(base) * q / (q - 1.0)).ln() / q.ln()
}

pub fn chain_margin(base: u64) -> f64 {
    let q = base as f64;
    cubic(base, q.powf(BAR_A) * (1.0 - 1.0 / q))
}

pub fn chain_wall() -> u64 {
    (3..=CAP_BASE)
        .rev()
        .find(|&q| chain_margin(q) <= 0.0)
        .map_or(3, |q| q + 1)
}

pub fn reach(base: u64, missing: u64) -> &'static str {
    if base >= chain_wall() {
        "proof"
    } else if base >= DIGIT_WALL || CERTIFIED.contains(&(base, missing)) {
        "certificate"
    } else {
        "none"
    }
}

pub fn kappa(base: u64, digits: &[u64]) -> (u64, u64) {
    let units = digits
        .iter()
        .filter(|&&f| gcd(u128::from(f), u128::from(base)) == 1)
        .count() as u64;
    let top = base * units;
    let bottom = totient(base as usize) as u64 * digits.len() as u64;
    let g = gcd(u128::from(top), u128::from(bottom)).max(1) as u64;
    (top / g, bottom / g)
}

pub fn consecutive(digits: &[u64]) -> bool {
    digits.iter().any(|d| digits.contains(&(d + 1)))
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Tally {
    pub log_x: Vec<f64>,
    pub count: Vec<u64>,
    pub meter: Vec<i64>,
    pub primes: Vec<f64>,
}

pub fn tally(base: u64, digits: &[u64], level: usize, samples: usize) -> Tally {
    let values = mrly_num::digits::elements(base, digits, level);
    let top = base.pow(level as u32) as usize;
    let mu = mobius_sieve(top);
    let prime = flags(top);
    let mut powers: Vec<(u64, f64)> = Vec::new();
    for p in (2..=top).take_while(|p| p * p <= top).filter(|&p| prime[p]) {
        let mut power = p * p;
        while power <= top {
            powers.push((power as u64, (p as f64).ln()));
            power = match power.checked_mul(p) {
                Some(next) => next,
                None => break,
            };
        }
    }
    powers.sort_by_key(|row| row.0);
    let mut meter = Vec::with_capacity(values.len());
    let mut psi = Vec::with_capacity(values.len());
    let (mut m, mut s) = (0i64, 0.0f64);
    for &n in &values {
        m += i64::from(mu[n as usize]);
        if prime[n as usize] {
            s += (n as f64).ln();
        } else if let Ok(slot) = powers.binary_search_by_key(&n, |row| row.0) {
            s += powers[slot].1;
        }
        meter.push(m);
        psi.push(s);
    }
    let log_x = design::log_grid(&values, samples);
    let slots: Vec<usize> = log_x
        .iter()
        .map(|&t| values.partition_point(|&v| (v as f64).ln() <= t))
        .collect();
    Tally {
        count: slots.iter().map(|&k| k as u64).collect(),
        meter: slots
            .iter()
            .map(|&k| if k == 0 { 0 } else { meter[k - 1] })
            .collect(),
        primes: slots
            .iter()
            .map(|&k| if k == 0 { 0.0 } else { psi[k - 1] })
            .collect(),
        log_x,
    }
}
