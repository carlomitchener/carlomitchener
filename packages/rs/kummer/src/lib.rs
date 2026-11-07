use mrly_error::{Result, value_error};
use mrly_num::prime::is_prime;
use serde::{Deserialize, Serialize};

pub const MOST: u64 = 64;

pub const TABLE: u64 = 1 << 24;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Carry {
    pub prime: u64,
    pub top: u64,
    pub bottom: u64,
    pub states: Vec<(u64, u64)>,
    pub moves: Vec<Vec<Option<usize>>>,
    pub closes: Vec<bool>,
}

pub fn carry(prime: u64, top: u64, bottom: u64) -> Result<Carry> {
    checked(prime, top, bottom)?;
    let rest = top - bottom;
    let states: Vec<(u64, u64)> = (0..bottom)
        .flat_map(|c| (0..rest).map(move |e| (c, e)))
        .collect();
    if (states.len() as u64).saturating_mul(prime) > TABLE {
        return value_error(format!(
            "{} states at the prime {prime} pass the {TABLE} moves a table holds.",
            states.len()
        ));
    }
    let index = |(c, e): (u64, u64)| (c * rest + e) as usize;
    let moves = states
        .iter()
        .map(|&s| {
            (0..prime)
                .map(|d| column(prime, top, bottom, s, d).2.map(index))
                .collect()
        })
        .collect();
    let closes = states
        .iter()
        .map(|&s| spent(prime, top, bottom, s))
        .collect();
    Ok(Carry {
        prime,
        top,
        bottom,
        states,
        moves,
        closes,
    })
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Column {
    pub digit: u64,
    pub state: (u64, u64),
    pub left: u64,
    pub right: u64,
    pub next: Option<(u64, u64)>,
}

pub fn columns(k: u64, prime: u64, top: u64, bottom: u64) -> Result<Vec<Column>> {
    checked(prime, top, bottom)?;
    let mut out = Vec::new();
    let (mut rest, mut state) = (k, (0, 0));
    loop {
        let digit = rest % prime;
        rest /= prime;
        let (left, right, next) = column(prime, top, bottom, state, digit);
        out.push(Column {
            digit,
            state,
            left,
            right,
            next,
        });
        match next {
            Some(s) if rest > 0 || s != (0, 0) => state = s,
            _ => return Ok(out),
        }
    }
}

pub fn member(k: u64, prime: u64, top: u64, bottom: u64) -> Result<bool> {
    Ok(columns(k, prime, top, bottom)?
        .last()
        .is_some_and(|c| c.next.is_some()))
}

pub fn valuation(k: u64, prime: u64, top: u64, bottom: u64) -> Result<u32> {
    checked(prime, top, bottom)?;
    let p = u128::from(prime);
    let sum = |mut n: u128| {
        let mut s = 0;
        while n > 0 {
            s += n % p;
            n /= p;
        }
        s
    };
    let k = u128::from(k);
    let carries =
        sum(u128::from(bottom) * k) + sum(u128::from(top - bottom) * k) - sum(u128::from(top) * k);
    Ok((carries / (p - 1)) as u32)
}

pub fn count(prime: u64, top: u64, bottom: u64, level: u32) -> Result<u128> {
    let carry = carry(prime, top, bottom)?;
    if u128::from(prime).checked_pow(level).is_none() {
        return value_error(format!("{prime}^{level} passes a u128."));
    }
    let mut words = vec![0u128; carry.states.len()];
    words[0] = 1;
    for _ in 0..level {
        let mut next = vec![0u128; words.len()];
        for (s, &n) in words.iter().enumerate() {
            for &to in carry.moves[s].iter().flatten() {
                next[to] += n;
            }
        }
        words = next;
    }
    Ok(words
        .iter()
        .zip(&carry.closes)
        .filter(|&(_, &closes)| closes)
        .map(|(&n, _)| n)
        .sum())
}

pub fn witness(prime: u64, top: u64, bottom: u64) -> Result<Option<(u64, u64)>> {
    let carry = carry(prime, top, bottom)?;
    let holds = |s: Option<usize>| s.is_some_and(|s| carry.closes[s]);
    for v in 0..prime as usize {
        if !holds(carry.moves[0][v]) {
            continue;
        }
        for u in 0..prime as usize {
            let Some(s) = carry.moves[0][u].filter(|&s| carry.closes[s]) else {
                continue;
            };
            if !holds(carry.moves[s][v]) {
                return Ok(Some((u as u64, v as u64 * prime)));
            }
        }
    }
    Ok(None)
}

fn checked(prime: u64, top: u64, bottom: u64) -> Result<()> {
    if !usize::try_from(prime).is_ok_and(is_prime) {
        return value_error(format!("{prime} is not a prime."));
    }
    if bottom == 0 || bottom >= top || top > MOST {
        return value_error(format!(
            "a Kummer set takes 1 <= b < a <= {MOST}, not a = {top} and b = {bottom}."
        ));
    }
    Ok(())
}

fn column(
    prime: u64,
    top: u64,
    bottom: u64,
    (c, e): (u64, u64),
    digit: u64,
) -> (u64, u64, Option<(u64, u64)>) {
    let p = u128::from(prime);
    let x = u128::from(bottom) * u128::from(digit) + u128::from(c);
    let y = u128::from(top - bottom) * u128::from(digit) + u128::from(e);
    let (left, right) = (x % p, y % p);
    let next = (left + right < p).then_some(((x / p) as u64, (y / p) as u64));
    (left as u64, right as u64, next)
}

fn spent(prime: u64, top: u64, bottom: u64, mut state: (u64, u64)) -> bool {
    while state != (0, 0) {
        match column(prime, top, bottom, state, 0).2 {
            Some(next) => state = next,
            None => return false,
        }
    }
    true
}
