pub use limit::{limit, parity_product, solid_limit};
use mrly_error::{Result, overflow_error, value_error};
pub use row::{Row, row_fill, row_law, row_profile, row_settle};
use std::f64::consts::FRAC_PI_4;

mod limit;

mod row;

pub const PLANE_LIMIT: f64 = FRAC_PI_4;

pub fn odd_word(levels: usize) -> Vec<u64> {
    (1..=levels as u64).map(|k| 2 * k + 1).collect()
}

pub fn flat_word(side: u64, levels: usize) -> Vec<u64> {
    vec![side; levels]
}

fn letter(side: u64) -> Result<u64> {
    if side < 3 || side.is_multiple_of(2) {
        return value_error(format!("a letter is an odd side from three, not {side}."));
    }
    Ok(side)
}

pub fn side(word: &[u64]) -> Result<u128> {
    let mut run = 1u128;
    for &s in word {
        run = match run.checked_mul(u128::from(letter(s)?)) {
            Some(value) => value,
            None => return overflow_error("the word's side overruns a u128."),
        };
    }
    Ok(run)
}

pub fn cells(word: &[u64], dimension: u32) -> Result<u128> {
    let mut run = 1u128;
    for &s in word {
        let fill = u128::from(letter(s)?).pow(dimension) - 1;
        run = match run.checked_mul(fill) {
            Some(value) => value,
            None => return overflow_error("the word's cells overrun a u128."),
        };
    }
    Ok(run)
}

pub fn holes(word: &[u64], dimension: u32) -> Result<u128> {
    let mut total = 0u128;
    for place in 0..word.len() {
        total += cells(&word[..place], dimension)?;
    }
    Ok(total)
}

pub fn ratio(word: &[u64], dimension: u32) -> Result<f64> {
    let mut run = 1.0f64;
    for &s in word {
        run *= 1.0 - 1.0 / (letter(s)? as f64).powi(dimension as i32);
    }
    Ok(run)
}

pub fn exponent(word: &[u64], dimension: u32) -> Result<f64> {
    let mut up = 0.0f64;
    let mut down = 0.0f64;
    for &s in word {
        let s = letter(s)? as f64;
        up += (s.powi(dimension as i32) - 1.0).ln();
        down += s.ln();
    }
    if down == 0.0 {
        return Ok(dimension as f64);
    }
    Ok(up / down)
}

pub fn raster(word: &[u64]) -> Result<(usize, Vec<u8>)> {
    let mut side = 1usize;
    let mut sites = vec![1u8];
    for &s in word {
        let s = letter(s)? as usize;
        let half = s / 2;
        let wide = side * s;
        let mut next = vec![0u8; wide * wide];
        for row in 0..side {
            for col in 0..side {
                if sites[row * side + col] == 0 {
                    continue;
                }
                for i in 0..s {
                    for j in 0..s {
                        if i == half && j == half {
                            continue;
                        }
                        next[(row * s + i) * wide + col * s + j] = 1;
                    }
                }
            }
        }
        side = wide;
        sites = next;
    }
    Ok((side, sites))
}

pub fn punctures(word: &[u64], dimension: u32) -> Result<Vec<u64>> {
    let axes = dimension as usize;
    let mut scale = side(word)? as u64;
    let mut alive: Vec<u64> = vec![0; axes];
    let mut out: Vec<u64> = Vec::new();
    let mut digits = vec![0u64; axes];
    for (place, &s) in word.iter().enumerate() {
        let s = letter(s)?;
        let half = s / 2;
        let last = place + 1 == word.len();
        scale /= s;
        let count = s.pow(dimension);
        let mut next: Vec<u64> = Vec::new();
        for origin in alive.chunks(axes) {
            for axis in origin {
                out.push((axis * s + half) * scale);
            }
            out.push(scale);
            if last {
                continue;
            }
            for index in 0..count {
                let mut rest = index;
                let mut centre = true;
                for axis in (0..axes).rev() {
                    digits[axis] = rest % s;
                    centre &= digits[axis] == half;
                    rest /= s;
                }
                if centre {
                    continue;
                }
                for axis in 0..axes {
                    next.push(origin[axis] * s + digits[axis]);
                }
            }
        }
        if !last {
            alive = next;
        }
    }
    Ok(out)
}
