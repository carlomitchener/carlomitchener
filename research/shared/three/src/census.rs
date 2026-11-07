use mrly_math::cell::models::Cell3d;
pub use mrly_three::census::*;

pub fn volume(cell: &Cell3d) -> usize {
    fills(cell)
}

pub fn hidden(cell: &Cell3d) -> u128 {
    6 * fills(cell) as u128 - surface(cell)
}
