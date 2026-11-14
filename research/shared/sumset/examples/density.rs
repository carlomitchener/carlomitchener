// How much of 1..x is in the set? Level 12 reaches x = 531441.
// For each power of ten: the density up to x, and the lowest and highest density seen while x grows from the previous power.
// cargo run -p sumset --example density
use sumset::Sumset;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let set = Sumset::new(12)?;
    let edges: Vec<u64> = (0..=5).map(|d| 10u64.pow(d)).collect();
    let bands = set.extremes(&edges)?;
    println!("         x  density     lowest   highest");
    for (x, band) in edges[1..].iter().zip(&bands) {
        let (low, high) = band.unwrap();
        println!(
            "{x:>10}  {:.5}  {low:.5}  {high:.5}",
            set.density(*x).unwrap()
        );
    }
    Ok(())
}
