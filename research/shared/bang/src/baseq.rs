pub use mrly_bang::baseq::*;
use mrly_error::{Result, overflow_error, value_error};
use mrly_math::code::Code;
use num::factor::factorial;

pub const WALK_LIMIT: usize = 20;

pub fn axis_maps(base: usize) -> Vec<Vec<usize>> {
    let mut out: Vec<Vec<usize>> = Vec::new();
    for b in 0..base {
        let rot: Vec<usize> = (0..base).map(|r| (r + b) % base).collect();
        let ref_: Vec<usize> = (0..base).map(|r| (base + b - r) % base).collect();
        if !out.contains(&rot) {
            out.push(rot);
        }
        if !out.contains(&ref_) {
            out.push(ref_);
        }
    }
    out
}

pub fn group_order(base: usize, dimension: usize) -> Result<u128> {
    order(axis_maps(base).len() as u128, dimension)
}

pub fn predicted_group_order(base: usize, dimension: usize) -> Result<u128> {
    let per_axis = if base == 2 { 2u128 } else { 2 * base as u128 };
    order(per_axis, dimension)
}

fn order(per_axis: u128, dimension: usize) -> Result<u128> {
    let axes = match u32::try_from(dimension)
        .ok()
        .and_then(|d| per_axis.checked_pow(d))
    {
        Some(axes) => axes,
        None => return overflow_error(format!("a group over {dimension} axes passes u128")),
    };
    match axes.checked_mul(factorial(dimension)?) {
        Some(out) => Ok(out),
        None => overflow_error(format!("a group over {dimension} axes passes u128")),
    }
}

pub fn carry(element: &[usize], code: Code) -> Code {
    Code(
        element
            .iter()
            .enumerate()
            .filter(|(index, _)| code.get() >> index & 1 == 1)
            .map(|(_, &image)| 1u128 << image)
            .sum(),
    )
}

pub fn total_designs(base: usize, dimension: usize) -> Result<u128> {
    let cells = base.pow(dimension as u32);
    if cells >= 128 {
        return overflow_error(format!(
            "base {base} dimension {dimension} has {cells} cells, past the 127 a u128 count holds."
        ));
    }
    Ok(1 << cells)
}

pub fn bracelets(max_base: usize) -> Result<Vec<u128>> {
    (1..=max_base).map(|q| distinct_designs(q, 1)).collect()
}

pub fn classes(dimension: usize) -> u128 {
    let mut row = vec![1u128];
    for _ in 0..dimension {
        let mut next = vec![1u128; row.len() + 1];
        for k in 1..row.len() {
            next[k] = row[k - 1] + row[k];
        }
        row = next;
    }
    row.iter()
        .try_fold(1u128, |product, corners| product.checked_mul(corners + 1))
        .unwrap_or(u128::MAX)
}

pub fn class_sequence(max_dimension: usize) -> Vec<u128> {
    (1..=max_dimension).map(classes).collect()
}

pub fn fill_from_corners(filled: &[Vec<u8>], number: usize, dimension: usize) -> u128 {
    let even = number.div_ceil(2) as u128;
    let odd = (number / 2) as u128;
    filled
        .iter()
        .map(|corner| {
            let popcount = corner.iter().filter(|&&b| b != 0).count();
            even.pow((dimension - popcount) as u32) * odd.pow(popcount as u32)
        })
        .sum()
}

pub fn even_fill_is_balanced(number: usize, dimension: usize, popcount: u128) -> Result<u128> {
    if !number.is_multiple_of(2) {
        return value_error("the duality collapse holds only at even number.");
    }
    Ok(((number / 2) as u128).pow(dimension as u32) * popcount)
}
