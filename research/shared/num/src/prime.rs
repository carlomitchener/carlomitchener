use crate::factor::divisors;
use crate::series::li;
pub use mrly_num::prime::*;
use serde::{Deserialize, Serialize};

pub fn rectangles(number: usize) -> Vec<(usize, usize)> {
    divisors(number as u64)
        .into_iter()
        .map(|side| side as usize)
        .filter(|&a| a <= number / a)
        .map(|a| (a, number / a))
        .collect()
}

pub fn splits(number: usize) -> Vec<(usize, usize)> {
    let mut out = Vec::new();
    if number < 4 {
        return out;
    }
    for p in primes(number / 2) {
        if is_prime(number - p) {
            out.push((p, number - p));
        }
    }
    out
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Prime {
    pub value: usize,
    pub index: usize,
    pub gap: usize,
    pub twin: bool,
    pub squares: Option<(usize, usize)>,
}

pub fn study(limit: usize) -> Vec<Prime> {
    let list = primes(limit);
    list.iter()
        .enumerate()
        .map(|(i, &value)| Prime {
            value,
            index: i + 1,
            gap: if i == 0 { 0 } else { value - list[i - 1] },
            twin: is_prime(value - 2) || is_prime(value + 2),
            squares: squares(value),
        })
        .collect()
}

fn pairs(flag: &[bool], number: usize) -> usize {
    (2..=number / 2)
        .filter(|&p| flag[p] && flag[number - p])
        .count()
}

pub fn goldbach(number: usize) -> usize {
    if number < 4 {
        return 0;
    }
    pairs(&flags(number), number)
}

pub fn goldbach_record(top: usize) -> Vec<usize> {
    if top < 4 {
        return Vec::new();
    }
    let flag = flags(top);
    (2..=top / 2).map(|k| pairs(&flag, 2 * k)).collect()
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Reading {
    pub x: usize,
    pub pi: usize,
    pub ratio: f64,
    pub li: f64,
}

pub fn chart(top: usize, bins: usize) -> Vec<Reading> {
    let list = primes(top);
    let step = (top / bins.max(1)).max(1);
    let mut out = Vec::new();
    let mut x = step;
    while x <= top {
        if x >= 2 {
            out.push(Reading {
                x,
                pi: list.partition_point(|&p| p <= x),
                ratio: x as f64 / (x as f64).ln(),
                li: li(x as f64),
            });
        }
        if x == top {
            break;
        }
        x = (x + step).min(top);
    }
    out
}
