use mrly_error::{Result, overflow_error};
pub use mrly_num::factor::*;

pub fn lcm(a: usize, b: usize) -> usize {
    if a == 0 || b == 0 {
        return 0;
    }
    a / gcd(a as u128, b as u128) as usize * b
}

pub fn coprime(a: usize, b: usize) -> bool {
    gcd(a as u128, b as u128) == 1
}

pub fn factorial(number: usize) -> Result<u128> {
    let mut out: u128 = 1;
    for step in 1..=number as u128 {
        match out.checked_mul(step) {
            Some(next) => out = next,
            None => return overflow_error(format!("a factorial of {number} passes u128")),
        }
    }
    Ok(out)
}

pub fn divisors(number: u64) -> Vec<u64> {
    if number == 0 {
        return Vec::new();
    }
    let mut out = vec![1];
    for (prime, power) in factorize_wide(number) {
        let mut next = Vec::with_capacity(out.len() * (power as usize + 1));
        for &divisor in &out {
            let mut value = divisor;
            next.push(value);
            for _ in 0..power {
                value *= prime;
                next.push(value);
            }
        }
        out = next;
    }
    out.sort_unstable();
    out
}

pub fn sigma(number: usize, power: u32) -> u128 {
    divisors(number as u64)
        .iter()
        .map(|&divisor| u128::from(divisor).pow(power))
        .sum()
}

pub fn aliquot(number: usize) -> usize {
    (sigma(number, 1) - number as u128) as usize
}

pub fn twisted(number: usize, rhythm: &[i8]) -> i64 {
    if rhythm.is_empty() {
        return 0;
    }
    divisors(number as u64)
        .iter()
        .map(|&divisor| i64::from(rhythm[divisor as usize % rhythm.len()]))
        .sum()
}

pub fn totients(n: usize) -> Vec<u64> {
    let mut phi: Vec<u64> = (0..=n as u64).collect();
    for p in 2..=n {
        if phi[p] == p as u64 {
            for m in (p..=n).step_by(p) {
                phi[m] -= phi[m] / p as u64;
            }
        }
    }
    phi
}

pub fn radical(number: usize) -> usize {
    if number == 0 {
        return 0;
    }
    factorize(number).iter().map(|&(prime, _)| prime).product()
}
