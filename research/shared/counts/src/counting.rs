use mrly_error::{Result, value_error};
use mrly_math::code::Code;
use mrly_math::factory;
use mrly_num::factor::reduce;
pub use mrly_sequences::counts::counting::*;

pub fn positions(residue: usize, number: usize, base: usize) -> u128 {
    if residue >= number {
        return 0;
    }
    (number - residue).div_ceil(base) as u128
}

pub fn fill_from_corners(
    filled: &[Vec<u8>],
    number: usize,
    _dimension: usize,
    level: u32,
    base: usize,
) -> u128 {
    let base_fill: u128 = filled
        .iter()
        .map(|corner| {
            corner
                .iter()
                .map(|&r| positions(r as usize, number, base))
                .product::<u128>()
        })
        .sum();
    base_fill.pow(level)
}

pub fn rational(
    code: Code,
    number: usize,
    dimension: usize,
    level: u32,
    base: usize,
) -> Result<(u128, u128)> {
    let total = grid(number, dimension, level);
    if total == 0 {
        return Ok((0, 1));
    }
    Ok(reduce(fill(code, number, dimension, level, base)?, total))
}

pub fn limit(code: Code, dimension: usize, level: u32, base: usize) -> Result<(u128, u128)> {
    let corners = factory::code_to_corners(code, dimension, base)?.len() as u128;
    let slots = (base as u128).pow(dimension as u32);
    let overflow = || value_error("fill ratio limit overflows at this level.");
    let (Some(top), Some(bottom)) = (corners.checked_pow(level), slots.checked_pow(level)) else {
        return overflow();
    };
    Ok(reduce(top, bottom))
}
