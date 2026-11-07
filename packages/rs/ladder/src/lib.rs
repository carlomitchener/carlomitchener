pub mod design;
pub mod dissection;

use mrly_error::{Result, value_error};
use mrly_num::complex::{Complex, raise};
use mrly_num::digits::elements;
use serde::{Deserialize, Serialize};

pub const ROUNDING: f64 = 1e-13;

const PEEL_TARGET: f64 = 100.0;
const SHIFT_START: f64 = 6.0;
const SHIFT_STEP: f64 = 6.0;
const SHIFT_CAP: f64 = 400.0;
const CUT_START: usize = 8;
const CUT_STEP: usize = 6;
const CUT_CAP: usize = 120;
const RATIO_CAP: f64 = 0.9;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Design {
    base: u64,
    digits: Vec<u64>,
    peel: usize,
    lead: usize,
    largest: u64,
    low: Vec<f64>,
    mid: Vec<f64>,
    gamma: Vec<f64>,
}

impl Design {
    pub fn new(base: u64, digits: &[u64]) -> Result<Design> {
        let mut set: Vec<u64> = digits.to_vec();
        set.sort_unstable();
        set.dedup();
        if set.len() < 2 {
            return value_error("a design needs at least two digits.");
        }
        let lead = set.iter().filter(|&&d| d > 0).count();
        if lead == 0 {
            return value_error("a design needs a nonzero digit.");
        }
        let size = set.len() as f64;
        let mut peel = 2usize;
        while lead as f64 * size.powi(peel as i32) <= PEEL_TARGET {
            peel += 1;
        }
        Design::with_peel(base, &set, peel)
    }

    pub fn with_peel(base: u64, digits: &[u64], peel: usize) -> Result<Design> {
        let mut set: Vec<u64> = digits.to_vec();
        set.sort_unstable();
        set.dedup();
        if base < 2 {
            return value_error(format!("base {base} is under two."));
        }
        if set.len() < 2 {
            return value_error("a design needs at least two digits.");
        }
        if set.iter().any(|&d| d >= base) {
            return value_error(format!("a digit sits outside the base {base}."));
        }
        let lead = set.iter().filter(|&&d| d > 0).count();
        if lead == 0 {
            return value_error("a design needs a nonzero digit.");
        }
        if peel < 2 {
            return value_error(format!("peel depth {peel} is under two."));
        }
        if (base as f64).powi(peel as i32) > 9.007_199_254_740_992e15 {
            return value_error(format!("peel depth {peel} overruns the exact integers."));
        }
        let below = elements(base, &set, peel - 1);
        let through = elements(base, &set, peel);
        let low: Vec<f64> = below.iter().map(|&n| (n as f64).ln()).collect();
        let mid: Vec<f64> = through[below.len()..]
            .iter()
            .map(|&n| (n as f64).ln())
            .collect();
        let largest = *set.last().unwrap();
        let gamma: Vec<f64> = (0..=CUT_CAP)
            .map(|l| set.iter().map(|&a| (a as f64).powi(l as i32)).sum())
            .collect();
        Ok(Design {
            base,
            digits: set,
            peel,
            lead,
            largest,
            low,
            mid,
            gamma,
        })
    }

    pub fn base(&self) -> u64 {
        self.base
    }

    pub fn digits(&self) -> &[u64] {
        &self.digits
    }

    pub fn peel(&self) -> usize {
        self.peel
    }

    pub fn abscissa(&self) -> f64 {
        (self.digits.len() as f64).ln() / (self.base as f64).ln()
    }

    pub fn period(&self) -> f64 {
        2.0 * std::f64::consts::PI / (self.base as f64).ln()
    }

    pub fn pole(&self, m: usize, j: i64) -> Complex {
        Complex::new(self.abscissa() - m as f64, self.period() * j as f64)
    }
}

fn poly(logs: &[f64], w: Complex) -> Complex {
    let mut acc = Complex::new(0.0, 0.0);
    for &l in logs {
        acc = acc + Complex::exp((-w) * l);
    }
    acc
}

fn poly_scale(logs: &[f64], sigma: f64) -> f64 {
    logs.iter().map(|&l| (-sigma * l).exp()).sum()
}

fn tail(design: &Design, sigma: f64) -> f64 {
    let ratio = design.digits.len() as f64 * (design.base as f64).powf(-sigma);
    if ratio >= 1.0 {
        return f64::INFINITY;
    }
    design.lead as f64 * ratio.powi(design.peel as i32 - 1) / (1.0 - ratio)
}

fn log_tail(design: &Design, sigma: f64) -> f64 {
    let ratio = design.digits.len() as f64 * (design.base as f64).powf(-sigma);
    if ratio >= 1.0 {
        return f64::INFINITY;
    }
    (design.lead as f64).ln() + (design.peel as f64 - 1.0) * ratio.ln() - (-ratio).ln_1p()
}

fn log_binomial(top: f64, pick: usize) -> f64 {
    (1..=pick)
        .map(|i| ((top - pick as f64 + i as f64) / i as f64).ln())
        .sum()
}

fn cut(design: &Design, w: Complex, depth: usize) -> f64 {
    let (span, sigma) = (Complex::abs(w), w.re);
    let base = design.base as f64;
    let largest = design.largest as f64;
    let ratio = ((span + depth as f64 + 1.0) / (depth as f64 + 2.0)).max(1.0) * largest
        / base.powi(design.peel as i32);
    if ratio >= RATIO_CAP {
        return f64::INFINITY;
    }
    let rest = log_tail(design, sigma + depth as f64 + 1.0);
    if rest.is_infinite() {
        return f64::INFINITY;
    }
    let log = log_binomial(span + depth as f64, depth + 1)
        + (-sigma - depth as f64 - 1.0) * base.ln()
        + (design.digits.len() as f64).ln()
        + (depth as f64 + 1.0) * largest.ln()
        + rest;
    log.exp() / (1.0 - ratio)
}

struct Rung {
    value: Complex,
    bound: f64,
    scale: f64,
}

fn rung(design: &Design, s: Complex, shift: f64, depth: usize, whole: bool) -> Rung {
    let base = design.base as f64;
    let size = design.digits.len() as f64;
    let levels = (shift - s.re).ceil().max(0.0) as usize;
    if !whole && levels == 0 {
        let front = Complex::new(1.0, 0.0) - raise(base, -s) * size;
        let rest = Complex::abs(front) * tail(design, s.re);
        return Rung {
            value: Complex::new(0.0, 0.0),
            bound: rest,
            scale: rest,
        };
    }
    let mut value = vec![Complex::new(0.0, 0.0); levels + depth + 2];
    let mut bound = vec![0.0f64; levels + depth + 2];
    let mut scale = vec![0.0f64; levels + depth + 2];
    for j in levels..levels + depth + 2 {
        bound[j] = tail(design, s.re + j as f64);
        scale[j] = bound[j];
    }
    for j in (0..levels).rev() {
        let w = s + j as f64;
        let mut acc = poly(&design.mid, w);
        let mut err = cut(design, w, depth);
        let mut wide = poly_scale(&design.mid, w.re) + err;
        let mut coefficient = Complex::new(1.0, 0.0);
        for l in 1..=depth {
            coefficient = coefficient * ((-w) - (l as f64 - 1.0)) * (1.0 / l as f64);
            let weight = raise(base, (-w) - l as f64) * coefficient * design.gamma[l];
            acc = acc + weight * value[j + l];
            err += Complex::abs(weight) * bound[j + l];
            wide += Complex::abs(weight) * scale[j + l];
        }
        if !whole && j == 0 {
            return Rung {
                value: acc,
                bound: err,
                scale: wide,
            };
        }
        let den = Complex::new(1.0, 0.0) - raise(base, -w) * size;
        value[j] = acc / den;
        bound[j] = err / Complex::abs(den);
        scale[j] = wide / Complex::abs(den);
    }
    Rung {
        value: value[0],
        bound: bound[0],
        scale: scale[0],
    }
}

fn crossing(design: &Design, s: Complex, whole: bool) -> Option<(i64, i64)> {
    let turn = s.im / design.period();
    let j = turn.round();
    if (turn - j).abs() > 1e-9 {
        return None;
    }
    let drop = design.abscissa() - s.re;
    let m = drop.round();
    let first = if whole { 0.0 } else { 1.0 };
    if (drop - m).abs() > 1e-9 || m < first {
        return None;
    }
    Some((m as i64, j as i64))
}

fn tune(
    design: &Design,
    s: Complex,
    tolerance: f64,
    whole: bool,
    head: f64,
) -> Result<(Complex, f64)> {
    if let Some((m, j)) = crossing(design, s, whole) {
        return value_error(format!(
            "the ladder walks through the pole s_({m},{j}) = alpha - {m} + 2 pi i {j} / log q and cannot read that point."
        ));
    }
    let mut shift = SHIFT_START;
    let mut depth = CUT_START;
    let mut best = f64::INFINITY;
    while shift <= SHIFT_CAP && depth <= CUT_CAP {
        let step = rung(design, s, shift, depth, whole);
        let carried = step.bound + ROUNDING * (step.scale + head);
        if carried < tolerance {
            return Ok((step.value, carried));
        }
        best = best.min(carried);
        shift += SHIFT_STEP;
        depth += CUT_STEP;
    }
    value_error(format!(
        "tolerance {tolerance:e} is out of reach at s = {} + {}i, best bound {best:e}.",
        s.re, s.im
    ))
}

pub fn zeta(design: &Design, s: Complex, tolerance: f64) -> Result<(Complex, f64)> {
    let (value, bound) = tune(design, s, tolerance, true, poly_scale(&design.low, s.re))?;
    Ok((poly(&design.low, s) + value, bound))
}

pub fn cofactor(design: &Design, s: Complex, tolerance: f64) -> Result<(Complex, f64)> {
    let base = design.base as f64;
    let size = design.digits.len() as f64;
    let front = Complex::new(1.0, 0.0) - raise(base, -s) * size;
    let head = Complex::abs(front) * poly_scale(&design.low, s.re);
    let (value, bound) = tune(design, s, tolerance, false, head)?;
    Ok((front * poly(&design.low, s) + value, bound))
}

pub fn residue(design: &Design, m: usize, j: i64, tolerance: f64) -> Result<(Complex, f64)> {
    let base = design.base as f64;
    let (head, err) = tune(design, design.pole(0, j), tolerance, false, 0.0)?;
    let mut values = vec![head * (1.0 / base.ln())];
    let mut bounds = vec![err / base.ln()];
    for level in 1..=m {
        let w = design.pole(level, j);
        let mut acc = Complex::new(0.0, 0.0);
        let mut err = 0.0;
        let mut coefficient = Complex::new(1.0, 0.0);
        for l in 1..=level {
            coefficient = coefficient * ((-w) - (l as f64 - 1.0)) * (1.0 / l as f64);
            let weight = raise(base, (-w) - l as f64) * coefficient * design.gamma[l];
            acc = acc + weight * values[level - l];
            err += Complex::abs(weight)
                * (bounds[level - l] + ROUNDING * Complex::abs(values[level - l]));
        }
        let den = 1.0 - base.powi(level as i32);
        values.push(acc * (1.0 / den));
        bounds.push(err / den.abs());
    }
    Ok((values[m], bounds[m]))
}
