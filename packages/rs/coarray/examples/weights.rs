// The difference coarray: how many sensor pairs sit exactly t apart, for each lag t.
// A lag with weight 0 is a hole. These 9 sensors cover every lag from 0 to 15, so there is no hole.
// The weights over all lags add up to 9 x 9 = 81 pairs. The array is symmetric, so only lags 0 and up are shown.
// cargo run -p coarray --example weights
use coarray::{fractal, holes, weights};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let sensors = fractal(&[0, 1, 3], 4, 2)?;
    let w = weights(&sensors);
    let span = (w.len() - 1) / 2;
    println!("lag weight");
    for lag in 0..=span {
        let n = w[span + lag];
        println!("{lag:>3}  {n:>2} {}", "#".repeat(n as usize));
    }
    println!(
        "pairs {}, holes {}",
        w.iter().sum::<u64>(),
        holes(&sensors).len()
    );
    Ok(())
}
