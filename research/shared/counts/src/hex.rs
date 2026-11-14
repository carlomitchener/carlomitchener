use mrly_error::{Result, value_error};
pub use mrly_sequences::counts::hex::*;

pub fn solid_slice_core_nodes(number: usize) -> Result<u128> {
    let k = odd_k(number)? as i128;
    Ok((24 * k * k - 24 * k + 6) as u128)
}

pub fn solid_slice_core_edges(number: usize) -> Result<u128> {
    let k = odd_k(number)? as i128;
    Ok((36 * k * k - 42 * k + 12) as u128)
}

pub fn solid_slice_triangles(number: usize) -> Result<u128> {
    odd_k(number)?;
    Ok(6 * (number as u128).pow(2))
}

pub fn solid_slice_boundary(number: usize) -> Result<u128> {
    odd_k(number)?;
    Ok(6 * number as u128)
}

pub fn solid_slice_interior(number: usize) -> Result<u128> {
    let k = odd_k(number)? as i128;
    Ok((36 * k * k - 42 * k + 12) as u128)
}

pub fn centered_hexagonal(m: usize) -> u128 {
    let m = m as u128;
    3 * m * m - 3 * m + 1
}

pub fn solid_slice_edges(number: usize) -> Result<u128> {
    let k = odd_k(number)? as i128;
    Ok((36 * k * k - 30 * k + 6) as u128)
}

fn odd_k(number: usize) -> Result<u128> {
    if number.is_multiple_of(2) {
        return value_error("solid slice closed form is defined for odd number = 2k-1.");
    }
    Ok(number.div_ceil(2) as u128)
}
