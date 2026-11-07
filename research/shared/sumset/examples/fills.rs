// How full is each stretch of the line? Level 8 splits 0..6561 into 24 equal windows.
// The number is the share of integers in the window that are in the set; each # is 2.5%.
// cargo run -p sumset --example fills
use sumset::Sumset;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let set = Sumset::new(8)?;
    let cells = 24;
    let fills = set.fills(0, set.top() + 1, cells)?;
    for (i, fill) in fills.iter().enumerate() {
        let low = i as u64 * (set.top() + 1) / cells as u64;
        println!(
            "{low:>5}  {:.3}  {}",
            fill,
            "#".repeat((fill * 40.0).round() as usize)
        );
    }
    Ok(())
}
