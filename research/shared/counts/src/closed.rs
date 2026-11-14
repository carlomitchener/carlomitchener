use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Closed {
    Power(u128),
    Difference(u128, u128),
    Polynomial(Vec<i128>),
    Recurrence(Vec<i128>),
}

fn signed(text: &mut String, coefficient: i128, first: bool) {
    if first {
        if coefficient < 0 {
            text.push('-');
        }
    } else {
        text.push_str(if coefficient < 0 { " - " } else { " + " });
    }
}

impl Closed {
    pub fn text(&self) -> String {
        match self {
            Closed::Power(f) => format!("{f}^level"),
            Closed::Difference(g, f) => format!("{g}^level - {f}^level"),
            Closed::Polynomial(coefficients) => {
                let mut text = String::new();
                for (power, &c) in coefficients.iter().enumerate().rev() {
                    if c == 0 {
                        continue;
                    }
                    let first = text.is_empty();
                    signed(&mut text, c, first);
                    if c.abs() != 1 || power == 0 {
                        text.push_str(&c.abs().to_string());
                    }
                    match power {
                        0 => {}
                        1 => text.push('k'),
                        _ => text.push_str(&format!("k^{power}")),
                    }
                }
                if text.is_empty() {
                    text.push('0');
                }
                text
            }
            Closed::Recurrence(coefficients) => {
                let mut text = String::new();
                for (back, &c) in coefficients.iter().enumerate() {
                    if c == 0 {
                        continue;
                    }
                    let first = text.is_empty();
                    signed(&mut text, c, first);
                    if c.abs() != 1 {
                        text.push_str(&c.abs().to_string());
                        text.push(' ');
                    }
                    text.push_str(&format!("a(level-{})", back + 1));
                }
                if text.is_empty() {
                    text.push('0');
                }
                format!("a(level) = {text}")
            }
        }
    }
}

fn binomial(n: usize, k: usize) -> i128 {
    (0..k).fold(1i128, |acc, i| acc * (n - i) as i128 / (i as i128 + 1))
}

pub fn fill_polynomial(corners: &[Vec<u8>], dimension: usize) -> Vec<i128> {
    let mut out = vec![0i128; dimension + 1];
    for corner in corners {
        let ones = corner.iter().filter(|&&r| r != 0).count();
        for j in 0..=ones {
            let sign = if (ones - j).is_multiple_of(2) { 1 } else { -1 };
            out[dimension - ones + j] += sign * binomial(ones, j);
        }
    }
    out
}

pub fn odd_power(dimension: usize) -> Vec<i128> {
    (0..=dimension)
        .map(|j| {
            let sign = if (dimension - j).is_multiple_of(2) {
                1
            } else {
                -1
            };
            sign * binomial(dimension, j) * (1i128 << j)
        })
        .collect()
}
