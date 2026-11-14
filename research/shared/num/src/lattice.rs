use crate::factor::totients;
use crate::series;
use mrly_error::{Result, value_error};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

pub fn coprime_pairs(n: usize) -> u64 {
    if n == 0 {
        return 0;
    }
    2 * totients(n)[1..].iter().sum::<u64>() - 1
}

pub fn pi_estimate(n: usize) -> f64 {
    let density = coprime_pairs(n) as f64 / (n as f64 * n as f64);
    (6.0 / density).sqrt()
}

pub fn zeta_factor(dimension: u32) -> Option<f64> {
    if dimension == 0 || !dimension.is_multiple_of(2) || dimension > 12 {
        return None;
    }
    let d = dimension as usize;
    let (num, den) = mrly_num::series::bernoulli(d + 1).ok()?[d];
    let sign = if (d / 2).is_multiple_of(2) { -1.0 } else { 1.0 };
    let factorial = (1..=d).fold(1.0f64, |out, k| out * k as f64);
    Some(sign * (num as f64 / den as f64) * 2f64.powi(d as i32) / (2.0 * factorial))
}

pub fn zeta_whole(s: u32) -> Result<f64> {
    if s <= 1 {
        return value_error(format!("zeta needs a whole argument above one, not {s}."));
    }
    match zeta_factor(s) {
        Some(factor) => Ok(factor * PI.powi(s as i32)),
        None => series::zeta(f64::from(s), 20_000),
    }
}

pub fn visible_density(dimension: u32) -> Result<f64> {
    Ok(1.0 / zeta_whole(dimension)?)
}

pub fn recovered(n: usize, dimension: u32) -> Result<f64> {
    let density = series::visible(n, dimension)? as f64 / (n as f64).powi(dimension as i32);
    let zeta = 1.0 / density;
    Ok(match zeta_factor(dimension) {
        Some(factor) => (zeta / factor).powf(1.0 / f64::from(dimension)),
        None => zeta,
    })
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Node {
    pub num: u64,
    pub den: u64,
    pub brightness: u64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Node2d {
    pub x: Node,
    pub y: Node,
    pub brightness: u64,
}

pub fn farey(order: usize) -> Vec<Node> {
    let mut out = Vec::new();
    if order == 0 {
        return out;
    }
    let n = order as u64;
    let (mut a, mut b, mut c, mut d) = (0u64, 1u64, 1u64, n);
    out.push(Node {
        num: a,
        den: b,
        brightness: n / b,
    });
    while c <= n {
        let k = (n + b) / d;
        (a, b, c, d) = (c, d, k * c - a, k * d - b);
        out.push(Node {
            num: a,
            den: b,
            brightness: n / b,
        });
    }
    out
}

pub fn grid(n: usize) -> Vec<Node2d> {
    let axis = farey(n);
    let mut out = Vec::with_capacity(axis.len() * axis.len());
    for &y in &axis {
        for &x in &axis {
            out.push(Node2d {
                x,
                y,
                brightness: x.brightness * y.brightness,
            });
        }
    }
    out
}

pub fn new_nodes(n: usize) -> u64 {
    if n == 0 {
        return 0;
    }
    (farey(n).len() - farey(n - 1).len()) as u64
}
