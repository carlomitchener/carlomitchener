use mrly_error::{Result, value_error};
use mrly_moire::{Lattice, Layer, Spec, layer};
use num::factor::lcm;
use serde::{Deserialize, Serialize};

fn odd_blocks(span: u64, block: u64) -> u64 {
    block * (span / (2 * block)) + (span % (2 * block)).saturating_sub(block)
}

fn overlap(m: u64, n: u64) -> (u64, u64) {
    let grid = lcm(m as usize, n as usize) as u64;
    let (a, b) = (grid / m, grid / n);
    let both = (1..n)
        .step_by(2)
        .map(|k| odd_blocks((k + 1) * b, a) - odd_blocks(k * b, a))
        .sum();
    (both, grid)
}

pub fn correlation(m: usize, n: usize) -> f64 {
    let (m, n) = (m as u64, n as u64);
    let (hm, hn) = (m / 2, n / 2);
    if hm == 0 || hn == 0 {
        return 0.0;
    }
    let (both, grid) = overlap(m, n);
    let cross = (both * m * n) as i128;
    let solo = (hm * hn * grid) as i128;
    let gap = cross - solo;
    if gap == 0 {
        return 0.0;
    }
    let scale = (grid * m * n) as f64;
    let covariance = (gap as f64 / scale) * ((cross + solo) as f64 / scale);
    let variance = |half: u64, side: u64| {
        let share = (half * half) as f64 / (side * side) as f64;
        share * (1.0 - share)
    };
    covariance / (variance(hm, m) * variance(hn, n)).sqrt()
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Witness {
    pub scale: usize,
    pub scales: Vec<usize>,
    pub row: Vec<f64>,
    pub max: f64,
    pub at: usize,
    pub prime: bool,
}

pub fn witness(scale: usize) -> Result<Witness> {
    if scale < 3 || scale.is_multiple_of(2) {
        return value_error("the stack has odd scales from three.");
    }
    let scales: Vec<usize> = (3..scale).step_by(2).collect();
    let row: Vec<f64> = scales.iter().map(|&m| correlation(m, scale)).collect();
    let (mut max, mut at) = (0.0, 0);
    for (&m, &r) in scales.iter().zip(&row) {
        if r > max {
            (max, at) = (r, m);
        }
    }
    let prime = row.iter().all(|&r| r == 0.0);
    Ok(Witness {
        scale,
        scales,
        row,
        max,
        at,
        prime,
    })
}

pub fn sampled(m: usize, n: usize) -> Result<f64> {
    if m == 0 || n == 0 {
        return value_error("a sampled pair needs two scales of at least one.");
    }
    let size = lcm(m, n);
    let mask = |number| {
        let params = Layer {
            spec: Spec::new(7, 2, 2),
            number,
            level: 1,
            lattice: Lattice::Square,
            size,
            slices: Vec::new(),
        };
        layer(&params)
    };
    let (a, b) = (mask(m)?, mask(n)?);
    let mean = |v: &[bool]| v.iter().filter(|&&x| x).count() as f64 / v.len() as f64;
    let (ea, eb) = (mean(&a), mean(&b));
    let eab = a.iter().zip(&b).filter(|&(&x, &y)| x && y).count() as f64 / a.len() as f64;
    Ok((eab - ea * eb) / (ea * (1.0 - ea) * eb * (1.0 - eb)).sqrt())
}
