use mrly_error::{Result, value_error};

const CEILING: usize = 64;

const SCAN: usize = 8192;

const HALVINGS: usize = 200;

const SWEEPS: usize = 600;

fn overflow<T>() -> Result<T> {
    value_error("the carry arithmetic passes a hundred and twenty-eight bits.")
}

fn product(a: i128, b: i128) -> Result<i128> {
    match a.checked_mul(b) {
        Some(value) => Ok(value),
        None => overflow(),
    }
}

fn total(a: i128, b: i128) -> Result<i128> {
    match a.checked_add(b) {
        Some(value) => Ok(value),
        None => overflow(),
    }
}

fn middle(base: usize) -> Result<usize> {
    if base < 3 || base.is_multiple_of(2) {
        return value_error("the base must be odd and at least three.");
    }
    Ok((base - 1) / 2)
}

fn sized(dimension: usize) -> Result<()> {
    if !(2..=CEILING).contains(&dimension) {
        return value_error(format!("the dimension must be between 2 and {CEILING}."));
    }
    Ok(())
}

fn convolve(left: &[i128], right: &[i128]) -> Result<Vec<i128>> {
    let mut out = vec![0i128; left.len() + right.len() - 1];
    for (i, &x) in left.iter().enumerate() {
        if x == 0 {
            continue;
        }
        for (j, &y) in right.iter().enumerate() {
            if y == 0 {
                continue;
            }
            out[i + j] = total(out[i + j], product(x, y)?)?;
        }
    }
    Ok(out)
}

pub fn digit_polynomial(base: usize, dimension: usize) -> Result<Vec<i128>> {
    let centre = middle(base)?;
    sized(dimension)?;
    let alpha: Vec<i128> = (0..base).map(|digit| i128::from(digit != centre)).collect();
    let mut poly = vec![1i128];
    for _ in 1..dimension {
        poly = convolve(&poly, &alpha)?;
    }
    let mut second = alpha;
    second[centre] += dimension as i128;
    convolve(&poly, &second)
}

pub fn fill(base: usize, dimension: usize) -> Result<i128> {
    middle(base)?;
    sized(dimension)?;
    let mut out = 1i128;
    for _ in 1..dimension {
        out = product(out, base as i128 - 1)?;
    }
    product(out, (base - 1 + dimension) as i128)
}

fn coefficient(poly: &[i128], index: i128) -> i128 {
    if index < 0 || index as usize >= poly.len() {
        0
    } else {
        poly[index as usize]
    }
}

pub fn carry_matrix(base: usize, dimension: usize) -> Result<Vec<Vec<i128>>> {
    let poly = digit_polynomial(base, dimension)?;
    let shift = (middle(base)? * dimension) as i128;
    let q = base as i128;
    let half = ((dimension - 1) / 2) as i128;
    Ok((-half..=half)
        .map(|out| {
            (-half..=half)
                .map(|inside| coefficient(&poly, inside + shift - q * out))
                .collect()
        })
        .collect())
}

pub fn even_block(base: usize, dimension: usize) -> Result<Vec<Vec<i128>>> {
    let poly = digit_polynomial(base, dimension)?;
    let shift = (middle(base)? * dimension) as i128;
    let q = base as i128;
    let width = (dimension - 1) / 2 + 1;
    Ok((0..width)
        .map(|out| {
            (0..width)
                .map(|inside| {
                    let step = shift - q * out as i128;
                    let folded = if inside == 0 {
                        0
                    } else {
                        coefficient(&poly, step - inside as i128)
                    };
                    coefficient(&poly, step + inside as i128) + folded
                })
                .collect()
        })
        .collect())
}

pub fn trace(rows: &[Vec<i128>]) -> i128 {
    (0..rows.len()).map(|index| rows[index][index]).sum()
}

fn multiply(left: &[Vec<i128>], right: &[Vec<i128>]) -> Result<Vec<Vec<i128>>> {
    let n = left.len();
    let mut out = vec![vec![0i128; n]; n];
    for row in 0..n {
        for step in 0..n {
            let weight = left[row][step];
            if weight == 0 {
                continue;
            }
            for col in 0..n {
                out[row][col] = total(out[row][col], product(weight, right[step][col])?)?;
            }
        }
    }
    Ok(out)
}

pub fn characteristic(rows: &[Vec<i128>]) -> Result<Vec<i128>> {
    let n = rows.len();
    let mut held: Vec<Vec<i128>> = (0..n)
        .map(|row| (0..n).map(|col| i128::from(row == col)).collect())
        .collect();
    let mut out = vec![1i128];
    for step in 1..=n {
        let walked = multiply(rows, &held)?;
        let sum = trace(&walked);
        if sum % step as i128 != 0 {
            return value_error("the characteristic polynomial left a remainder.");
        }
        let mark = -sum / step as i128;
        out.push(mark);
        held = walked;
        for (index, row) in held.iter_mut().enumerate().take(n) {
            row[index] = total(row[index], mark)?;
        }
    }
    Ok(out)
}

pub fn determinant(rows: &[Vec<i128>]) -> Result<i128> {
    let poly = characteristic(rows)?;
    let last = poly[rows.len()];
    Ok(if rows.len().is_multiple_of(2) {
        last
    } else {
        -last
    })
}

pub fn ladder(base: usize, dimension: usize, levels: usize) -> Result<Vec<i128>> {
    let block = even_block(base, dimension)?;
    let n = block.len();
    let mut carried = vec![0i128; n];
    carried[0] = 1;
    let mut out = vec![1i128];
    for _ in 0..levels {
        let mut next = vec![0i128; n];
        for row in 0..n {
            let mut sum = 0i128;
            for col in 0..n {
                match block[row][col]
                    .checked_mul(carried[col])
                    .and_then(|part| sum.checked_add(part))
                {
                    Some(value) => sum = value,
                    None => return Ok(out),
                }
            }
            next[row] = sum;
        }
        out.push(next[0]);
        carried = next;
    }
    Ok(out)
}

pub fn perron(rows: &[Vec<i128>]) -> Result<f64> {
    let poly = characteristic(rows)?;
    let bound = rows
        .iter()
        .map(|row| row.iter().sum::<i128>())
        .max()
        .unwrap_or(0) as f64;
    if bound <= 0.0 {
        return value_error("the block has no positive row sum.");
    }
    let mut scaled = Vec::with_capacity(poly.len());
    let mut power = 1.0f64;
    for &term in &poly {
        scaled.push(term as f64 / power);
        power *= bound;
    }
    let value = |y: f64| scaled.iter().fold(0.0f64, |acc, &term| acc * y + term);
    for step in (0..SCAN).rev() {
        let mut lo = step as f64 / SCAN as f64;
        let mut hi = (step + 1) as f64 / SCAN as f64;
        if value(lo) > 0.0 || value(hi) < 0.0 {
            continue;
        }
        for _ in 0..HALVINGS {
            let mid = (lo + hi) / 2.0;
            if value(mid) <= 0.0 {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        return Ok(bound * (lo + hi) / 2.0);
    }
    value_error("the block shows no root inside its row-sum bound.")
}

pub fn sign(base: usize, dimension: usize) -> Result<i32> {
    let block = even_block(base, dimension)?;
    let poly = characteristic(&block)?;
    let full = fill(base, dimension)?;
    let q = base as i128;
    let mut acc = 0i128;
    let mut weight = 1i128;
    for &term in &poly {
        acc = total(product(acc, full)?, product(term, weight)?)?;
        weight = product(weight, q)?;
    }
    Ok(match acc {
        acc if acc > 0 => -1,
        acc if acc < 0 => 1,
        _ => 0,
    })
}

pub fn cap(base: usize) -> Result<usize> {
    middle(base)?;
    let mut top = 0;
    for dimension in 2..=CEILING {
        if sign(base, dimension).is_err() {
            break;
        }
        top = dimension;
    }
    if top < 2 {
        return value_error(format!(
            "base {base} reaches no dimension in exact integers."
        ));
    }
    Ok(top)
}

fn ahead(walk: &[Vec<f64>], vector: &[f64]) -> Vec<f64> {
    walk.iter()
        .map(|row| row.iter().zip(vector).map(|(&a, &x)| a * x).sum())
        .collect()
}

fn behind(walk: &[Vec<f64>], vector: &[f64]) -> Vec<f64> {
    (0..vector.len())
        .map(|col| {
            (0..vector.len())
                .map(|row| walk[row][col] * vector[row])
                .sum()
        })
        .collect()
}

fn top(vector: &[f64]) -> f64 {
    vector.iter().fold(0.0f64, |peak, &x| peak.max(x.abs()))
}

fn settle(walk: &[Vec<f64>], left: bool) -> Option<Vec<f64>> {
    let mut vector = vec![1.0f64; walk.len()];
    for _ in 0..SWEEPS {
        let next = if left {
            behind(walk, &vector)
        } else {
            ahead(walk, &vector)
        };
        let peak = top(&next);
        if peak == 0.0 {
            return None;
        }
        vector = next.iter().map(|&x| x / peak).collect();
    }
    Some(vector)
}

pub fn spectral_ratio(base: usize, dimension: usize) -> Result<Option<f64>> {
    let block = even_block(base, dimension)?;
    let n = block.len();
    if n < 2 {
        return Ok(None);
    }
    let bound = block
        .iter()
        .map(|row| row.iter().sum::<i128>())
        .max()
        .unwrap_or(1) as f64;
    let walk: Vec<Vec<f64>> = block
        .iter()
        .map(|row| row.iter().map(|&x| x as f64 / bound).collect())
        .collect();
    let (right, left) = match (settle(&walk, false), settle(&walk, true)) {
        (Some(right), Some(left)) => (right, left),
        _ => return Ok(None),
    };
    let lead = top(&ahead(&walk, &right));
    let pair: f64 = left.iter().zip(&right).map(|(&u, &v)| u * v).sum();
    if pair == 0.0 || lead == 0.0 {
        return Ok(None);
    }
    let mut trail: Vec<f64> = (0..n).map(|i| 1.0 + 0.37 * ((i * 7) % 5) as f64).collect();
    let mut second = 0.0f64;
    for _ in 0..SWEEPS {
        let share: f64 = left.iter().zip(&trail).map(|(&u, &x)| u * x).sum::<f64>() / pair;
        let cleared: Vec<f64> = trail
            .iter()
            .zip(&right)
            .map(|(&x, &v)| x - share * v)
            .collect();
        let next = ahead(&walk, &cleared);
        second = top(&next);
        if second == 0.0 {
            return Ok(None);
        }
        trail = next.iter().map(|&x| x / second).collect();
    }
    Ok(Some(lead / second))
}
