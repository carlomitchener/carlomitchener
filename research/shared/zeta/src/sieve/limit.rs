use super::{PLANE_LIMIT, letter, odd_word, ratio};
use mrly_error::{Result, value_error};

const SPLIT: u64 = 1001;

fn odd_tail(start: u64, power: i32) -> f64 {
    let n = start as f64;
    let s = f64::from(power);
    let p = n.powi(-power);
    p * n / (2.0 * (s - 1.0)) + p / 2.0 + s * p / (6.0 * n)
        - s * (s + 1.0) * (s + 2.0) * p / (90.0 * n * n * n)
}

pub fn solid_limit() -> f64 {
    let mut log = 0.0f64;
    let mut n = SPLIT - 2;
    while n >= 3 {
        log += (-(n as f64).powi(-3)).ln_1p();
        n -= 2;
    }
    for j in 1..=3i32 {
        log -= odd_tail(SPLIT, 3 * j) / f64::from(j);
    }
    log.exp()
}

pub fn limit(word: &[u64], dimension: u32) -> Result<Option<f64>> {
    if word.len() < 2 {
        return Ok(None);
    }
    let first = letter(word[0])?;
    let mut flat = true;
    for &s in word {
        flat &= letter(s)? == first;
    }
    if flat {
        return Ok(Some(0.0));
    }
    if !word
        .iter()
        .enumerate()
        .all(|(k, &s)| s == first + 2 * k as u64)
    {
        return Ok(None);
    }
    let whole = match dimension {
        2 => PLANE_LIMIT,
        3 => solid_limit(),
        _ => return Ok(None),
    };
    let head = odd_word(((first - 3) / 2) as usize);
    Ok(Some(whole / ratio(&head, dimension)?))
}

pub fn parity_product(dimension: u32, odd: bool) -> Result<f64> {
    if dimension < 2 {
        return value_error(format!(
            "a parity product converges from dim 2, not dim {dimension}."
        ));
    }
    let power = dimension as i32;
    let sign = if odd { -1.0 } else { 1.0 };
    let mut log = 0.0f64;
    let mut n = SPLIT - 2;
    while n >= 3 {
        log += (sign * (n as f64).powi(-power)).ln_1p();
        n -= 2;
    }
    for j in 1..=4i32 {
        let term = odd_tail(SPLIT, power * j) / f64::from(j);
        log += if odd || j % 2 == 0 { -term } else { term };
    }
    Ok(log.exp())
}
