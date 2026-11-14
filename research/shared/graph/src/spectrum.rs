#![allow(clippy::needless_range_loop)]
use linalg::{implicit_ql, tridiagonalise};
use mrly_error::{Result, value_error};
pub use mrly_graph::spectrum::*;
use std::cmp::Ordering;

const ZERO: f64 = 1e-12;

pub fn symmetric_eigenvalues(matrix: &[Vec<f64>]) -> Result<Vec<f64>> {
    let n = matrix.len();
    for row in matrix {
        if row.len() != n {
            return value_error("The matrix is not square.");
        }
    }
    for i in 0..n {
        for j in (i + 1)..n {
            if (matrix[i][j] - matrix[j][i]).abs() > ZERO {
                return value_error(format!("The matrix is not symmetric at {i}, {j}."));
            }
        }
    }
    let mut work: Vec<Vec<f64>> = matrix.to_vec();
    let (mut d, mut e) = tridiagonalise(&mut work, false);
    implicit_ql(&mut d, &mut e, None)?;
    if d.iter().any(|v| v.is_nan()) {
        return value_error("The spectrum is not a number; the matrix carries a NaN or overflows.");
    }
    d.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    Ok(d)
}

pub fn clusters(eigenvalues: &[f64], tolerance: f64) -> Result<Vec<(f64, usize)>> {
    if eigenvalues.iter().any(|v| v.is_nan()) {
        return value_error("The eigenvalues hold a NaN.");
    }
    let mut values = eigenvalues.to_vec();
    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    let mut groups = Vec::new();
    let mut start = 0;
    for index in 1..=values.len() {
        if index == values.len() || values[index] - values[index - 1] > tolerance {
            let run = &values[start..index];
            groups.push((run.iter().sum::<f64>() / run.len() as f64, run.len()));
            start = index;
        }
    }
    Ok(groups)
}

pub fn multiplicity(eigenvalues: &[f64], value: f64, tolerance: f64) -> usize {
    eigenvalues
        .iter()
        .filter(|v| (**v - value).abs() <= tolerance)
        .count()
}

pub fn spectral_points(eigenvalues: &[f64]) -> Vec<(f64, f64)> {
    let mut values: Vec<f64> = eigenvalues.iter().map(|&v| v.max(0.0)).collect();
    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    let total = values.len();
    let mut points = Vec::new();
    let mut index = 0;
    while index < total {
        let mut last = index;
        while last + 1 < total && values[last + 1] == values[index] {
            last += 1;
        }
        if values[last] > ZERO {
            points.push((values[last], (last + 1) as f64 / total as f64));
        }
        index = last + 1;
    }
    points
}

pub fn spectral_fit(eigenvalues: &[f64], window: f64) -> Option<(f64, f64, usize)> {
    let points = spectral_points(eigenvalues);
    let xs: Vec<f64> = points.iter().map(|p| p.0.ln()).collect();
    let ys: Vec<f64> = points.iter().map(|p| p.1.ln()).collect();
    let top = ((window * eigenvalues.len() as f64).floor() as usize)
        .max(3)
        .min(xs.len());
    if top < 2 {
        return None;
    }
    let count = top as f64;
    let mean_x: f64 = xs[..top].iter().sum::<f64>() / count;
    let mean_y: f64 = ys[..top].iter().sum::<f64>() / count;
    let covariance: f64 = xs[..top]
        .iter()
        .zip(&ys[..top])
        .map(|(x, y)| (x - mean_x) * (y - mean_y))
        .sum();
    let variance: f64 = xs[..top].iter().map(|x| (x - mean_x) * (x - mean_x)).sum();
    if variance == 0.0 {
        return None;
    }
    let slope = covariance / variance;
    Some((mean_y - slope * mean_x, slope, top))
}

pub fn spectral_exponent(eigenvalues: &[f64], window: f64) -> Option<f64> {
    spectral_fit(eigenvalues, window).map(|(_, slope, _)| 2.0 * slope)
}
