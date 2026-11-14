// Cut the 3D carpet (code 23) along a thin arm and count inked cells against all cells.
// The closed form arm_law gives the same share for every odd layer number: n + chi8(n) inked of 2n.
// cargo run -p star --example arm_matches_law

use star::{arm_law, Star};

fn main() {
    let carpet = Star::new(23).unwrap();
    println!("   n measured law   same");
    for n in (1..=25).step_by(2) {
        let measured = carpet.arm(n, 0).unwrap();
        let law = arm_law(n).unwrap();
        println!(
            "{n:>4} {:>3}/{:<3} {:>3}/{:<3} {}",
            measured.inked,
            measured.cells,
            law.inked,
            law.cells,
            measured == law
        );
    }
}
