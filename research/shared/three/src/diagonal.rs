pub use mrly_three::diagonal::*;

pub fn shadow(point: [u32; 3]) -> (i64, i64) {
    let (x, y, z) = (point[0] as i64, point[1] as i64, point[2] as i64);
    (x - y, x + y - 2 * z)
}
