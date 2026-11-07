// Pairs (p, q): sums of a number with p base-3 digits and a number with q base-4 digits, digits 0 and 1 only.
// Each power, 3^p and 4^q, is under three times the other, and the biggest sum (largest) is at most 3^6.
// gap is the run of integers above largest and below the smaller power: no sum reaches them.
// cargo run -p sumset --example pairs
use sumset::pairs;

// clean means the largest sum stays under both powers 3^p and 4^q. copy means 2 * 4^q < 3^p + 5. scale is 4^q / 3^p.
fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("  p  q  largest  gap          clean  copy   scale");
    for pair in pairs(6)? {
        let gap = pair
            .gap()
            .map_or("none".to_string(), |(a, b)| format!("{a}..{b}"));
        println!(
            "{:>3}{:>3}  {:>7}  {gap:<11}  {:<5}  {:<5}  {:.3}",
            pair.three(),
            pair.four(),
            pair.largest(),
            pair.clean(),
            pair.copy(),
            pair.scale()
        );
    }
    Ok(())
}
