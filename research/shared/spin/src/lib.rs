use mrly_error::{Result, shape_error};
pub use mrly_spin::*;
use std::f64::consts::PI;

pub fn arcs(data: &[f32], size: usize, radius: f64) -> Result<Vec<(f64, f64, f32)>> {
    if data.len() != size * size {
        return shape_error(format!(
            "a raster of side {size} needs {} samples, got {}.",
            size * size,
            data.len()
        ));
    }
    if size == 0 {
        return Ok(Vec::new());
    }
    let c = centre(size);
    let r = radius.max(1e-9);
    let mut cuts = vec![0.0, 2.0 * PI];
    let low = (c - r).floor().max(0.0) as usize;
    let high = ((c + r).ceil() as usize).min(size);
    for line in low..=high {
        let u = (line as f64 - c) / r;
        if u.abs() < 1.0 {
            let a = u.acos();
            cuts.push(a);
            cuts.push(2.0 * PI - a);
            let b = u.asin();
            cuts.push(b.rem_euclid(2.0 * PI));
            cuts.push((PI - b).rem_euclid(2.0 * PI));
        }
    }
    cuts.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mut out = Vec::with_capacity(cuts.len());
    for pair in cuts.windows(2) {
        let (a, b) = (pair[0], pair[1]);
        if b <= a {
            continue;
        }
        let mid = (a + b) / 2.0;
        let x = c + r * mid.cos();
        let y = c + r * mid.sin();
        let mut value = 0.0;
        if x >= 0.0 && y >= 0.0 {
            let (col, row) = (x as usize, y as usize);
            if col < size && row < size {
                value = data[row * size + col];
            }
        }
        out.push((a, b, value));
    }
    Ok(out)
}

pub fn mass_within(profile: &[f32], size: usize, radius: f64) -> f64 {
    let last = profile.len().saturating_sub(1);
    if last == 0 || radius <= 0.0 {
        return 0.0;
    }
    let step = reach(size) / last as f64;
    let weight = |k: usize| 2.0 * PI * (k as f64 * step) * profile[k] as f64;
    let full = (radius / step).floor().min(last as f64) as usize;
    let mut total = 0.0;
    for k in 1..=full {
        total += (weight(k - 1) + weight(k)) / 2.0 * step;
    }
    if full < last {
        let rest = radius - full as f64 * step;
        let share = rest / step;
        let edge = weight(full) + (weight(full + 1) - weight(full)) * share;
        total += (weight(full) + edge) / 2.0 * rest;
    }
    total
}

fn centre(size: usize) -> f64 {
    size as f64 / 2.0
}
