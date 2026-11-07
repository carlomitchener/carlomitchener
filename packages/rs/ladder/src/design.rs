use mrly_error::{Result, shape_error};
use mrly_fft::fft;
use mrly_num::factor::mobius_sieve;
use std::f64::consts::PI;

pub const ZETA_ORDINATES: [f64; 14] = [
    14.134725141734693,
    21.022039638771556,
    25.01085758014569,
    30.424876125859512,
    32.93506158773919,
    37.58617815882567,
    40.9187190121475,
    43.327073280915,
    48.00515088116716,
    49.7738324776723,
    52.97032147771446,
    56.44624769706339,
    59.34704400260235,
    60.83177852460981,
];

pub fn digits_of(mask: u32, base: u64) -> Vec<u64> {
    (0..base).filter(|&d| mask & (1u32 << d) != 0).collect()
}

pub fn size(digits: &[u64], depth: usize) -> u128 {
    let lead = digits.iter().filter(|&&d| d > 0).count() as u128;
    let k = digits.len() as u128;
    if depth == 0 || lead == 0 {
        return 0;
    }
    let mut run = 1u128;
    let mut total = 0u128;
    for _ in 0..depth {
        total += lead * run;
        run *= k;
    }
    total
}

pub fn meter(mu: &[i8]) -> Vec<i64> {
    let mut total = 0i64;
    mu.iter()
        .map(|&value| {
            total += i64::from(value);
            total
        })
        .collect()
}

pub fn log_grid(values: &[u64], samples: usize) -> Vec<f64> {
    if values.is_empty() || samples == 0 {
        return Vec::new();
    }
    let lo = (values[0] as f64).ln();
    let hi = (values[values.len() - 1] as f64).ln();
    let step = if samples > 1 {
        (hi - lo) / (samples - 1) as f64
    } else {
        0.0
    };
    (0..samples).map(|i| lo + step * i as f64).collect()
}

pub fn resample(values: &[u64], running: &[i64], exponent: f64, log_x: &[f64]) -> Vec<f64> {
    log_x
        .iter()
        .map(|&t| {
            let slot = values.partition_point(|&v| (v as f64).ln() <= t);
            let held = if slot == 0 {
                0.0
            } else {
                running[slot - 1] as f64
            };
            held / (exponent * t).exp()
        })
        .collect()
}

pub fn echo_series(values: &[u64], log_x: &[f64], exponent: f64) -> Vec<f64> {
    let top = match values.last() {
        Some(&value) => value,
        None => return vec![0.0; log_x.len()],
    };
    let mu = mobius_sieve(top as usize);
    let mut out = Vec::with_capacity(log_x.len());
    let mut total = 0.0f64;
    let mut seen = 0u64;
    let mut at = 0usize;
    let mut n = 1u64;
    for &t in log_x {
        let mut bound = t.exp().floor() as u64;
        while bound < top && ((bound + 1) as f64).ln() <= t {
            bound += 1;
        }
        while bound > 0 && (bound as f64).ln() > t {
            bound -= 1;
        }
        while n <= bound {
            if at < values.len() && values[at] == n {
                seen += 1;
                at += 1;
            }
            total += f64::from(mu[n as usize]) * seen as f64 / n as f64;
            n += 1;
        }
        out.push(total / (exponent * t).exp());
    }
    out
}

pub fn spectrum(log_x: &[f64], series: &[f64]) -> Result<(Vec<f64>, Vec<f64>)> {
    let n = series.len();
    if n < 2 || !n.is_power_of_two() {
        return Ok((Vec::new(), Vec::new()));
    }
    if log_x.len() < n {
        return shape_error(format!(
            "the grid holds {} and the series {n}.",
            log_x.len()
        ));
    }
    let step = (log_x[n - 1] - log_x[0]) / (n - 1) as f64;
    let mean = series.iter().sum::<f64>() / n as f64;
    let mut re: Vec<f64> = series
        .iter()
        .enumerate()
        .map(|(i, &value)| {
            let window = 0.5 - 0.5 * (2.0 * PI * i as f64 / (n - 1) as f64).cos();
            (value - mean) * window
        })
        .collect();
    let mut im = vec![0.0f64; n];
    fft(&mut re, &mut im, false)?;
    let range = n as f64 * step;
    let bins = n / 2 + 1;
    let gamma = (0..bins).map(|j| 2.0 * PI * j as f64 / range).collect();
    let power = (0..bins).map(|j| re[j] * re[j] + im[j] * im[j]).collect();
    Ok((gamma, power))
}

pub fn median_floor(power: &[f64], width: usize) -> Vec<f64> {
    let n = power.len();
    if n == 0 || width == 0 {
        return vec![0.0; n];
    }
    let half = width / 2;
    let mut window = vec![0.0f64; width];
    (0..n)
        .map(|i| {
            for (slot, cell) in window.iter_mut().enumerate() {
                let at = (i + slot).saturating_sub(half).min(n - 1);
                *cell = power[at];
            }
            let mid = width / 2;
            let (_, value, _) = window.select_nth_unstable_by(mid, |a, b| a.total_cmp(b));
            *value
        })
        .collect()
}

pub fn score(power: &[f64], width: usize) -> Vec<f64> {
    let floor = median_floor(power, width);
    power
        .iter()
        .zip(floor.iter())
        .map(|(&value, &base)| value / base.max(f64::MIN_POSITIVE))
        .collect()
}

pub fn peaks(gamma: &[f64], score: &[f64], band: (f64, f64), threshold: f64) -> Result<Vec<usize>> {
    if gamma.len() < score.len() {
        return shape_error(format!(
            "the axis holds {} and the score {}.",
            gamma.len(),
            score.len()
        ));
    }
    let mut found: Vec<usize> = (1..score.len().saturating_sub(1))
        .filter(|&i| {
            gamma[i] > band.0
                && gamma[i] < band.1
                && score[i] > score[i - 1]
                && score[i] > score[i + 1]
                && score[i] > threshold
        })
        .collect();
    found.sort_by(|&a, &b| score[b].total_cmp(&score[a]));
    Ok(found)
}

pub fn pole_lattice(base: u64, top: f64) -> Vec<f64> {
    let step = 2.0 * PI / (base as f64).ln();
    let mut out = Vec::new();
    let mut j = 1;
    while step * (j as f64) < top {
        out.push(step * j as f64);
        j += 1;
    }
    out
}

pub fn nearest(value: f64, list: &[f64]) -> f64 {
    list.iter()
        .map(|&entry| (entry - value).abs())
        .fold(f64::INFINITY, f64::min)
}

pub fn upper_rms(series: &[f64]) -> f64 {
    let half = series.len() / 2;
    let tail = &series[half..];
    if tail.is_empty() {
        return 0.0;
    }
    (tail.iter().map(|value| value * value).sum::<f64>() / tail.len() as f64).sqrt()
}
