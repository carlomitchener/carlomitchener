// What does the array lose if one sensor fails?
// For each sensor: the lags that vanish from the difference coarray when it is removed. Empty means the sensor is redundant.
// cargo run -p coarray --example lost
use coarray::{essential, fractal, lost};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let sensors = fractal(&[0, 1, 3], 4, 2)?;
    let keeps = essential(&sensors);
    println!("sensor  essential  lags lost (positive side)");
    for (&s, &needed) in sensors.iter().zip(&keeps) {
        let gone: Vec<i64> = lost(&sensors, s).into_iter().filter(|&t| t > 0).collect();
        println!("{s:>6}  {needed:<9}  {gone:?}");
    }
    Ok(())
}
