// The continued series has poles at s = alpha - m + 2 pi i j / log(base), alpha = log(count of digits) / log(base).
// Each line gives a pole and its residue, the number the series blows up by: zeta(s) ~ residue / (s - pole).
// cargo run -p ladder --example poles
use ladder::{residue, Design};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let digits: Vec<u64> = (0..=8).collect();
    let design = Design::new(10, &digits)?;
    println!("m  j       pole                       residue");
    for m in 0..=2 {
        for j in 0..=1 {
            let pole = design.pole(m, j);
            let (res, _) = residue(&design, m, j, 1e-10)?;
            println!(
                "{m}  {j}  {:>8.5} {:>+8.5}i   {:>9.6} {:>+9.6}i",
                pole.re, pole.im, res.re, res.im
            );
        }
    }
    Ok(())
}
