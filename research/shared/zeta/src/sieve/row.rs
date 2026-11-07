use super::parity_product;
use mrly_error::{Result, overflow_error, value_error};
use mrly_num::complex::Complex;
use serde::{Deserialize, Serialize};
use std::f64::consts::{FRAC_PI_4, LN_2, PI};

const ROW_DIMENSIONS: usize = 3;

const STIRLING: [f64; 8] = [
    1.0 / 12.0,
    -1.0 / 360.0,
    1.0 / 1260.0,
    -1.0 / 1680.0,
    1.0 / 1188.0,
    -691.0 / 360_360.0,
    1.0 / 156.0,
    -3617.0 / 122_400.0,
];

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Row {
    pub profile: Vec<u64>,
    pub drift: (i64, i64),
    pub correction: (i64, i64),
    pub roots: Vec<Complex>,
    pub constant: f64,
    pub closed: String,
    pub reflection: Option<f64>,
    pub mirror: f64,
    pub parity: Option<(bool, f64)>,
}

struct Split {
    zero: usize,
    one: usize,
    rational: Vec<(i128, i128)>,
    rest: Vec<i128>,
}

struct Form {
    num: i128,
    den: i128,
    root: i128,
    halves: u32,
    top: Vec<String>,
    bottom: Vec<String>,
}

fn gcd(a: i128, b: i128) -> i128 {
    let (mut a, mut b) = (a.abs(), b.abs());
    while b != 0 {
        (a, b) = (b, a % b);
    }
    a.max(1)
}

fn binomial(n: usize, k: usize) -> i128 {
    (0..k).fold(1i128, |acc, i| acc * (n - i) as i128 / (i + 1) as i128)
}

fn reduced(p: i128, q: i128) -> (i64, i64) {
    let g = gcd(p, q) * q.signum();
    ((p / g) as i64, (q / g) as i64)
}

fn fraction(p: i128, q: i128) -> String {
    let (p, q) = reduced(p, q);
    if q == 1 {
        p.to_string()
    } else {
        format!("{p}/{q}")
    }
}

fn square_part(n: i128) -> (i128, i128) {
    let (mut s, mut t, mut f) = (1i128, n, 2i128);
    while f * f <= t {
        while t % (f * f) == 0 {
            t /= f * f;
            s *= f;
        }
        f += 1;
    }
    (s, t)
}

fn surd(s: i128, t: i128, v: i128) -> String {
    let (s, v) = reduced(s, v);
    let mut words = Vec::new();
    if s != 1 || t == 1 {
        words.push(s.to_string());
    }
    if t > 1 {
        words.push(format!("sqrt{t}"));
    }
    let text = words.join(" ");
    if v == 1 { text } else { format!("{text}/{v}") }
}

fn angle(s: i128, t: i128, v: i128) -> String {
    let (s, v) = reduced(s, v);
    let (s, v) = (i128::from(s), i128::from(v));
    let mut words = Vec::new();
    if s != 1 {
        words.push(s.to_string());
    }
    words.push("pi".to_string());
    if t > 1 && v % t == 0 {
        let k = v / t;
        let under = if k == 1 {
            format!("sqrt{t}")
        } else {
            format!("({k} sqrt{t})")
        };
        return format!("{}/{under}", words.join(" "));
    }
    if t > 1 {
        words.push(format!("sqrt{t}"));
    }
    let text = words.join(" ");
    if v == 1 { text } else { format!("{text}/{v}") }
}

fn merged(tokens: &[String]) -> Vec<String> {
    let mut seen: Vec<(String, usize)> = Vec::new();
    for token in tokens {
        match seen.iter_mut().find(|entry| entry.0 == *token) {
            Some(entry) => entry.1 += 1,
            None => seen.push((token.clone(), 1)),
        }
    }
    seen.into_iter()
        .map(|(t, k)| if k == 1 { t } else { format!("{t}^{k}") })
        .collect()
}

impl Form {
    fn scale(&mut self, p: i128, q: i128) {
        self.num *= p;
        self.den *= q;
        let g = gcd(self.num, self.den);
        self.num /= g;
        self.den /= g;
    }

    fn radical(&mut self, t: i128) {
        let (s, t) = square_part(self.root * t);
        self.root = t;
        self.scale(s, 1);
    }

    fn spell(&self) -> String {
        let mut upper = Vec::new();
        if self.num != 1 {
            upper.push(self.num.to_string());
        }
        if self.root > 1 {
            upper.push(format!("sqrt{}", self.root));
        }
        match self.halves {
            0 => {}
            1 => upper.push("sqrt(pi)".to_string()),
            2 => upper.push("pi".to_string()),
            h if h % 2 == 0 => upper.push(format!("pi^{}", h / 2)),
            h => upper.push(format!("pi^({h}/2)")),
        }
        upper.extend(merged(&self.top));
        let upper = if upper.is_empty() {
            "1".to_string()
        } else {
            upper.join(" ")
        };
        let mut lower = Vec::new();
        if self.den != 1 {
            lower.push(self.den.to_string());
        }
        lower.extend(merged(&self.bottom));
        match lower.len() {
            0 => upper,
            1 => format!("{upper}/{}", lower[0]),
            _ => format!("{upper}/({})", lower.join(" ")),
        }
    }
}

fn row_dimension(profile: &[u64]) -> Result<usize> {
    let dimension = profile.len().saturating_sub(1);
    if !(1..=ROW_DIMENSIONS).contains(&dimension) {
        return value_error(format!(
            "a row profile holds dim + 1 counts at dim 1 to {ROW_DIMENSIONS}, not {}.",
            profile.len()
        ));
    }
    for (j, &a) in profile.iter().enumerate() {
        if i128::from(a) > binomial(dimension, j) {
            return value_error(format!(
                "no design in dim {dimension} has {a} corners with {j} odd coordinates."
            ));
        }
    }
    if profile.iter().all(|&a| a == 0) {
        return value_error("the empty design fills nothing.");
    }
    Ok(dimension)
}

fn scaled(poly: &[i128], p: i128, q: i128) -> i128 {
    let degree = poly.len() - 1;
    poly.iter()
        .enumerate()
        .map(|(k, &c)| c * p.pow(k as u32) * q.pow((degree - k) as u32))
        .sum()
}

fn divide(poly: &[i128], p: i128, q: i128) -> Vec<i128> {
    let degree = poly.len() - 1;
    let mut out = vec![0i128; degree];
    out[degree - 1] = poly[degree] / q;
    for k in (1..degree).rev() {
        out[k - 1] = (poly[k] + p * out[k]) / q;
    }
    out
}

fn split(profile: &[u64], dimension: usize) -> Split {
    let low = profile.iter().position(|&a| a > 0).unwrap_or(0);
    let high = profile.iter().rposition(|&a| a > 0).unwrap_or(0);
    let mut core = vec![0i128; high - low + 1];
    for (j, &a) in profile.iter().enumerate().take(high + 1).skip(low) {
        let m = j - low;
        for k in 0..=m {
            let sign = if (m - k) % 2 == 0 { 1 } else { -1 };
            core[high - j + k] += i128::from(a) * binomial(m, k) * sign;
        }
    }
    let mut rational = Vec::new();
    'search: while core.len() > 1 {
        let lead = core[core.len() - 1].abs();
        for q in 2..=lead {
            if lead % q != 0 {
                continue;
            }
            for p in 1..q {
                if gcd(p, q) == 1 && scaled(&core, p, q) == 0 {
                    rational.push((p, q));
                    core = divide(&core, p, q);
                    continue 'search;
                }
            }
        }
        break;
    }
    Split {
        zero: dimension - high,
        one: low,
        rational,
        rest: core,
    }
}

fn quadratic(c: f64, b: f64, a: f64) -> [Complex; 2] {
    let disc = b * b - 4.0 * a * c;
    let re = -b / (2.0 * a);
    let half = disc.abs().sqrt() / (2.0 * a);
    if disc < 0.0 {
        [Complex::new(re, -half), Complex::new(re, half)]
    } else {
        [Complex::new(re - half, 0.0), Complex::new(re + half, 0.0)]
    }
}

fn rest_roots(rest: &[i128]) -> Vec<Complex> {
    let c: Vec<f64> = rest.iter().map(|&x| x as f64).collect();
    match c.len() {
        3 => quadratic(c[0], c[1], c[2]).to_vec(),
        4 => {
            let f = |x: f64| ((c[3] * x + c[2]) * x + c[1]) * x + c[0];
            let rising = f(1.0) > f(0.0);
            let (mut low, mut high) = (0.0f64, 1.0f64);
            for _ in 0..200 {
                let mid = 0.5 * (low + high);
                if (f(mid) > 0.0) == rising {
                    high = mid;
                } else {
                    low = mid;
                }
            }
            let r = 0.5 * (low + high);
            let b = c[2] + r * c[3];
            let mut out = vec![Complex::new(r, 0.0)];
            out.extend(quadratic(c[1] + r * b, b, c[3]));
            out
        }
        _ => Vec::new(),
    }
}

fn ln_one_plus(u: Complex) -> Complex {
    let size = 0.5 * (2.0 * u.re + u.re * u.re + u.im * u.im).ln_1p();
    Complex::new(size, u.im.atan2(1.0 + u.re))
}

fn stirling(z: Complex) -> Complex {
    let inverse = Complex::new(1.0, 0.0) / z;
    let square = inverse * inverse;
    let mut power = inverse;
    let mut series = Complex::new(0.0, 0.0);
    for c in STIRLING {
        series = series + power * c;
        power = power * square;
    }
    series
}

fn gamma_step(r: Complex) -> Complex {
    let delta = Complex::new(0.5 - r.re, -r.im);
    let mut low = 1.5f64;
    let mut sum = Complex::new(0.0, 0.0);
    while low < 16.0 {
        sum = sum - ln_one_plus(delta * (1.0 / low));
        low += 1.0;
    }
    let near = Complex::new(low, 0.0);
    let far = near + delta;
    let main = ln_one_plus(delta * (1.0 / low)) * (low - 0.5) + delta * Complex::ln(far) - delta;
    sum + main + stirling(far) - stirling(near)
}

fn sine_ratio(r: Complex) -> Complex {
    let (x, y) = (PI * r.re, PI * r.im);
    let sine = Complex::new(x.sin() * y.cosh(), x.cos() * y.sinh());
    let one = Complex::new(1.0, 0.0);
    sine / (r * (one - r) * 4.0)
}

fn poly_text(poly: &[i128]) -> String {
    let mut text = String::new();
    for (k, &c) in poly.iter().enumerate().rev() {
        if c == 0 {
            continue;
        }
        let size = c.abs();
        let body = match (k, size) {
            (0, _) => size.to_string(),
            (1, 1) => "n".to_string(),
            (1, _) => format!("{size}n"),
            (_, 1) => format!("n^{k}"),
            _ => format!("{size}n^{k}"),
        };
        if text.is_empty() {
            text = if c < 0 { format!("-{body}") } else { body };
        } else {
            text += if c < 0 { " - " } else { " + " };
            text += &body;
        }
    }
    text
}

fn spelled(split: &Split) -> String {
    let mut form = Form {
        num: 1,
        den: 1,
        root: 1,
        halves: 0,
        top: Vec::new(),
        bottom: Vec::new(),
    };
    let mut note = String::new();
    for _ in 0..split.zero + split.one {
        form.halves += 1;
        form.scale(1, 2);
    }
    let mut pool = split.rational.clone();
    while let Some((p, q)) = pool.pop() {
        if 2 * p == q {
            continue;
        }
        if let Some(at) = pool.iter().position(|&(a, b)| b == q && a == q - p) {
            pool.remove(at);
            form.scale(q * q, 4 * p * (q - p));
            let low = p.min(q - p);
            match (low, q) {
                (1, 6) => form.scale(1, 2),
                (1, 4) => {
                    form.radical(2);
                    form.scale(1, 2);
                }
                (1, 3) => {
                    form.radical(3);
                    form.scale(1, 2);
                }
                _ => form.top.push(format!("sin({})", angle(low, 1, q))),
            }
        } else {
            form.halves += 1;
            form.scale(q, 2 * (q - p));
            form.bottom.push(format!("Gamma({})", fraction(q - p, q)));
        }
    }
    let rest = &split.rest;
    if rest.len() == 3 {
        let (c, b, a) = (rest[0], rest[1], rest[2]);
        let disc = b * b - 4 * a * c;
        let (s, t) = square_part(disc.abs());
        if -b == a {
            form.scale(a, 4 * c);
            let wave = if disc < 0 { "cosh" } else { "cos" };
            form.top.push(format!("{wave}({})", angle(s, t, 2 * a)));
        } else {
            form.halves += 2;
            form.scale(1, 4);
            let x = fraction(4 * a + b, 2 * a);
            if disc < 0 {
                let y = if t > 1 {
                    format!("i {}", surd(s, t, 2 * a))
                } else {
                    let (u, v) = reduced(s, 2 * a);
                    let head = if u == 1 {
                        "i".to_string()
                    } else {
                        format!("{u}i")
                    };
                    if v == 1 { head } else { format!("{head}/{v}") }
                };
                form.bottom.push(format!("|Gamma({x} - {y})|^2"));
            } else {
                let y = surd(s, t, 2 * a);
                form.bottom.push(format!("Gamma({x} - {y})"));
                form.bottom.push(format!("Gamma({x} + {y})"));
            }
        }
    } else if rest.len() == 4 {
        form.halves += 3;
        form.scale(1, 8);
        for i in 1..=3 {
            form.bottom.push(format!("Gamma(2 - r_{i})"));
        }
        note = format!(", r_i the roots of {}", poly_text(rest));
    }
    format!("{}{note}", form.spell())
}

fn reflected(split: &Split, roots: &[Complex]) -> Option<f64> {
    let mut value = (PI.sqrt() / 2.0).powi((split.zero + split.one) as i32);
    let mut pool = split.rational.clone();
    while let Some((p, q)) = pool.pop() {
        if 2 * p == q {
            continue;
        }
        let at = pool.iter().position(|&(a, b)| b == q && a == q - p)?;
        pool.remove(at);
        value *= sine_ratio(Complex::new(p as f64 / q as f64, 0.0)).re;
    }
    match split.rest.len() {
        1 => Some(value),
        3 if -split.rest[1] == split.rest[2] => Some(value * sine_ratio(roots[roots.len() - 1]).re),
        _ => None,
    }
}

fn parity_of(profile: &[u64], dimension: usize) -> Option<bool> {
    if dimension < 2 {
        return None;
    }
    [true, false].into_iter().find(|&odd| {
        profile.iter().enumerate().all(|(j, &a)| {
            let want = if (j % 2 == 1) == odd {
                binomial(dimension, j)
            } else {
                0
            };
            i128::from(a) == want
        })
    })
}

pub fn row_profile(code: u128, dimension: usize) -> Result<Vec<u64>> {
    if !(1..=ROW_DIMENSIONS).contains(&dimension) {
        return value_error(format!(
            "the row word reads dim 1 to {ROW_DIMENSIONS}, not dim {dimension}."
        ));
    }
    let corners = 1u32 << dimension;
    if code >> corners != 0 {
        return value_error(format!(
            "code {code} out of range for dimension {dimension} base 2 (0..{}).",
            (1u128 << corners) - 1
        ));
    }
    let mut profile = vec![0u64; dimension + 1];
    for corner in (0..corners).filter(|&i| code >> i & 1 == 1) {
        profile[corner.count_ones() as usize] += 1;
    }
    Ok(profile)
}

pub fn row_fill(profile: &[u64], side: u64) -> Result<u128> {
    fill_at(profile, row_dimension(profile)?, side)
}

fn fill_at(profile: &[u64], dimension: usize, side: u64) -> Result<u128> {
    let even = u128::from(side.div_ceil(2));
    let odd = u128::from(side / 2);
    let mut fill = 0u128;
    for (j, &a) in profile.iter().enumerate() {
        let term = even
            .checked_pow((dimension - j) as u32)
            .and_then(|e| odd.checked_pow(j as u32).and_then(|o| e.checked_mul(o)))
            .and_then(|t| t.checked_mul(u128::from(a)))
            .and_then(|t| fill.checked_add(t));
        fill = match term {
            Some(total) => total,
            None => return overflow_error(format!("the fill at side {side} overruns a u128.")),
        };
    }
    Ok(fill)
}

pub fn row_law(profile: &[u64]) -> Result<Row> {
    let dimension = row_dimension(profile)?;
    let d = dimension as i128;
    let w: i128 = profile.iter().map(|&a| i128::from(a)).sum();
    let first: i128 = profile
        .iter()
        .enumerate()
        .map(|(j, &a)| j as i128 * i128::from(a))
        .sum();
    let second: i128 = profile
        .iter()
        .enumerate()
        .map(|(j, &a)| (j * j) as i128 * i128::from(a))
        .sum();
    let drift = d * w - 2 * first;
    let correction = d * w * w + 4 * w * drift - 4 * (w * second - first * first);
    let split = split(profile, dimension);
    let mut roots = vec![Complex::new(0.0, 0.0); split.zero];
    roots.extend(vec![Complex::new(1.0, 0.0); split.one]);
    for &(p, q) in &split.rational {
        roots.push(Complex::new(p as f64 / q as f64, 0.0));
    }
    roots.extend(rest_roots(&split.rest));
    let mut log = (split.zero + split.one) as f64 * (0.5 * PI.ln() - LN_2);
    let mut mirror = Complex::new(FRAC_PI_4.powi((split.zero + split.one) as i32), 0.0);
    for r in &roots[split.zero + split.one..] {
        log -= gamma_step(*r).re;
        mirror = mirror * sine_ratio(*r);
    }
    let parity = match parity_of(profile, dimension) {
        Some(odd) => Some((odd, parity_product(dimension as u32, odd)?)),
        None => None,
    };
    Ok(Row {
        profile: profile.to_vec(),
        drift: reduced(drift, 2 * w),
        correction: reduced(correction, 8 * w * w),
        constant: log.exp(),
        closed: spelled(&split),
        reflection: reflected(&split, &roots),
        mirror: mirror.re,
        parity,
        roots,
    })
}

pub fn row_settle(profile: &[u64], stops: &[usize], even: bool) -> Result<Vec<f64>> {
    let dimension = row_dimension(profile)?;
    if stops.first().is_some_and(|&s| s == 0) || stops.windows(2).any(|pair| pair[0] >= pair[1]) {
        return value_error("the stops must rise from level 1.");
    }
    let w: u128 = profile.iter().map(|&a| u128::from(a)).sum();
    let drift = if even {
        0.0
    } else {
        let row = row_law(profile)?;
        row.drift.0 as f64 / row.drift.1 as f64
    };
    let mut out = Vec::with_capacity(stops.len());
    let (mut sum, mut carry) = (0.0f64, 0.0f64);
    let mut next = 0;
    for level in 1..=stops.last().copied().unwrap_or(0) {
        let side = (if even { 2 * level } else { 2 * level + 1 }) as u64;
        let fill = fill_at(profile, dimension, side)?;
        let whole = w * u128::from(side).pow(dimension as u32);
        let excess = (fill << dimension) as i128 - whole as i128;
        let term = (excess as f64 / whole as f64).ln_1p() - carry;
        let total = sum + term;
        carry = (total - sum) - term;
        sum = total;
        if stops[next] == level {
            out.push((sum - drift * (level as f64).ln()).exp());
            next += 1;
        }
    }
    Ok(out)
}
