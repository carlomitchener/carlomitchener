// Numbers with no digit 9 know the zeros of the Riemann zeta function.
// Sum the Moebius function over them, scale, and take a Fourier transform in log n: peaks show up near the zero heights.
// Each line is one peak next to the closest true zero height.
// cargo run -p ladder --example zeros
use ladder::design::{ZETA_ORDINATES, echo_series, log_grid, peaks, score, spectrum};
use mrly_num::digits::elements;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let digits: Vec<u64> = (0..=8).collect();
    let mut values = elements(10, &digits, 6);
    values.retain(|&n| n > 0);

    // 4096 samples evenly spaced in log n: the spectrum needs a power of two.
    let grid = log_grid(&values, 4096);
    let series = echo_series(&values, &grid, 0.5);
    let (gamma, power) = spectrum(&grid, &series)?;
    let strength = score(&power, 64);
    let found = peaks(&gamma, &strength, (5.0, 45.0), 100.0)?;

    println!(
        "{} numbers, {} peaks above 100 times the floor",
        values.len(),
        found.len()
    );
    println!("  peak    nearest zero   gap");
    let mut rows: Vec<f64> = found.iter().map(|&i| gamma[i]).collect();
    rows.sort_by(f64::total_cmp);
    for g in rows {
        let zero = ZETA_ORDINATES
            .iter()
            .copied()
            .min_by(|a, b| (a - g).abs().total_cmp(&(b - g).abs()))
            .unwrap();
        println!("{g:>7.3}  {zero:>12.3}  {:.3}", (g - zero).abs());
    }
    Ok(())
}
