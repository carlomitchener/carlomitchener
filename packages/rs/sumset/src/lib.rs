use mrly_error::{Error, Result, value_error};
use mrly_num::digits::elements;
use serde::{Deserialize, Serialize};

pub const DEEPEST: u32 = 20;

pub const WIDEST: u32 = 30;

const BLOCK: usize = 8;

pub struct Sumset {
    level: u32,
    top: u64,
    words: Vec<u64>,
    runs: Vec<u64>,
}

impl Sumset {
    pub fn new(level: u32) -> Result<Sumset> {
        if !(1..=DEEPEST).contains(&level) {
            return value_error(format!("the level runs from 1 to {DEEPEST}, not {level}."));
        }
        let top = 3u64.pow(level);
        let mut words = vec![0u64; (top / 64 + 1) as usize];
        for a in elements(3, &[0, 1], level as usize)
            .into_iter()
            .chain([0, top])
        {
            words[(a / 64) as usize] |= 1 << (a % 64);
        }
        let mut power = 1u64;
        while power <= top {
            shift_or(&mut words, power);
            power *= 4;
        }
        let spare = top % 64;
        if spare != 63 {
            let last = words.len() - 1;
            words[last] &= (1u64 << (spare + 1)) - 1;
        }
        let mut runs = Vec::with_capacity(words.len() / BLOCK + 2);
        let mut total = 0u64;
        for chunk in words.chunks(BLOCK) {
            runs.push(total);
            total += chunk.iter().map(|w| u64::from(w.count_ones())).sum::<u64>();
        }
        runs.push(total);
        Ok(Sumset {
            level,
            top,
            words,
            runs,
        })
    }

    pub fn level(&self) -> u32 {
        self.level
    }

    pub fn top(&self) -> u64 {
        self.top
    }

    pub fn contains(&self, x: u64) -> Option<bool> {
        (x <= self.top).then(|| self.words[(x / 64) as usize] >> (x % 64) & 1 == 1)
    }

    pub fn count(&self, x: u64) -> Option<u64> {
        (x <= self.top).then(|| self.upto(x) - 1)
    }

    pub fn density(&self, x: u64) -> Option<f64> {
        (1..=self.top)
            .contains(&x)
            .then(|| (self.upto(x) - 1) as f64 / x as f64)
    }

    pub fn fills(&self, low: u64, high: u64, cells: usize) -> Result<Vec<f64>> {
        if low >= high || high > self.top + 1 {
            return value_error(format!(
                "the window [{low}, {high}) must be a nonempty part of [0, {}].",
                self.top
            ));
        }
        let span = high - low;
        if cells == 0 || cells as u64 > span {
            return value_error(format!(
                "a window of {span} integers splits into 1 to {span} cells, not {cells}."
            ));
        }
        let edge = |i: u64| low + (u128::from(i) * u128::from(span) / cells as u128) as u64;
        Ok((0..cells as u64)
            .map(|i| {
                let (a, b) = (edge(i), edge(i + 1));
                (self.below(b) - self.below(a)) as f64 / (b - a) as f64
            })
            .collect())
    }

    pub fn extremes(&self, edges: &[u64]) -> Result<Vec<Option<(f64, f64)>>> {
        if edges.first() == Some(&0)
            || edges.last().is_some_and(|&e| e > self.top + 1)
            || edges.windows(2).any(|w| w[0] > w[1])
        {
            return value_error(format!(
                "the edges must climb inside [1, {}].",
                self.top + 1
            ));
        }
        Ok(edges
            .windows(2)
            .map(|w| {
                let (a, b) = (w[0], w[1]);
                if a == b {
                    return None;
                }
                let mut members = self.below(a);
                let (mut low, mut high) = (f64::INFINITY, f64::NEG_INFINITY);
                for x in a..b {
                    members += self.words[(x / 64) as usize] >> (x % 64) & 1;
                    let d = (members - 1) as f64 / x as f64;
                    low = low.min(d);
                    high = high.max(d);
                }
                Some((low, high))
            })
            .collect())
    }

    fn upto(&self, x: u64) -> u64 {
        self.below(x + 1)
    }

    fn below(&self, x: u64) -> u64 {
        let word = (x / 64) as usize;
        let block = word / BLOCK;
        let whole: u64 = self.words[block * BLOCK..word]
            .iter()
            .map(|w| u64::from(w.count_ones()))
            .sum();
        let part = match (x % 64, self.words.get(word)) {
            (0, _) | (_, None) => 0,
            (bits, Some(w)) => u64::from((w & ((1u64 << bits) - 1)).count_ones()),
        };
        self.runs[block] + whole + part
    }
}

fn shift_or(words: &mut [u64], shift: u64) {
    let (jump, bits) = ((shift / 64) as usize, (shift % 64) as u32);
    for i in (jump..words.len()).rev() {
        let from = i - jump;
        let mut v = words[from] << bits;
        if bits > 0 && from > 0 {
            v |= words[from - 1] >> (64 - bits);
        }
        words[i] |= v;
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "Levels")]
pub struct Pair {
    three: u32,
    four: u32,
}

#[derive(Deserialize)]
struct Levels {
    three: u32,
    four: u32,
}

impl TryFrom<Levels> for Pair {
    type Error = Error;

    fn try_from(levels: Levels) -> Result<Pair> {
        Pair::new(levels.three, levels.four)
    }
}

impl Pair {
    pub fn new(three: u32, four: u32) -> Result<Pair> {
        if !(1..=WIDEST).contains(&three) || !(1..=WIDEST).contains(&four) {
            return value_error(format!(
                "both levels run from 1 to {WIDEST}, not ({three}, {four})."
            ));
        }
        Ok(Pair { three, four })
    }

    pub fn three(&self) -> u32 {
        self.three
    }

    pub fn four(&self) -> u32 {
        self.four
    }

    fn powers(&self) -> (u64, u64) {
        (3u64.pow(self.three), 4u64.pow(self.four))
    }

    pub fn largest(&self) -> u64 {
        let (p, q) = self.powers();
        (p - 1) / 2 + (q - 1) / 3
    }

    pub fn gap(&self) -> Option<(u64, u64)> {
        let (p, q) = self.powers();
        let d = self.largest();
        (p.min(q) > d + 1).then(|| (d + 1, p.min(q) - 1))
    }

    pub fn clean(&self) -> bool {
        let (p, q) = self.powers();
        p.min(q) > self.largest()
    }

    pub fn copy(&self) -> bool {
        let (p, q) = self.powers();
        2 * q < p + 5
    }

    pub fn scale(&self) -> f64 {
        let (p, q) = self.powers();
        q as f64 / p as f64
    }

    pub fn energy(&self) -> u128 {
        let powers: Vec<i64> = (0..self.four).map(|i| 4i64.pow(i)).collect();
        strings(&powers, 0, 0, 0, self.three)
    }

    pub fn ratio(&self, energy: u128) -> f64 {
        let flat = 4f64.powi((self.three + self.four) as i32);
        energy as f64 * (self.largest() + 1) as f64 / flat
    }
}

fn strings(powers: &[i64], at: usize, t: i64, zeros: u32, three: u32) -> u128 {
    if at == powers.len() {
        return balanced_zeros(t, three).map_or(0, |z| 1u128 << (z + zeros));
    }
    (-1..=1)
        .map(|digit| {
            strings(
                powers,
                at + 1,
                t + digit * powers[at],
                zeros + u32::from(digit == 0),
                three,
            )
        })
        .sum()
}

fn balanced_zeros(mut t: i64, digits: u32) -> Option<u32> {
    let mut zeros = 0;
    for _ in 0..digits {
        let r = t.rem_euclid(3);
        zeros += u32::from(r == 0);
        t = (t - r) / 3 + i64::from(r == 2);
    }
    (t == 0).then_some(zeros)
}

pub fn pairs(level: u32) -> Result<Vec<Pair>> {
    if !(1..=WIDEST).contains(&level) {
        return value_error(format!("the level runs from 1 to {WIDEST}, not {level}."));
    }
    let top = 3u64.pow(level);
    let mut out = Vec::new();
    for three in 1..=level {
        for four in 1..=WIDEST {
            let pair = Pair { three, four };
            let (p, q) = pair.powers();
            if q >= 3 * p {
                break;
            }
            if p < 3 * q && pair.largest() <= top {
                out.push(pair);
            }
        }
    }
    out.sort_by_key(Pair::largest);
    Ok(out)
}
