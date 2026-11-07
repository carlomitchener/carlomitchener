#![allow(clippy::needless_range_loop, clippy::chunks_exact_to_as_chunks)]

use mrly_error::{Result, value_error};
pub use mrly_linalg::*;

pub fn tridiagonalise(a: &mut [Vec<f64>], vectors: bool) -> (Vec<f64>, Vec<f64>) {
    let n = a.len();
    let mut d = vec![0.0; n];
    let mut e = vec![0.0; n];
    for i in (1..n).rev() {
        let l = i - 1;
        let mut h = 0.0;
        let mut scale = 0.0;
        if l > 0 {
            for k in 0..=l {
                scale += a[i][k].abs();
            }
        }
        if l == 0 || scale == 0.0 {
            e[i] = a[i][l];
            continue;
        }
        for k in 0..=l {
            a[i][k] /= scale;
            h += a[i][k] * a[i][k];
        }
        let mut f = a[i][l];
        let g = if f >= 0.0 { -h.sqrt() } else { h.sqrt() };
        e[i] = scale * g;
        h -= f * g;
        a[i][l] = f - g;
        f = 0.0;
        for j in 0..=l {
            if vectors {
                a[j][i] = a[i][j] / h;
            }
            let mut sum = 0.0;
            for k in 0..=j {
                sum += a[j][k] * a[i][k];
            }
            for k in (j + 1)..=l {
                sum += a[k][j] * a[i][k];
            }
            e[j] = sum / h;
            f += e[j] * a[i][j];
        }
        let hh = f / (h + h);
        for j in 0..=l {
            let f = a[i][j];
            let g = e[j] - hh * f;
            e[j] = g;
            for k in 0..=j {
                a[j][k] -= f * e[k] + g * a[i][k];
            }
        }
        d[i] = h;
    }
    e[0] = 0.0;
    if !vectors {
        for i in 0..n {
            d[i] = a[i][i];
        }
        return (d, e);
    }
    if n > 0 {
        d[0] = 0.0;
    }
    for i in 0..n {
        if d[i] != 0.0 {
            for j in 0..i {
                let mut g = 0.0;
                for k in 0..i {
                    g += a[i][k] * a[k][j];
                }
                for k in 0..i {
                    a[k][j] -= g * a[k][i];
                }
            }
        }
        d[i] = a[i][i];
        a[i][i] = 1.0;
        for j in 0..i {
            a[j][i] = 0.0;
            a[i][j] = 0.0;
        }
    }
    (d, e)
}

pub fn implicit_ql(d: &mut [f64], e: &mut [f64], mut z: Option<&mut [Vec<f64>]>) -> Result<()> {
    let n = d.len();
    for i in 1..n {
        e[i - 1] = e[i];
    }
    if n > 0 {
        e[n - 1] = 0.0;
    }
    for l in 0..n {
        let mut sweeps = 0;
        loop {
            let mut m = l;
            while m + 1 < n {
                let dd = d[m].abs() + d[m + 1].abs();
                if e[m].abs() <= f64::EPSILON * dd {
                    break;
                }
                m += 1;
            }
            if m == l {
                break;
            }
            sweeps += 1;
            if sweeps > SWEEPS {
                return value_error("The QL iteration did not converge.");
            }
            let mut g = (d[l + 1] - d[l]) / (2.0 * e[l]);
            let mut r = g.hypot(1.0);
            g = d[m] - d[l] + e[l] / (g + if g >= 0.0 { r.abs() } else { -r.abs() });
            let mut s = 1.0;
            let mut c = 1.0;
            let mut p = 0.0;
            let mut underflow = false;
            let mut i = m;
            while i > l {
                i -= 1;
                let f = s * e[i];
                let b = c * e[i];
                r = f.hypot(g);
                e[i + 1] = r;
                if r == 0.0 {
                    d[i + 1] -= p;
                    e[m] = 0.0;
                    underflow = true;
                    break;
                }
                s = f / r;
                c = g / r;
                g = d[i + 1] - p;
                r = (d[i] - g) * s + 2.0 * c * b;
                p = s * r;
                d[i + 1] = g + p;
                g = c * r - b;
                if let Some(z) = z.as_deref_mut() {
                    let (low, high) = z.split_at_mut(i + 1);
                    for (u, w) in low[i].iter_mut().zip(high[0].iter_mut()) {
                        let f = *w;
                        *w = s * *u + c * f;
                        *u = c * *u - s * f;
                    }
                }
            }
            if underflow {
                continue;
            }
            d[l] -= p;
            e[l] = g;
            e[m] = 0.0;
        }
    }
    Ok(())
}

pub fn below(rows: &[Vec<(usize, f64)>], shift: f64) -> usize {
    let mut band = Band::new(rows, shift);
    let mut pivots = vec![0.0; band.n];
    let mut scaled = vec![0.0; band.width];
    let mut negative = 0;
    for i in 0..band.n {
        let first = band.first(i);
        let row = band.at(i, first);
        for t in 0..i - first {
            let near = band.at(first + t, first);
            scaled[t] = band.cells[row + t] - dot(&scaled[..t], &band.cells[near..near + t]);
        }
        let mut pivot = band.pivot(i);
        for t in 0..i - first {
            let unit = scaled[t] / pivots[first + t];
            band.cells[row + t] = unit;
            pivot -= scaled[t] * unit;
        }
        if pivot == 0.0 {
            pivot = f64::EPSILON;
        }
        pivots[i] = pivot;
        negative += usize::from(pivot < 0.0);
    }
    negative
}

const SWEEPS: usize = 60;

struct Band {
    n: usize,
    width: usize,
    cells: Vec<f64>,
}

fn dot(a: &[f64], b: &[f64]) -> f64 {
    let mut acc = [0.0; 4];
    let (x, y) = (a.chunks_exact(4), b.chunks_exact(4));
    let tail: f64 = x
        .remainder()
        .iter()
        .zip(y.remainder())
        .map(|(p, q)| p * q)
        .sum();
    for (p, q) in x.zip(y) {
        for t in 0..4 {
            acc[t] += p[t] * q[t];
        }
    }
    (acc[0] + acc[1]) + (acc[2] + acc[3]) + tail
}

impl Band {
    fn new(rows: &[Vec<(usize, f64)>], shift: f64) -> Band {
        let n = rows.len();
        let width = rows
            .iter()
            .enumerate()
            .flat_map(|(i, row)| row.iter().filter(move |e| e.0 < i).map(move |e| i - e.0))
            .max()
            .unwrap_or(0);
        let span = width + 1;
        let mut cells = vec![0.0; n * span];
        for (i, row) in rows.iter().enumerate() {
            for &(j, value) in row {
                if j <= i {
                    cells[i * span + width + j - i] += value;
                }
            }
            cells[i * span + width] -= shift;
        }
        Band { n, width, cells }
    }

    fn first(&self, i: usize) -> usize {
        i.saturating_sub(self.width)
    }

    fn at(&self, i: usize, j: usize) -> usize {
        i * (self.width + 1) + self.width + j - i
    }

    fn pivot(&self, i: usize) -> f64 {
        self.cells[self.at(i, i)]
    }
}
