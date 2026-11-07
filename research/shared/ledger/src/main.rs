use ledger::{catalog, markdown, Tier, TERMS};
use std::path::Path;
use std::time::Instant;

fn main() {
    witness::dispatch(
        &[
            ledger::witnesses::ALL,
            ledger::markdown::witnesses::ALL,
            ledger::records::witnesses::ALL,
            ledger::terms::witnesses::ALL,
            ledger::windows::witnesses::ALL,
        ]
        .concat(),
    );
    for tier in [Tier::Closed, Tier::Convolved] {
        let clock = Instant::now();
        let rows = catalog(tier, TERMS).len();
        println!(
            "{} tier: {rows} rows in {:.2} s",
            tier.slug(),
            clock.elapsed().as_secs_f64()
        );
    }
    let page = Path::new(env!("CARGO_MANIFEST_DIR")).join("../sequences.md");
    std::fs::write(&page, markdown()).expect("the page is writable");
    println!("wrote {}", page.display());
}
