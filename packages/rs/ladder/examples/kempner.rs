// Kempner's series: the sum of 1/n over every n with no digit 9 in base 10.
// The known value is 22.920676619264..., and the ladder returns it with a certified error bound.
// cargo run -p ladder --example kempner
use ladder::Design;
use ladder::zeta;
use mrly_num::complex::Complex;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // A design is a base and the digits allowed. Zero is allowed but never counts: the sum is over n >= 1.
    let digits: Vec<u64> = (0..=8).collect();
    let design = Design::new(10, &digits)?;
    let (value, bound) = zeta(&design, Complex::new(1.0, 0.0), 1e-10)?;
    println!("sum of 1/n, n without a 9 = {:.12}", value.re);
    println!("certified error bound     = {bound:.1e}");
    Ok(())
}
