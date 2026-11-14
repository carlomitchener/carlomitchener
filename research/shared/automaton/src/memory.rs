use mrly_error::{value_error, Result};
use serde::{Deserialize, Serialize};

pub const SPAN: usize = 6;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rule {
    pub dimension: usize,
    pub width: usize,
    pub code: u64,
}

impl Rule {
    pub fn new(dimension: usize, width: usize, code: u64) -> Result<Rule> {
        if !(1..=3).contains(&dimension) {
            return value_error(format!("dimension {dimension} is not one, two or three."));
        }
        if width < 1 {
            return value_error("width must be at least one.");
        }
        if width * dimension > SPAN {
            return value_error(format!(
                "width {width} at dimension {dimension} reads {} digit bits, over the span of {SPAN}.",
                width * dimension
            ));
        }
        let rule = Rule {
            dimension,
            width,
            code: 0,
        };
        let bound = rule.codes();
        if u128::from(code) >= bound {
            return value_error(format!(
                "code {code} is out of range for width {width} at dimension {dimension} (0..{}).",
                bound - 1
            ));
        }
        Ok(Rule {
            dimension,
            width,
            code,
        })
    }

    pub fn full(dimension: usize, width: usize) -> Result<Rule> {
        let rule = Rule::new(dimension, width, 0)?;
        Ok(Rule {
            code: (rule.codes() - 1) as u64,
            ..rule
        })
    }

    pub fn letters(&self) -> usize {
        1 << self.dimension
    }

    pub fn windows(&self) -> usize {
        1 << (self.width * self.dimension)
    }

    pub fn codes(&self) -> u128 {
        1u128 << self.windows()
    }

    pub fn states(&self) -> usize {
        1 << ((self.width - 1) * self.dimension)
    }

    pub fn allowed(&self, window: usize) -> bool {
        window < self.windows() && (self.code >> window) & 1 == 1
    }

    pub fn accepts(&self, word: &[usize]) -> bool {
        if word.len() < self.width {
            return word.iter().all(|&c| c < self.letters());
        }
        word.windows(self.width).all(|slice| {
            let mut w = 0;
            for &c in slice {
                w = (w << self.dimension) | c;
            }
            self.allowed(w)
        })
    }

    pub fn alphabet(&self) -> Vec<usize> {
        let mut seen = vec![false; self.letters()];
        for w in 0..self.windows() {
            if !self.allowed(w) {
                continue;
            }
            for j in 0..self.width {
                seen[(w >> (self.dimension * j)) & (self.letters() - 1)] = true;
            }
        }
        (0..self.letters()).filter(|&c| seen[c]).collect()
    }
}

pub fn transfer(rule: &Rule) -> Vec<Vec<u64>> {
    let states = rule.states();
    let letters = rule.letters();
    let mut matrix = vec![vec![0u64; states]; states];
    if rule.width == 1 {
        matrix[0][0] = (0..letters).filter(|&c| rule.allowed(c)).count() as u64;
        return matrix;
    }
    for (s, row) in matrix.iter_mut().enumerate() {
        for c in 0..letters {
            let window = (s << rule.dimension) | c;
            if !rule.allowed(window) {
                continue;
            }
            row[window & (states - 1)] = 1;
        }
    }
    matrix
}

fn step(matrix: &[Vec<u64>], vector: &[u64]) -> Option<Vec<u64>> {
    let mut out = vec![0u64; vector.len()];
    for (s, row) in matrix.iter().enumerate() {
        for (t, &entry) in row.iter().enumerate() {
            if entry == 0 || vector[t] == 0 {
                continue;
            }
            out[s] = out[s].checked_add(entry.checked_mul(vector[t])?)?;
        }
    }
    Some(out)
}

pub fn counts(rule: &Rule, levels: usize) -> Vec<u64> {
    let matrix = transfer(rule);
    let mut vector = vec![1u64; rule.states()];
    let mut out = Vec::with_capacity(levels);
    for level in 1..=levels {
        if level + 1 < rule.width {
            match 1u64.checked_shl((rule.dimension * level) as u32) {
                Some(count) => out.push(count),
                None => break,
            }
            continue;
        }
        if level + 1 > rule.width {
            match step(&matrix, &vector) {
                Some(next) => vector = next,
                None => break,
            }
        }
        out.push(vector.iter().sum());
    }
    out
}

pub fn cells(rule: &Rule, level: usize) -> Vec<u64> {
    let side = 1u64 << level;
    let mut out = Vec::new();
    let mut word = vec![0usize; level];
    walk(rule, level, 0, &mut word, &mut |word| {
        let mut place = vec![0u64; rule.dimension];
        for (j, &c) in word.iter().enumerate() {
            let weight = 1u64 << (level - 1 - j);
            for (axis, seat) in place.iter_mut().enumerate() {
                *seat += ((c >> axis) & 1) as u64 * weight;
            }
        }
        out.push(place.iter().rev().fold(0, |run, &seat| run * side + seat));
    });
    out
}

fn walk(
    rule: &Rule,
    level: usize,
    at: usize,
    word: &mut Vec<usize>,
    emit: &mut impl FnMut(&[usize]),
) {
    if at == level {
        emit(word);
        return;
    }
    for c in 0..rule.letters() {
        word[at] = c;
        if at + 1 >= rule.width {
            let start = at + 1 - rule.width;
            let mut w = 0;
            for &digit in &word[start..=at] {
                w = (w << rule.dimension) | digit;
            }
            if !rule.allowed(w) {
                continue;
            }
        }
        walk(rule, level, at + 1, word, emit);
    }
}

pub const TOLERANCE: f64 = 1e-14;

pub const SWEEPS: usize = 100_000;

pub fn perron(rule: &Rule) -> f64 {
    let matrix = transfer(rule);
    let reach = reachability(&matrix);
    let states = matrix.len();
    let mut seen = vec![false; states];
    let mut best = 0.0f64;
    for s in 0..states {
        if seen[s] || (reach[s] >> s) & 1 == 0 {
            continue;
        }
        let part: Vec<usize> = (0..states)
            .filter(|&t| t == s || ((reach[s] >> t) & 1 == 1 && (reach[t] >> s) & 1 == 1))
            .collect();
        for &t in &part {
            seen[t] = true;
        }
        let block: Vec<Vec<i128>> = part
            .iter()
            .map(|&i| part.iter().map(|&j| matrix[i][j] as i128).collect())
            .collect();
        let root = component_root(&block);
        if root > best {
            best = root;
        }
    }
    best
}

fn reachability(matrix: &[Vec<u64>]) -> Vec<u64> {
    let states = matrix.len();
    let mut reach: Vec<u64> = matrix
        .iter()
        .map(|row| {
            row.iter()
                .enumerate()
                .filter(|&(_, &entry)| entry > 0)
                .map(|(t, _)| 1u64 << t)
                .sum()
        })
        .collect();
    for _ in 0..states {
        let old = reach.clone();
        for s in 0..states {
            for t in 0..states {
                if (old[s] >> t) & 1 == 1 {
                    reach[s] |= old[t];
                }
            }
        }
        if reach == old {
            break;
        }
    }
    reach
}

fn multiply(left: &[Vec<i128>], right: &[Vec<i128>]) -> Vec<Vec<i128>> {
    let n = left.len();
    let mut out = vec![vec![0i128; n]; n];
    for i in 0..n {
        for t in 0..n {
            if left[i][t] == 0 {
                continue;
            }
            for j in 0..n {
                out[i][j] += left[i][t] * right[t][j];
            }
        }
    }
    out
}

fn characteristic(block: &[Vec<i128>]) -> Vec<i128> {
    let n = block.len();
    let mut poly = vec![0i128; n + 1];
    poly[n] = 1;
    let mut carry = vec![vec![0i128; n]; n];
    for step in 1..=n {
        let mut product = multiply(block, &carry);
        for (i, row) in product.iter_mut().enumerate() {
            row[i] += poly[n - step + 1];
        }
        carry = product;
        let next = multiply(block, &carry);
        let trace: i128 = (0..n).map(|i| next[i][i]).sum();
        poly[n - step] = -trace / step as i128;
    }
    poly
}

fn value(poly: &[i128], x: f64) -> f64 {
    poly.iter().rev().fold(0.0f64, |run, &c| run * x + c as f64)
}

fn vanishes(poly: &[i128], x: i128) -> bool {
    let mut run = 0i128;
    for &c in poly.iter().rev() {
        run = match run.checked_mul(x).and_then(|v| v.checked_add(c)) {
            Some(v) => v,
            None => return false,
        };
    }
    run == 0
}

fn component_root(block: &[Vec<i128>]) -> f64 {
    let n = block.len();
    let mut vector = vec![1.0f64 / n as f64; n];
    let mut settled = 0usize;
    for _ in 0..SWEEPS {
        let mut next = vec![0.0f64; n];
        for (s, row) in block.iter().enumerate() {
            let mut sum = vector[s];
            for (t, &entry) in row.iter().enumerate() {
                sum += entry as f64 * vector[t];
            }
            next[s] = sum;
        }
        let mass: f64 = next.iter().sum();
        for seat in next.iter_mut() {
            *seat /= mass;
        }
        let move_size: f64 = next
            .iter()
            .zip(vector.iter())
            .map(|(a, b)| (a - b).abs())
            .sum();
        vector = next;
        if move_size <= TOLERANCE {
            settled += 1;
            if settled >= 3 {
                break;
            }
        } else {
            settled = 0;
        }
    }
    let mut low = f64::INFINITY;
    let mut high = 0.0f64;
    for (s, row) in block.iter().enumerate() {
        let image: f64 = row
            .iter()
            .enumerate()
            .map(|(t, &entry)| entry as f64 * vector[t])
            .sum();
        let ratio = image / vector[s];
        low = low.min(ratio);
        high = high.max(ratio);
    }
    let seed = 0.5 * (low + high);
    let poly = characteristic(block);
    let rounded = seed.round();
    if (0.0..1e18).contains(&rounded) && vanishes(&poly, rounded as i128) {
        return rounded;
    }
    let mut under;
    let mut over;
    let mut delta = 1e-13f64;
    loop {
        under = seed - delta;
        over = seed + delta;
        if value(&poly, under) < 0.0 && value(&poly, over) > 0.0 {
            break;
        }
        delta *= 4.0;
        if delta > 0.25 {
            return seed;
        }
    }
    for _ in 0..200 {
        let middle = 0.5 * (under + over);
        if middle <= under || middle >= over {
            break;
        }
        if value(&poly, middle) < 0.0 {
            under = middle;
        } else {
            over = middle;
        }
    }
    0.5 * (under + over)
}

pub fn exponent(rule: &Rule) -> f64 {
    let rho = perron(rule);
    if rho <= 0.0 {
        return f64::NEG_INFINITY;
    }
    rho.log2()
}

pub fn allowed_windows(rule: &Rule) -> usize {
    let windows = rule.windows();
    let mask = if windows >= 64 {
        u64::MAX
    } else {
        (1u64 << windows) - 1
    };
    (rule.code & mask).count_ones() as usize
}

pub fn kappa(rule: &Rule) -> f64 {
    let windows = allowed_windows(rule);
    if windows == 0 {
        return 0.0;
    }
    let rho = perron(rule);
    if rho <= 0.0 {
        return f64::INFINITY;
    }
    (windows as f64).log2() / rule.width as f64 - rho.log2()
}
