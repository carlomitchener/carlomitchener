// A bigger base spreads the sensors: the coarray gains holes, but every sensor becomes essential.
// Generator {0,1,3} at level 2, bases 4 to 10. The last column is what law() predicts for the essential count.
// cargo run -p coarray --example tradeoff
use coarray::{essential, fractal, holes, law};

// law() only looks at the generator, so it is right once the base is big enough (here 6 and up) and too high below.
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let generator = [0, 1, 3];
    let predicted = law(&generator, 2).map_or(0, |(u, _)| u);
    println!("base  sensors  holes  essential  law");
    for base in 4..=10 {
        let sensors = fractal(&generator, base, 2)?;
        let essential = essential(&sensors).iter().filter(|&&x| x).count();
        println!(
            "{base:>4}  {:>7}  {:>5}  {essential:>9}  {predicted}",
            sensors.len(),
            holes(&sensors).len()
        );
    }
    Ok(())
}
