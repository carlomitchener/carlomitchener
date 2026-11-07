// The series sum of n^-s over numbers with no digit 9 converges only for s above log(9)/log(10) = 0.954.
// The ladder continues it to the left of that line, so s = 0 and s < 0 get values too.
// cargo run -p ladder --example continuation
use ladder::{Design, zeta};
use mrly_num::complex::Complex;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let digits: Vec<u64> = (0..=8).collect();
    let design = Design::new(10, &digits)?;
    println!("abscissa of convergence {:.6}", design.abscissa());
    println!("      s          zeta(s)   bound");
    for s in [2.0, 1.0, 0.5, 0.0, -0.5] {
        let (value, bound) = zeta(&design, Complex::new(s, 0.0), 1e-10)?;
        println!("{s:>7.2}  {:>14.10}  {bound:.0e}", value.re);
    }
    Ok(())
}
