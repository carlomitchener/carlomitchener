use mrly_name::named_enum;
use mrly_num::complex::Complex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::f64::consts::TAU;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Design {
    pub base: u8,
    pub mask: u8,
    pub rudin: bool,
}

impl Design {
    pub fn digits(base: u8, mask: u8) -> Design {
        Design {
            base,
            mask,
            rudin: false,
        }
    }
    pub fn thue() -> Design {
        Design::digits(2, 1)
    }
    pub fn ternary() -> Design {
        Design::digits(3, 2)
    }
    pub fn rudin() -> Design {
        Design {
            base: 2,
            mask: 0,
            rudin: true,
        }
    }
}

pub fn designs() -> Vec<Design> {
    let mut out: Vec<Design> = (2..=6u8)
        .flat_map(|base| (1..1u8 << (base - 1)).map(move |mask| Design::digits(base, mask)))
        .collect();
    out.push(Design::rudin());
    out
}

fn fix(design: Design) -> (u8, u8) {
    let base = design.base.clamp(2, 6);
    (base, design.mask & ((1u8 << (base - 1)) - 1))
}

fn has(mask: u8, digit: u8) -> bool {
    digit > 0 && (mask >> (digit - 1)) & 1 == 1
}

pub fn name(design: Design) -> String {
    if design.rudin {
        return "rudin-shapiro".to_string();
    }
    let (base, mask) = fix(design);
    let digits: String = (1..base)
        .filter(|&d| has(mask, d))
        .map(|d| char::from(b'0' + d))
        .collect();
    format!("{base}:{digits}")
}

const EVEN: u128 = 0x5555_5555_5555_5555_5555_5555_5555_5555;
const CHUNKS: [(u8, u64); 3] = [(3, 1_594_323), (5, 1_953_125), (6, 1_679_616)];

struct Reader {
    base: u8,
    mask: u8,
    rudin: bool,
    chunk: u64,
    table: Vec<u8>,
}

impl Reader {
    fn new(design: Design) -> Reader {
        let (base, mask) = fix(design);
        let chunk = CHUNKS
            .iter()
            .find(|&&(b, _)| b == base && !design.rudin)
            .map_or(0, |&(_, c)| c);
        let mut table = vec![0u8; chunk as usize];
        for c in 1..chunk as usize {
            table[c] = table[c / base as usize] ^ u8::from(has(mask, (c % base as usize) as u8));
        }
        Reader {
            base,
            mask,
            rudin: design.rudin,
            chunk,
            table,
        }
    }
    fn digit(&self, digit: u8) -> f64 {
        if has(self.mask, digit) {
            -1.0
        } else {
            1.0
        }
    }
    fn parity(&self, m: u128) -> u8 {
        if self.rudin {
            return ((m & (m >> 1)).count_ones() & 1) as u8;
        }
        match self.base {
            2 => (self.mask & m.count_ones() as u8) & 1,
            4 => {
                let (lo, hi) = (m & EVEN, (m >> 1) & EVEN);
                let mut p = 0;
                if self.mask & 1 != 0 {
                    p ^= (lo & !hi).count_ones() & 1;
                }
                if self.mask & 2 != 0 {
                    p ^= (hi & !lo).count_ones() & 1;
                }
                if self.mask & 4 != 0 {
                    p ^= (hi & lo).count_ones() & 1;
                }
                p as u8
            }
            _ => {
                let mut p = 0u8;
                let mut m = m;
                while m > u64::MAX as u128 {
                    p ^= self.table[(m % self.chunk as u128) as usize];
                    m /= self.chunk as u128;
                }
                let mut m = m as u64;
                while m > 0 {
                    p ^= self.table[(m % self.chunk) as usize];
                    m /= self.chunk;
                }
                p
            }
        }
    }
    fn sign(&self, m: u128) -> i8 {
        1 - 2 * self.parity(m) as i8
    }
}

pub fn sign(design: Design, n: u64) -> i8 {
    let (base, mask) = fix(design);
    if design.rudin {
        return 1 - 2 * ((n & (n >> 1)).count_ones() & 1) as i8;
    }
    let mut p = 0u8;
    let mut m = n;
    while m > 0 {
        p ^= u8::from(has(mask, (m % base as u64) as u8));
        m /= base as u64;
    }
    1 - 2 * p as i8
}

named_enum! {
    #[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
    pub enum Reading {
        N => "n",
        Square => "square",
        SquarePlusN => "square-plus-n",
        Cube => "cube",
        Primes => "primes",
    }
}

pub const READINGS: [Reading; 5] = Reading::all();

impl Reading {
    pub fn formula(self) -> String {
        match self {
            Reading::N => "n",
            Reading::Square => "n^2",
            Reading::SquarePlusN => "n^2 + n",
            Reading::Cube => "n^3",
            Reading::Primes => "p_n",
        }
        .to_string()
    }
    fn coefficients(self) -> Vec<i128> {
        match self {
            Reading::N => vec![0, 1],
            Reading::Square => vec![0, 0, 1],
            Reading::SquarePlusN => vec![0, 1, 1],
            Reading::Cube => vec![0, 0, 0, 1],
            Reading::Primes => Vec::new(),
        }
    }
    fn at(self, n: u128) -> u128 {
        match self {
            Reading::N => n,
            Reading::Square => n * n,
            Reading::SquarePlusN => n * n + n,
            Reading::Cube => n * n * n,
            Reading::Primes => n,
        }
    }
}

fn each_prime(count: usize, mut each: impl FnMut(u64)) {
    if count == 0 {
        return;
    }
    each(2);
    if count == 1 {
        return;
    }
    let nf = count.max(6) as f64;
    let limit = nf * (nf.ln() + nf.ln().ln()) + 100.0;
    let root = limit.sqrt() as usize + 2;
    let mut small = vec![true; root + 1];
    let mut base = Vec::new();
    for i in 2..=root {
        if small[i] {
            if i > 2 {
                base.push(i as u64);
            }
            let mut j = i * i;
            while j <= root {
                small[j] = false;
                j += i;
            }
        }
    }
    const SEGMENT: usize = 1 << 18;
    let mut next: Vec<u64> = base.iter().map(|&p| p * p).collect();
    let mut struck = vec![false; SEGMENT];
    let (mut lo, mut found) = (3u64, 1usize);
    loop {
        let hi = lo + 2 * SEGMENT as u64;
        struck.fill(false);
        for (slot, &p) in next.iter_mut().zip(&base) {
            let mut m = *slot;
            while m < hi {
                struck[((m - lo) / 2) as usize] = true;
                m += 2 * p;
            }
            *slot = m;
        }
        for (i, &hit) in struck.iter().enumerate() {
            if !hit {
                each(lo + 2 * i as u64);
                found += 1;
                if found == count {
                    return;
                }
            }
        }
        lo = hi;
    }
}

pub fn stream(design: Design, reading: Reading, count: u32) -> Vec<i8> {
    let reader = Reader::new(design);
    let count = count as usize;
    if reading == Reading::Primes {
        let mut out = Vec::with_capacity(count);
        each_prime(count, |p| out.push(reader.sign(p as u128)));
        return out;
    }
    (0..count as u128)
        .map(|n| reader.sign(reading.at(n)))
        .collect()
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Dilation {
    pub scale: u8,
    pub offset: u8,
    pub correlation: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Battery {
    pub count: usize,
    pub mean: f64,
    pub shift: Vec<f64>,
    pub dilation: Vec<Dilation>,
    pub kernel: Vec<f64>,
    pub square: f64,
}

fn pearson(count: usize, su: i64, sv: i64, suv: i64) -> f64 {
    let n = count as f64;
    let (mu, mv) = (su as f64 / n, sv as f64 / n);
    let (vu, vv) = (1.0 - mu * mu, 1.0 - mv * mv);
    if count == 0 || vu < 1e-12 || vv < 1e-12 {
        return 0.0;
    }
    (suv as f64 / n - mu * mv) / (vu * vv).sqrt()
}

fn correlate(
    stream: &[i8],
    count: usize,
    u: impl Fn(usize) -> usize,
    v: impl Fn(usize) -> usize,
) -> f64 {
    let (mut su, mut sv, mut suv) = (0i64, 0i64, 0i64);
    for n in 0..count {
        let (a, b) = (stream[u(n)], stream[v(n)]);
        su += a as i64;
        sv += b as i64;
        suv += (a * b) as i64;
    }
    pearson(count, su, sv, suv)
}

pub fn battery(stream: &[i8]) -> Battery {
    let count = (stream.len() / 9).min(stream.len().saturating_sub(64));
    let mean = stream[..count].iter().map(|&y| y as i64).sum::<i64>() as f64 / count.max(1) as f64;
    let shift = (1..=64)
        .map(|h| correlate(stream, count, |n| n, |n| n + h))
        .collect();
    let mut dilation = Vec::with_capacity(44);
    for scale in 2..=9usize {
        for offset in 0..scale {
            dilation.push(Dilation {
                scale: scale as u8,
                offset: offset as u8,
                correlation: correlate(stream, count, |n| n, |n| scale * n + offset),
            });
        }
    }
    let kernel = [2usize, 3]
        .iter()
        .map(|&b| correlate(stream, count, |n| b * n, |n| b * b * n))
        .collect();
    let square = (0..count)
        .map(|n| (stream[n] * stream[2 * n] * stream[3 * n] * stream[6 * n]) as i64)
        .sum::<i64>() as f64
        / count.max(1) as f64;
    Battery {
        count,
        mean,
        shift,
        dilation,
        kernel,
        square,
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Head {
    pub kernel: bool,
    pub scale: u8,
    pub offset: u8,
    pub level: u8,
    pub shift: i32,
    pub tail: u32,
    pub sign: i8,
    pub exact: bool,
}

fn compose(p: &[i128], slope: i128, shift: i128) -> Vec<i128> {
    let mut out = vec![0i128; p.len()];
    let mut power = vec![1i128];
    for (i, &c) in p.iter().enumerate() {
        if i > 0 {
            let mut next = vec![0i128; power.len() + 1];
            for (j, &e) in power.iter().enumerate() {
                next[j] += e * shift;
                next[j + 1] += e * slope;
            }
            power = next;
        }
        for (j, &e) in power.iter().enumerate() {
            out[j] += c * e;
        }
    }
    out
}

fn near_head(
    p: &[i128],
    b: i128,
    phi: (i128, i128),
    psi: (i128, i128),
) -> Option<(u32, i128, i128)> {
    let f = compose(p, phi.0, phi.1);
    let g = compose(p, psi.0, psi.1);
    let k = f.len() - 1;
    if f[k] == 0 || g[k] % f[k] != 0 {
        return None;
    }
    let (mut ratio, mut level) = (g[k] / f[k], 0u32);
    while ratio % b == 0 {
        ratio /= b;
        level += 1;
    }
    if ratio != 1 || level == 0 {
        return None;
    }
    let scale = b.pow(level);
    if (1..=k).any(|i| g[i] != scale * f[i]) {
        return None;
    }
    let s = g[0] - scale * f[0];
    Some((level, s.div_euclid(scale), s.rem_euclid(scale)))
}

pub fn near_heads(design: Design, reading: Reading) -> Vec<Head> {
    let p = reading.coefficients();
    if p.is_empty() {
        return Vec::new();
    }
    let base = if design.rudin { 2 } else { fix(design).0 } as i128;
    let mut pairs: Vec<(bool, i128, i128)> = Vec::new();
    for scale in 2..=9i128 {
        for offset in 0..scale {
            pairs.push((false, scale, offset));
        }
    }
    pairs.push((true, 2, 0));
    pairs.push((true, 3, 0));
    pairs
        .into_iter()
        .filter_map(|(kernel, scale, offset)| {
            let (phi, psi) = if kernel {
                ((scale, 0), (scale * scale, 0))
            } else {
                ((1, 0), (scale, offset))
            };
            let (level, shift, tail) = near_head(&p, base, phi, psi)?;
            let top = (tail >> (level - 1)) & 1 == 1;
            Some(Head {
                kernel,
                scale: scale as u8,
                offset: offset as u8,
                level: level as u8,
                shift: shift.clamp(i32::MIN as i128, i32::MAX as i128) as i32,
                tail: tail.min(u32::MAX as i128) as u32,
                sign: sign(design, tail as u64),
                exact: shift == 0 && !(design.rudin && top),
            })
        })
        .collect()
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Arc {
    pub num: u32,
    pub den: u32,
    pub eta: f64,
    pub amplitude_re: f64,
    pub amplitude_im: f64,
}

const MOMENTS: usize = 44;
const SERIES: u32 = 14;
const ZERO: Complex = Complex::new(0.0, 0.0);
const ONE: Complex = Complex::new(1.0, 0.0);

fn turn(num: u64, den: u64) -> Complex {
    Complex::turn(TAU * (num % den) as f64 / den as f64)
}

fn power(z: Complex, n: u32) -> Complex {
    (0..n).fold(ONE, |a, _| a * z)
}

fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 {
        a
    } else {
        gcd(b, a % b)
    }
}

fn inverse(a: u64, m: u64) -> u64 {
    let (mut r0, mut r1) = ((a % m) as i128, m as i128);
    let (mut s0, mut s1) = (1i128, 0i128);
    while r1 != 0 {
        let q = r0 / r1;
        (r0, r1) = (r1, r0 - q * r1);
        (s0, s1) = (s1, s0 - q * s1);
    }
    s0.rem_euclid(m as i128) as u64
}

fn gauss(a: u64, q: u64) -> Complex {
    (0..q).fold(ZERO, |s, x| s + turn(a * (x * x % q) % q, q))
}

struct Point {
    num: u64,
    den: u64,
    tile: Vec<Complex>,
    sigma: Complex,
    eta: f64,
}

fn points(reader: &Reader) -> Vec<Point> {
    let b = reader.base as u64;
    let big = b * b;
    let m = big - 1;
    (0..m)
        .map(|c| {
            let tile: Vec<Complex> = (0..big)
                .map(|t| {
                    turn(c * t % m, m) * (reader.digit((t % b) as u8) * reader.digit((t / b) as u8))
                })
                .collect();
            let sigma = tile.iter().fold(ZERO, |s, &y| s + y);
            let size = Complex::abs(sigma);
            let eta = if size < 1e-9 {
                f64::INFINITY
            } else {
                1.0 - size.ln() / (big as f64).ln()
            };
            let g = gcd(c, m);
            Point {
                num: c / g,
                den: m / g,
                tile,
                sigma,
                eta,
            }
        })
        .collect()
}

fn riesz(point: &Point) -> Vec<Complex> {
    let big = point.tile.len() as f64;
    point.tile.iter().map(|&y| y * big / point.sigma).collect()
}

fn units(p: u64) -> (u32, Vec<u64>) {
    let c = match p {
        2 => 3,
        3 => 2,
        _ => 1,
    };
    let m = p.pow(c);
    let mut s: Vec<u64> = (1..m).filter(|u| u % p != 0).map(|u| u * u % m).collect();
    s.sort_unstable();
    s.dedup();
    (c, s)
}

fn expect(p: u64, t: u32, e: u32, r: &[Complex]) -> Complex {
    let (c, allowed) = units(p);
    let big = p.pow(t);
    let digits = (e + c).div_ceil(t) + 1;
    let span = p.pow(t * digits - e);
    let (pc, pe) = (p.pow(c), p.pow(e));
    let mut sum = ZERO;
    let mut count = 0u64;
    for w in (0..span).filter(|w| w % p != 0 && allowed.contains(&(w % pc))) {
        let mut v = pe * w;
        let mut prod = ONE;
        for _ in 0..digits {
            prod = prod * r[(v % big) as usize];
            v /= big;
        }
        sum = sum + prod;
        count += 1;
    }
    sum * (1.0 / count as f64)
}

fn prime_power(p: u64, t: u32, r: &[Complex]) -> Complex {
    let big = p.pow(t) as f64;
    let mut sum = ZERO;
    for j in 0..t {
        let (a, e) = (2 * j / t, 2 * j % t);
        let weight = (1.0 - 1.0 / p as f64) / (p as f64).powi(j as i32);
        sum = sum + power(r[0], a) * expect(p, t, e, r) * weight;
    }
    sum / (ONE - power(r[0], 2) * (1.0 / big))
}

struct Six<'a> {
    r: &'a [Complex],
    memo: HashMap<(u32, u64, u32, u64), Complex>,
    inv9: Vec<u64>,
    inv4: Vec<u64>,
}

impl Six<'_> {
    fn new(r: &[Complex]) -> Six<'_> {
        Six {
            r,
            memo: HashMap::new(),
            inv9: (0..64).map(|n| inverse(9, 1u64 << n)).collect(),
            inv4: (0..41).map(|n| inverse(4, 3u64.pow(n))).collect(),
        }
    }
    fn class(&mut self, s2: u32, t2: u64, s3: u32, t3: u64) -> Complex {
        if s2 == 0 && s3 == 0 {
            return ONE;
        }
        if let Some(&v) = self.memo.get(&(s2, t2, s3, t3)) {
            return v;
        }
        let (l2, l3) = (s2.min(2), s3.min(2));
        let (m2, m3) = (1u64 << l2, 3u64.pow(l3));
        let (q2, q3) = (1i128 << s2, 3i128.pow(s3));
        let (n2, n3) = (s2 - l2, s3 - l3);
        let mut sum = ZERO;
        let mut count = 0;
        for d in (0..36u64).filter(|d| d % m2 == t2 % m2 && d % m3 == t3 % m3) {
            let u2 = if n2 > 0 {
                let diff = (t2 as i128 - d as i128).rem_euclid(q2) as u128 / 4;
                (diff * self.inv9[n2 as usize] as u128 % (1u128 << n2)) as u64
            } else {
                0
            };
            let u3 = if n3 > 0 {
                let diff = (t3 as i128 - d as i128).rem_euclid(q3) as u128 / 9;
                (diff * self.inv4[n3 as usize] as u128 % 3u128.pow(n3)) as u64
            } else {
                0
            };
            let inner = self.class(n2, u2, n3, u3);
            sum = sum + self.r[d as usize] * inner;
            count += 1;
        }
        let v = sum * (1.0 / count as f64);
        self.memo.insert((s2, t2, s3, t3), v);
        v
    }
}

fn coset(g: u64, i: u32, allowed: &[u64], m: u64) -> Vec<u64> {
    let gi = (0..i).fold(1u64, |a, _| a * g % m);
    let mut s: Vec<u64> = allowed.iter().map(|a| a * gi % m).collect();
    s.sort_unstable();
    s.dedup();
    s
}

fn six_adic(r: &[Complex]) -> Complex {
    let (c2, a2) = units(2);
    let (c3, a3) = units(3);
    let mut six = Six::new(r);
    let denom = (ONE - power(r[0], 2) * (1.0 / 36.0)) * 3.0;
    let mut total = ZERO;
    for j in 0..2u32 {
        let lead = power(r[0], j) * 6f64.powi(-(j as i32));
        for e in 0..=SERIES {
            let pairs = if e == 0 {
                vec![(0, 0)]
            } else {
                vec![(e, 0), (0, e)]
            };
            for (e2, e3) in pairs {
                let weight = 2f64.powi(-(e2 as i32)) * 3f64.powi(-(e3 as i32));
                let (v2, v3) = (2 * e2, 2 * e3);
                let s2 = coset(3, 2 * e3, &a2, 1 << c2);
                let s3 = coset(2, 2 * e2, &a3, 3u64.pow(c3));
                let mut avg = ZERO;
                for &x2 in &s2 {
                    for &x3 in &s3 {
                        let t2 = ((1u128 << v2) * x2 as u128 % (1u128 << (v2 + c2))) as u64;
                        let t3 = (3u128.pow(v3) * x3 as u128 % 3u128.pow(v3 + c3)) as u64;
                        avg = avg + six.class(v2 + c2, t2, v3 + c3, t3);
                    }
                }
                let part = avg * (weight / (s2.len() * s3.len()) as f64);
                total = total + lead * part / denom;
            }
        }
    }
    total
}

fn adic(base: u8, point: &Point) -> Complex {
    let r = riesz(point);
    match base {
        2 => prime_power(2, 2, &r),
        3 => prime_power(3, 2, &r),
        4 => prime_power(2, 4, &r),
        5 => prime_power(5, 2, &r),
        _ => six_adic(&r),
    }
}

pub fn arcs(design: Design, cut: f64) -> Vec<Arc> {
    if design.rudin {
        return Vec::new();
    }
    let reader = Reader::new(design);
    let cut = cut.min(0.5 - 1e-9);
    let mut out: Vec<Arc> = points(&reader)
        .iter()
        .filter(|p| p.eta < cut)
        .map(|p| {
            let weight = gauss((p.den - p.num % p.den) % p.den, p.den) * (1.0 / p.den as f64);
            let amplitude = if Complex::abs(weight) < 1e-12 {
                ZERO
            } else {
                weight * adic(reader.base, p)
            };
            Arc {
                num: p.num as u32,
                den: p.den as u32,
                eta: p.eta,
                amplitude_re: amplitude.re,
                amplitude_im: amplitude.im,
            }
        })
        .collect();
    out.sort_by(|x, y| {
        x.eta
            .total_cmp(&y.eta)
            .then(x.den.cmp(&y.den))
            .then(x.num.cmp(&y.num))
    });
    out
}

fn moments(reader: &Reader, num: u64, den: u64, levels: usize) -> Vec<[Complex; MOMENTS]> {
    let b = reader.base as usize;
    let bf = b as f64;
    let mut binom = [[0.0f64; MOMENTS]; MOMENTS];
    binom[0][0] = 1.0;
    for i in 1..MOMENTS {
        let (done, rest) = binom.split_at_mut(i);
        let last = &done[i - 1];
        rest[0][0] = 1.0;
        for l in 1..=i {
            rest[0][l] = last[l - 1] + if l < i { last[l] } else { 0.0 };
        }
    }
    let inv: Vec<f64> = (0..MOMENTS).map(|l| bf.powi(-(l as i32))).collect();
    let mut mu = vec![[ZERO; MOMENTS]; levels + 1];
    for (i, m) in mu[0].iter_mut().enumerate() {
        *m = Complex::new((-0.5f64).powi(i as i32), 0.0);
    }
    let mut shift = num % den;
    for j in 1..=levels {
        let mut next = [ZERO; MOMENTS];
        for dg in 0..b {
            let ph = turn(dg as u64 * shift % den, den) * reader.digit(dg as u8);
            let a = (2.0 * dg as f64 + 1.0 - bf) / (2.0 * bf);
            let pa: Vec<f64> = (0..MOMENTS).map(|m| a.powi(m as i32)).collect();
            for (i, slot) in next.iter_mut().enumerate() {
                let mut acc = ZERO;
                for l in 0..=i {
                    acc = acc + mu[j - 1][l] * (binom[i][l] * inv[l] * pa[i - l]);
                }
                *slot = *slot + ph * acc;
            }
        }
        mu[j] = next;
        shift = shift * b as u64 % den;
    }
    mu
}

fn digits(mut m: u128, b: u128) -> Vec<u64> {
    let mut out = Vec::new();
    while m > 0 {
        out.push((m % b) as u64);
        m /= b;
    }
    out
}

fn weighted(reader: &Reader, num: u64, den: u64, tops: &[u128]) -> Vec<Complex> {
    let b = reader.base as u128;
    let s = -0.5f64;
    let levels = tops
        .iter()
        .map(|&m| digits(m, b).len())
        .max()
        .unwrap_or(1)
        .max(1);
    let mu = moments(reader, num, den, levels);
    let mut taylor = [0.0f64; MOMENTS];
    taylor[0] = 1.0;
    for i in 1..MOMENTS {
        taylor[i] = taylor[i - 1] * (s - (i - 1) as f64) / i as f64;
    }
    let mut bj = vec![1u64; levels + 1];
    for j in 1..=levels {
        bj[j] = bj[j - 1] * reader.base as u64 % den;
    }
    let block = |c: u128, j: usize| -> Complex {
        let cf = c as f64 + 0.5;
        let mut acc = ZERO;
        let mut pw = 1.0;
        for (m, &g) in mu[j].iter().zip(&taylor) {
            acc = acc + *m * (g * pw);
            pw /= cf;
        }
        let ph = turn((c % den as u128) as u64 * bj[j] % den * num % den, den);
        let sign = 1.0 - 2.0 * reader.parity(c) as f64;
        acc * ph * (sign / 2.0 * (reader.base as f64).powf(j as f64 * s) * cf.powf(s))
    };
    let mut low = vec![ZERO; levels + 1];
    for j in 1..=levels {
        let mut add = ZERO;
        for c in 1..b {
            add = add + block(c, j - 1);
        }
        low[j] = low[j - 1] + add;
    }
    tops.iter()
        .map(|&m| {
            let dg = digits(m, b);
            let mut out = ZERO;
            let mut prefix = 0u128;
            for j in (0..dg.len()).rev() {
                for x in 0..dg[j] as u128 {
                    let c = prefix * b + x;
                    out = out + if c == 0 { low[j] } else { block(c, j) };
                }
                prefix = prefix * b + dg[j] as u128;
            }
            out
        })
        .collect()
}

pub fn model(design: Design, cut: f64, exponents: &[u32]) -> Vec<f64> {
    let tops: Vec<u128> = exponents
        .iter()
        .map(|&e| 1u128 << (2 * e.min(63)))
        .collect();
    let mut out = vec![1.0f64; tops.len()];
    if design.rudin {
        return out;
    }
    let reader = Reader::new(design);
    for arc in arcs(design, cut) {
        let amplitude = Complex::new(arc.amplitude_re, arc.amplitude_im);
        for (slot, u) in
            out.iter_mut()
                .zip(weighted(&reader, arc.num as u64, arc.den as u64, &tops))
        {
            *slot += (amplitude * u).re;
        }
    }
    out
}

pub fn bias(stream: &[i8], exponents: &[u32]) -> Vec<i64> {
    exponents
        .iter()
        .map(|&e| {
            let top = 1usize
                .checked_shl(e)
                .unwrap_or(usize::MAX)
                .min(stream.len());
            stream[..top].iter().map(|&y| y as i64).sum()
        })
        .collect()
}
