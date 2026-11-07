pub mod memory;

use crate::memory::{transfer, Rule};
use mrly_error::{value_error, Result};
use mrly_num::complex::{raise, Complex};
use serde::{Deserialize, Serialize};

pub const ROUNDING: f64 = 1e-13;

const PEEL_TARGET: f64 = 100.0;
const PEEL_CAP: usize = 26;
const SHIFT_START: f64 = 6.0;
const SHIFT_STEP: f64 = 6.0;
const SHIFT_CAP: f64 = 400.0;
const CUT_START: usize = 8;
const CUT_STEP: usize = 6;
const CUT_CAP: usize = 120;
const RATIO_CAP: f64 = 0.9;
const COLLATZ_WIELANDT: usize = 60;
const PIVOT_FLOOR: f64 = 1e-12;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Automaton {
    rule: Rule,
    base: u64,
    states: usize,
    peel: usize,
    largest: u64,
    arcs: Vec<(usize, usize, u64)>,
    power: Vec<Vec<f64>>,
    low: Vec<f64>,
    mid: Vec<Vec<f64>>,
    seats: Vec<f64>,
    guide: Vec<f64>,
    perron_high: f64,
    perron_low: f64,
    charpoly: Vec<f64>,
    adjugate: Vec<Vec<Vec<f64>>>,
}

fn walk_words(
    rule: &Rule,
    base: u64,
    depth: usize,
    word: &mut Vec<usize>,
    visit: &mut impl FnMut(usize, usize, u64),
) {
    if word.len() >= depth {
        return;
    }
    let start = usize::from(word.is_empty());
    for c in start..rule.letters() {
        word.push(c);
        if rule.accepts(word) {
            let value = word.iter().fold(0u64, |acc, &d| acc * base + d as u64);
            let span = word.len() - (rule.width - 1).min(word.len());
            let state = word[span..]
                .iter()
                .fold(0usize, |acc, &d| acc * base as usize + d);
            visit(word.len(), state, value);
            walk_words(rule, base, depth, word, visit);
        }
        word.pop();
    }
}

impl Automaton {
    pub fn new(rule: &Rule) -> Result<Automaton> {
        let mut peel = rule.width.max(2);
        let base = rule.letters() as u64;
        while peel < PEEL_CAP && (base as f64).powi(peel as i32 + 1) < 9.0e15 {
            let mut seen = 0f64;
            let mut word = Vec::new();
            walk_words(rule, base, peel, &mut word, &mut |len, _, _| {
                if len == peel {
                    seen += 1.0;
                }
            });
            if seen > PEEL_TARGET {
                break;
            }
            peel += 1;
        }
        Automaton::with_peel(rule, peel)
    }

    pub fn with_peel(rule: &Rule, peel: usize) -> Result<Automaton> {
        let base = rule.letters() as u64;
        let states = rule.states();
        if peel < rule.width.max(2) {
            return value_error(format!(
                "peel depth {peel} is under the rule width {} or under two.",
                rule.width
            ));
        }
        if (base as f64).powi(peel as i32) > 9.007_199_254_740_992e15 {
            return value_error(format!("peel depth {peel} overruns the exact integers."));
        }
        let source = transfer(rule);
        let mut arcs: Vec<(usize, usize, u64)> = Vec::new();
        if rule.width == 1 {
            for c in 0..rule.letters() {
                if rule.allowed(c) {
                    arcs.push((0, 0, c as u64));
                }
            }
        } else {
            for s in 0..source.len() {
                for c in 0..rule.letters() {
                    let window = (s << rule.dimension) | c;
                    if rule.allowed(window) {
                        arcs.push((window & (states - 1), s, c as u64));
                    }
                }
            }
        }
        let largest = arcs.iter().map(|&(_, _, a)| a).max().unwrap_or(0);
        let power: Vec<Vec<f64>> = (0..base)
            .map(|a| (0..=CUT_CAP).map(|l| (a as f64).powi(l as i32)).collect())
            .collect();
        let mut low: Vec<f64> = Vec::new();
        let mut mid: Vec<Vec<f64>> = vec![Vec::new(); states];
        let mut seats = vec![0.0f64; states];
        let mut word = Vec::new();
        walk_words(rule, base, peel, &mut word, &mut |len, state, value| {
            if len < peel {
                low.push((value as f64).ln());
            } else {
                mid[state].push((value as f64).ln());
                seats[state] += 1.0;
            }
        });
        if low.is_empty() && seats.iter().all(|&c| c == 0.0) {
            return value_error("the rule accepts no element with a nonzero leading digit.");
        }
        let mut ladder = Automaton {
            rule: *rule,
            base,
            states,
            peel,
            largest,
            arcs,
            power,
            low,
            mid,
            seats,
            guide: vec![1.0; states],
            perron_high: 0.0,
            perron_low: 0.0,
            charpoly: Vec::new(),
            adjugate: Vec::new(),
        };
        ladder.tighten();
        ladder.faddeev();
        Ok(ladder)
    }

    fn tighten(&mut self) {
        let mut guide = vec![1.0f64; self.states];
        for _ in 0..COLLATZ_WIELANDT {
            let next = self.step_real(0, &guide);
            let peak = next.iter().cloned().fold(0.0f64, f64::max);
            if peak > 1e120 {
                break;
            }
            for (seat, &gain) in guide.iter_mut().zip(next.iter()) {
                *seat += gain;
            }
        }
        let image = self.step_real(0, &guide);
        let mut high = 0.0f64;
        let mut low = f64::INFINITY;
        for (&gain, &seat) in image.iter().zip(guide.iter()) {
            high = high.max(gain / seat);
            low = low.min(gain / seat);
        }
        self.guide = guide;
        self.perron_high = high * (1.0 + 1e-14) + 1e-300;
        self.perron_low = low * (1.0 - 1e-14);
    }

    fn step_real(&self, power: usize, vector: &[f64]) -> Vec<f64> {
        let mut out = vec![0.0f64; self.states];
        for &(t, s, a) in &self.arcs {
            out[t] += self.power[a as usize][power] * vector[s];
        }
        out
    }

    fn step_complex(&self, power: usize, vector: &[Complex]) -> Vec<Complex> {
        let mut out = vec![Complex::new(0.0, 0.0); self.states];
        for &(t, s, a) in &self.arcs {
            out[t] = out[t] + vector[s] * self.power[a as usize][power];
        }
        out
    }

    pub fn rule(&self) -> Rule {
        self.rule
    }

    pub fn base(&self) -> u64 {
        self.base
    }

    pub fn states(&self) -> usize {
        self.states
    }

    pub fn peel(&self) -> usize {
        self.peel
    }

    pub fn matrix(&self) -> Vec<Vec<f64>> {
        let mut out = vec![vec![0.0f64; self.states]; self.states];
        for &(t, s, _) in &self.arcs {
            out[t][s] += 1.0;
        }
        out
    }

    pub fn perron(&self) -> (f64, f64) {
        (self.perron_low, self.perron_high)
    }

    pub fn abscissa(&self) -> f64 {
        let root = crate::memory::perron(&self.rule);
        if root <= 0.0 {
            return f64::NEG_INFINITY;
        }
        root.ln() / (self.base as f64).ln()
    }

    pub fn period(&self) -> f64 {
        2.0 * std::f64::consts::PI / (self.base as f64).ln()
    }
}

fn invert(matrix: &[Vec<Complex>]) -> Option<Vec<Vec<Complex>>> {
    let n = matrix.len();
    let mut a: Vec<Vec<Complex>> = matrix.to_vec();
    let mut b: Vec<Vec<Complex>> = (0..n)
        .map(|i| {
            (0..n)
                .map(|j| Complex::new(f64::from(u8::from(i == j)), 0.0))
                .collect()
        })
        .collect();
    let scale = matrix
        .iter()
        .flat_map(|row| row.iter())
        .map(|z| Complex::abs(*z))
        .fold(0.0f64, f64::max)
        .max(1.0);
    for col in 0..n {
        let mut pick = col;
        for row in col + 1..n {
            if Complex::abs(a[row][col]) > Complex::abs(a[pick][col]) {
                pick = row;
            }
        }
        if Complex::abs(a[pick][col]) < PIVOT_FLOOR * scale {
            return None;
        }
        a.swap(col, pick);
        b.swap(col, pick);
        let inv = Complex::new(1.0, 0.0) / a[col][col];
        for j in 0..n {
            a[col][j] = a[col][j] * inv;
            b[col][j] = b[col][j] * inv;
        }
        let prow = a[col].clone();
        let qrow = b[col].clone();
        for row in 0..n {
            if row == col {
                continue;
            }
            let factor = a[row][col];
            if Complex::abs(factor) == 0.0 {
                continue;
            }
            for j in 0..n {
                a[row][j] = a[row][j] - factor * prow[j];
                b[row][j] = b[row][j] - factor * qrow[j];
            }
        }
    }
    Some(b)
}

fn log_binomial(top: f64, pick: usize) -> f64 {
    (1..=pick)
        .map(|i| ((top - pick as f64 + i as f64) / i as f64).ln())
        .sum()
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

struct Rung {
    value: Vec<Complex>,
    bound: Vec<f64>,
    scale: Vec<f64>,
}

impl Automaton {
    fn neumann(&self, sigma: f64, seed: &[f64]) -> Option<Vec<f64>> {
        let base = self.base as f64;
        let theta = base.powf(-sigma) * self.perron_high;
        if theta >= 1.0 {
            return None;
        }
        let factor = base.powf(-sigma);
        let beta = seed
            .iter()
            .zip(self.guide.iter())
            .map(|(&y, &v)| y / v)
            .fold(0.0f64, f64::max);
        let mut out = vec![0.0f64; self.states];
        let mut term = seed.to_vec();
        let mut power = 1.0f64;
        for _ in 0..4000 {
            for (seat, &gain) in out.iter_mut().zip(term.iter()) {
                *seat += gain;
            }
            term = self
                .step_real(0, &term)
                .iter()
                .map(|&v| v * factor)
                .collect();
            power *= theta;
            let peak = out.iter().cloned().fold(0.0f64, f64::max);
            if beta * power <= 1e-18 * (1.0 - theta) * peak || term.iter().all(|&v| v == 0.0) {
                break;
            }
        }
        let rest = beta * power / (1.0 - theta);
        for (seat, &v) in out.iter_mut().zip(self.guide.iter()) {
            *seat += rest * v;
        }
        Some(out)
    }

    fn tail_parts(&self, sigma: f64) -> Option<(f64, Vec<f64>)> {
        let mass = self.neumann(sigma, &self.seats)?;
        let log = -(self.peel as f64 - 1.0) * sigma * (self.base as f64).ln();
        Some((log, mass))
    }

    fn tail(&self, sigma: f64) -> Option<Vec<f64>> {
        let (log, mass) = self.tail_parts(sigma)?;
        Some(mass.iter().map(|&m| log.exp() * m).collect())
    }

    fn cut(&self, w: Complex, depth: usize) -> Vec<f64> {
        let blown = vec![f64::INFINITY; self.states];
        if self.largest == 0 {
            return vec![0.0; self.states];
        }
        let (span, sigma) = (Complex::abs(w), w.re);
        let base = self.base as f64;
        let largest = self.largest as f64;
        let ratio = ((span + depth as f64 + 1.0) / (depth as f64 + 2.0)).max(1.0) * largest
            / base.powi(self.peel as i32);
        if ratio >= RATIO_CAP {
            return blown;
        }
        let Some((rest, mass)) = self.tail_parts(sigma + depth as f64 + 1.0) else {
            return blown;
        };
        let log = log_binomial(span + depth as f64, depth + 1)
            + (-sigma - depth as f64 - 1.0) * base.ln()
            + (depth as f64 + 1.0) * largest.ln()
            + rest;
        let front = self.step_real(0, &mass);
        front
            .iter()
            .map(|&m| log.exp() * m / (1.0 - ratio))
            .collect()
    }

    fn divide(&self, w: Complex, acc: &[Complex], err: &[f64], wide: &[f64]) -> Option<Rung> {
        let base = self.base as f64;
        let x = raise(base, -w);
        let front: Vec<Vec<Complex>> = self
            .matrix()
            .iter()
            .enumerate()
            .map(|(i, row)| {
                row.iter()
                    .enumerate()
                    .map(|(j, &t)| Complex::new(f64::from(u8::from(i == j)), 0.0) - x * t)
                    .collect()
            })
            .collect();
        let inverse = invert(&front)?;
        let value: Vec<Complex> = inverse
            .iter()
            .map(|row| {
                row.iter()
                    .zip(acc.iter())
                    .fold(Complex::new(0.0, 0.0), |a, (&c, &y)| a + c * y)
            })
            .collect();
        let carry = |seed: &[f64]| -> Option<Vec<f64>> {
            if let Some(out) = self.neumann(w.re, seed) {
                return Some(out);
            }
            let mut residual = 0.0f64;
            for (i, source) in front.iter().enumerate() {
                let mut row = 0.0f64;
                for j in 0..self.states {
                    let mut entry = Complex::new(f64::from(u8::from(i == j)), 0.0);
                    for (&near, image) in source.iter().zip(inverse.iter()) {
                        entry = entry - near * image[j];
                    }
                    row += Complex::abs(entry);
                }
                residual = residual.max(row);
            }
            if residual >= 1.0 {
                return None;
            }
            let peak = seed.iter().cloned().fold(0.0f64, f64::max);
            let lift = peak * residual / (1.0 - residual);
            Some(
                inverse
                    .iter()
                    .map(|row| {
                        row.iter()
                            .zip(seed.iter())
                            .map(|(&c, &y)| Complex::abs(c) * (y + lift))
                            .sum()
                    })
                    .collect(),
            )
        };
        Some(Rung {
            value,
            bound: carry(err)?,
            scale: carry(wide)?,
        })
    }

    fn rung(&self, s: Complex, shift: f64, depth: usize, whole: bool) -> Option<Rung> {
        let base = self.base as f64;
        let levels = (shift - s.re).ceil().max(0.0) as usize;
        if !whole && levels == 0 {
            let rest = self.tail(s.re)?;
            let lift = self.step_real(0, &rest);
            let factor = base.powf(-s.re);
            let out: Vec<f64> = rest
                .iter()
                .zip(lift.iter())
                .map(|(&r, &l)| r + factor * l)
                .collect();
            return Some(Rung {
                value: vec![Complex::new(0.0, 0.0); self.states],
                bound: out.clone(),
                scale: out,
            });
        }
        let rows = levels + depth + 2;
        let mut value = vec![vec![Complex::new(0.0, 0.0); self.states]; rows];
        let mut bound = vec![vec![0.0f64; self.states]; rows];
        let mut scale = vec![vec![0.0f64; self.states]; rows];
        for j in levels..rows {
            let rest = self.tail(s.re + j as f64)?;
            bound[j] = rest.clone();
            scale[j] = rest;
        }
        for j in (0..levels).rev() {
            let w = s + j as f64;
            let mut acc: Vec<Complex> = self
                .mid
                .iter()
                .map(|logs| poly(logs, w))
                .collect::<Vec<Complex>>();
            let mut err = self.cut(w, depth);
            let mut wide: Vec<f64> = self
                .mid
                .iter()
                .map(|logs| poly_scale(logs, w.re))
                .zip(err.iter())
                .map(|(p, &e)| p + e)
                .collect();
            let mut coefficient = Complex::new(1.0, 0.0);
            for l in 1..=depth {
                coefficient = coefficient * ((-w) - (l as f64 - 1.0)) * (1.0 / l as f64);
                let weight = raise(base, (-w) - l as f64) * coefficient;
                let lift = self.step_complex(l, &value[j + l]);
                let heavy = self.step_real(l, &bound[j + l]);
                let broad = self.step_real(l, &scale[j + l]);
                for u in 0..self.states {
                    acc[u] = acc[u] + weight * lift[u];
                    err[u] += Complex::abs(weight) * heavy[u];
                    wide[u] += Complex::abs(weight) * broad[u];
                }
            }
            if !whole && j == 0 {
                return Some(Rung {
                    value: acc,
                    bound: err,
                    scale: wide,
                });
            }
            let step = self.divide(w, &acc, &err, &wide)?;
            value[j] = step.value;
            bound[j] = step.bound;
            scale[j] = step.scale;
        }
        Some(Rung {
            value: value[0].clone(),
            bound: bound[0].clone(),
            scale: scale[0].clone(),
        })
    }

    fn tune(
        &self,
        s: Complex,
        tolerance: f64,
        whole: bool,
        head: f64,
    ) -> Result<(Vec<Complex>, Vec<f64>)> {
        let mut shift = SHIFT_START;
        let mut depth = CUT_START;
        let mut best = f64::INFINITY;
        let mut walked = false;
        while shift <= SHIFT_CAP && depth <= CUT_CAP {
            if let Some(step) = self.rung(s, shift, depth, whole) {
                let carried: Vec<f64> = step
                    .bound
                    .iter()
                    .zip(step.scale.iter())
                    .map(|(&b, &c)| b + ROUNDING * c)
                    .collect();
                let total: f64 = carried.iter().sum::<f64>() + ROUNDING * head;
                if total < tolerance {
                    return Ok((step.value, carried));
                }
                best = best.min(total);
            } else {
                walked = true;
            }
            shift += SHIFT_STEP;
            depth += CUT_STEP;
        }
        if walked {
            return value_error(format!(
                "the ladder cannot invert I - q^(-w) T on the walk up from s = {} + {}i: a level sits on a pole of the resolvent or left of the abscissa with no certified inverse.",
                s.re, s.im
            ));
        }
        value_error(format!(
            "tolerance {tolerance:e} is out of reach at s = {} + {}i, best bound {best:e}.",
            s.re, s.im
        ))
    }
}

impl Automaton {
    fn faddeev(&mut self) {
        let n = self.states;
        let matrix = self.matrix();
        let mut blocks: Vec<Vec<Vec<f64>>> = Vec::with_capacity(n);
        let mut coefficients = vec![1.0f64];
        let mut current: Vec<Vec<f64>> = (0..n)
            .map(|i| (0..n).map(|j| f64::from(u8::from(i == j))).collect())
            .collect();
        for k in 1..=n {
            blocks.push(current.clone());
            let mut product = vec![vec![0.0f64; n]; n];
            for i in 0..n {
                for t in 0..n {
                    if matrix[i][t] == 0.0 {
                        continue;
                    }
                    for j in 0..n {
                        product[i][j] += matrix[i][t] * current[t][j];
                    }
                }
            }
            let trace: f64 = (0..n).map(|i| product[i][i]).sum();
            let coefficient = -trace / k as f64;
            coefficients.push(coefficient);
            for (i, row) in product.iter_mut().enumerate() {
                row[i] += coefficient;
            }
            current = product;
        }
        self.charpoly = coefficients;
        self.adjugate = blocks;
    }

    pub fn denominator(&self) -> Vec<f64> {
        self.charpoly.clone()
    }

    fn det(&self, x: Complex) -> Complex {
        let mut acc = Complex::new(0.0, 0.0);
        let mut power = Complex::new(1.0, 0.0);
        for &c in &self.charpoly {
            acc = acc + power * c;
            power = power * x;
        }
        acc
    }

    fn det_slope(&self, x: Complex) -> Complex {
        let mut acc = Complex::new(0.0, 0.0);
        let mut power = Complex::new(1.0, 0.0);
        for (k, &c) in self.charpoly.iter().enumerate().skip(1) {
            acc = acc + power * (c * k as f64);
            power = power * x;
        }
        acc
    }

    fn adjugate_apply(&self, x: Complex, vector: &[Complex]) -> Vec<Complex> {
        let mut out = vec![Complex::new(0.0, 0.0); self.states];
        let mut power = Complex::new(1.0, 0.0);
        for block in &self.adjugate {
            for (i, row) in block.iter().enumerate() {
                for (j, &entry) in row.iter().enumerate() {
                    if entry != 0.0 {
                        out[i] = out[i] + power * entry * vector[j];
                    }
                }
            }
            power = power * x;
        }
        out
    }

    fn adjugate_weights(&self, radius: f64) -> Vec<f64> {
        let mut out = vec![0.0f64; self.states];
        let mut power = 1.0f64;
        for block in &self.adjugate {
            for row in block.iter() {
                for (j, &entry) in row.iter().enumerate() {
                    out[j] += power * entry.abs();
                }
            }
            power *= radius;
        }
        out
    }
}

impl Automaton {
    pub fn zeta(&self, s: Complex, tolerance: f64) -> Result<(Complex, f64)> {
        let head = poly_scale(&self.low, s.re);
        let (value, carried) = self.tune(s, tolerance, true, head)?;
        let sum = value.iter().fold(Complex::new(0.0, 0.0), |acc, &z| acc + z);
        let bound = carried.iter().sum::<f64>() + ROUNDING * head;
        Ok((poly(&self.low, s) + sum, bound))
    }

    pub fn cofactor(&self, s: Complex, tolerance: f64) -> Result<(Complex, f64)> {
        let x = raise(self.base as f64, -s);
        let det = self.det(x);
        let head = Complex::abs(det) * poly_scale(&self.low, s.re);
        let (value, carried) = self.tune(s, tolerance, false, head)?;
        let lifted = self.adjugate_apply(x, &value);
        let sum = lifted
            .iter()
            .fold(Complex::new(0.0, 0.0), |acc, &z| acc + z);
        let weights = self.adjugate_weights(Complex::abs(x));
        let bound = weights
            .iter()
            .zip(carried.iter())
            .map(|(&m, &b)| m * b)
            .sum::<f64>()
            + ROUNDING * head;
        Ok((det * poly(&self.low, s) + sum, bound))
    }

    pub fn residue(&self, w0: Complex, tolerance: f64) -> Result<(Complex, f64)> {
        let base = self.base as f64;
        let x = raise(base, -w0);
        let slope = self.det_slope(x);
        let den = -x * base.ln() * slope;
        if Complex::abs(self.det(x))
            > 1e-8 * self.charpoly.iter().map(|c| c.abs()).sum::<f64>().max(1.0)
        {
            return value_error(format!(
                "w0 = {} + {}i is not a root of det(I - q^(-w) T).",
                w0.re, w0.im
            ));
        }
        if Complex::abs(den) < 1e-12 {
            return value_error(format!(
                "the root at w0 = {} + {}i is not simple, so the pole order exceeds one.",
                w0.re, w0.im
            ));
        }
        let (value, carried) = self.tune(w0, tolerance, false, 0.0)?;
        let lifted = self.adjugate_apply(x, &value);
        let sum = lifted
            .iter()
            .fold(Complex::new(0.0, 0.0), |acc, &z| acc + z);
        let weights = self.adjugate_weights(Complex::abs(x));
        let bound = weights
            .iter()
            .zip(carried.iter())
            .map(|(&m, &b)| m * b)
            .sum::<f64>()
            / Complex::abs(den);
        Ok((sum / den, bound))
    }
}
