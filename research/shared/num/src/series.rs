use mrly_error::{Result, value_error};
use mrly_num::factor::mobius_sieve;
use mrly_num::prime::primes;
pub use mrly_num::series::*;
use std::f64::consts::PI;

pub const BASEL: f64 = PI * PI / 6.0;

pub const VISIBLE: f64 = 6.0 / (PI * PI);

pub const CATALAN: f64 = 0.915_965_594_177_219;

pub const APERY: f64 = 1.202_056_903_159_594;

#[allow(clippy::approx_constant)]
pub const EULER: f64 = 0.577_215_664_901_532_9;

pub fn catalan(limit: usize) -> Vec<usize> {
    let mut out = Vec::new();
    let mut value: u128 = 1;
    let mut index: u128 = 0;
    while value <= limit as u128 {
        if out.last() != Some(&(value as usize)) {
            out.push(value as usize);
        }
        value = value * 2 * (2 * index + 1) / (index + 2);
        index += 1;
    }
    out
}

pub fn li(x: f64) -> f64 {
    let log = x.ln();
    let mut sum = 0.0f64;
    let mut term = 1.0f64;
    let mut odds = 0.0f64;
    for n in 1..200u32 {
        term *= log / n as f64;
        if n > 1 {
            term /= 2.0;
        }
        if !n.is_multiple_of(2) {
            odds += 1.0 / n as f64;
        }
        let piece = term * odds;
        sum += if n.is_multiple_of(2) { -piece } else { piece };
        if piece.abs() < 1e-17 * sum.abs() {
            break;
        }
    }
    EULER + log.abs().ln() + x.sqrt() * sum
}

pub fn harmonic(terms: usize) -> f64 {
    (1..=terms).map(|k| 1.0 / k as f64).sum()
}

pub fn zeta(s: f64, terms: usize) -> Result<f64> {
    if s <= 1.0 || s.is_nan() {
        return value_error(format!("zeta needs an s above one, not {s}."));
    }
    let mut sum = 0.0;
    for k in 1..=terms {
        sum += (k as f64).powf(-s);
    }
    let n = terms as f64;
    Ok(sum + n.powf(1.0 - s) / (s - 1.0) - n.powf(-s) / 2.0 + s * n.powf(-s - 1.0) / 12.0)
}

pub fn euler_product(s: f64, limit: usize) -> f64 {
    primes(limit)
        .iter()
        .map(|&p| 1.0 / (1.0 - (p as f64).powf(-s)))
        .product()
}

pub fn beta(s: f64, terms: usize) -> f64 {
    let mut sum = 0.0;
    let mut previous = 0.0;
    for k in 0..terms {
        previous = sum;
        let term = ((2 * k + 1) as f64).powf(-s);
        sum += if k.is_multiple_of(2) { term } else { -term };
    }
    0.5 * (previous + sum)
}

pub fn lambda(s: f64, terms: usize) -> Result<f64> {
    Ok((1.0 - 2f64.powf(-s)) * zeta(s, terms)?)
}

pub fn chi8(number: usize) -> i8 {
    [0, 1, 0, 1, 0, -1, 0, -1][number % 8]
}

pub fn chi4(number: usize) -> i8 {
    [0, 1, 0, -1][number % 4]
}

pub fn chi3(number: usize) -> i8 {
    [0, 1, -1][number % 3]
}

pub fn dirichlet(s: f64, rhythm: &[i8], terms: usize) -> f64 {
    if rhythm.is_empty() {
        return 0.0;
    }
    let mut sum = 0.0;
    for n in 1..=terms {
        let paint = rhythm[n % rhythm.len()];
        if paint != 0 {
            sum += f64::from(paint) * (n as f64).powf(-s);
        }
    }
    sum
}

pub fn visible(limit: usize, dimension: u32) -> Result<u128> {
    if dimension == 0 {
        return value_error("a visible count needs a dimension above zero.");
    }
    let mu = mobius_sieve(limit);
    let mut total: i128 = 0;
    for (k, &value) in mu.iter().enumerate().skip(1) {
        if value == 0 {
            continue;
        }
        let block = (limit / k) as i128;
        total += i128::from(value) * block.pow(dimension);
    }
    Ok(total as u128)
}

pub fn wallis_quarter_pi(factors: usize) -> f64 {
    let mut out = 1.0;
    for n in 1..=factors {
        let odd = (2 * n + 1) as f64;
        out *= 1.0 - 1.0 / (odd * odd);
    }
    out
}

pub fn wallis_half_pi(n: usize) -> f64 {
    let mut out = 1.0;
    for k in 1..=n {
        let square = ((2 * k) * (2 * k)) as f64;
        out *= square / (square - 1.0);
    }
    out
}

pub fn leibniz(n: usize) -> f64 {
    let mut out = 0.0;
    for k in 0..n {
        let term = 1.0 / (2 * k + 1) as f64;
        out += if k.is_multiple_of(2) { term } else { -term };
    }
    out
}

pub fn basel(n: usize) -> f64 {
    (1..=n).map(|k| 1.0 / (k * k) as f64).sum()
}

pub fn euler_gamma_partial(n: usize) -> f64 {
    if n == 0 {
        return 0.0;
    }
    harmonic(n) - (n as f64).ln()
}

pub fn e_partial(n: usize) -> f64 {
    if n == 0 {
        return 1.0;
    }
    (1.0 + 1.0 / n as f64).powf(n as f64)
}

pub fn mertens(n: usize) -> i64 {
    mobius_sieve(n).iter().skip(1).map(|&v| i64::from(v)).sum()
}
