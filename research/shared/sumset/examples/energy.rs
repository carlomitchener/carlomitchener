// Additive energy: the sum of r(n)^2, where r(n) counts the ways to write n as a base-3 part plus a base-4 part.
// The crate counts it with a digit recursion; here r(n) is counted directly to confirm the same numbers.
// ratio compares the energy with that of a set spread evenly over 0..=largest.
// cargo run -p sumset --example energy
use mrly_num::digits::elements;
use std::collections::BTreeMap;
use sumset::Pair;

fn direct(three: u32, four: u32) -> u128 {
    let a = elements(3, &[0, 1], three as usize);
    let b = elements(4, &[0, 1], four as usize);
    let mut ways: BTreeMap<u64, u128> = BTreeMap::new();
    for &x in std::iter::once(&0).chain(&a) {
        for &y in std::iter::once(&0).chain(&b) {
            *ways.entry(x + y).or_default() += 1;
        }
    }
    ways.values().map(|r| r * r).sum()
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("  p  q  crate  direct  ratio");
    for (three, four) in [(1, 1), (2, 1), (2, 2), (3, 2), (3, 3), (4, 3), (5, 4)] {
        let pair = Pair::new(three, four)?;
        let energy = pair.energy();
        println!(
            "{three:>3}{four:>3}  {energy:>5}  {:>6}  {:.4}",
            direct(three, four),
            pair.ratio(energy)
        );
    }
    Ok(())
}
