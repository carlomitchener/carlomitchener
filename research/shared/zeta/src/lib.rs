pub mod sieve;

use mrly_num::complex::{Complex, raise};
pub use mrly_zeta::*;
use std::f64::consts::PI;

const NODES: usize = 4096;

pub fn psi_gap(x: usize, gammas: &[f64]) -> f64 {
    let stair = psi_stair(x).last().copied().unwrap_or(0.0);
    (psi_formula(x as f64, gammas) - stair).abs()
}

pub fn bump(u: f64) -> f64 {
    if u <= 1.0 || u >= 2.0 {
        return 0.0;
    }
    (4.0 - 1.0 / ((u - 1.0) * (2.0 - u))).exp()
}

pub fn mellin(s: Complex) -> Complex {
    let step = 1.0 / NODES as f64;
    let mut sum = Complex::default();
    for k in 1..NODES {
        let u = 1.0 + k as f64 * step;
        sum = sum + raise(u, s - 1.0) * (bump(u) * step);
    }
    sum
}

pub fn novelty_main() -> f64 {
    6.0 / (PI * PI) * mellin(Complex::new(2.0, 0.0)).re
}

pub fn smoothed_novelty(phi: &[u64], y: f64, main: f64) -> f64 {
    let lo = (1.0 / y).ceil() as usize;
    let hi = (2.0 / y).floor() as usize;
    let sum: f64 = phi[lo..=hi]
        .iter()
        .zip(lo..)
        .map(|(&p, n)| p as f64 * bump(n as f64 * y))
        .sum();
    y * y * sum - main
}

pub fn sharp_novelty(prefix: &[u64], y: f64) -> f64 {
    let lo = (1.0 / y).ceil() as usize;
    let hi = (2.0 / y).floor() as usize;
    y * y * (prefix[hi] - prefix[lo - 1]) as f64 - 9.0 / (PI * PI)
}

pub fn novelty_wave(gammas: &[f64], coef: &[Complex], log_y: f64) -> f64 {
    let sum: f64 = gammas
        .iter()
        .zip(coef)
        .map(|(g, c)| (*c * Complex::turn(-g * log_y)).re)
        .sum();
    2.0 * sum
}

pub fn psi_formula(x: f64, gammas: &[f64]) -> f64 {
    let log = x.ln();
    let waves: f64 = gammas
        .iter()
        .map(|&g| (0.5 * (g * log).cos() + g * (g * log).sin()) / (0.25 + g * g))
        .sum();
    x - 2.0 * x.sqrt() * waves - (2.0 * PI).ln() - 0.5 * (1.0 - 1.0 / (x * x)).ln()
}
