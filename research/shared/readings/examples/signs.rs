// A design reads a number n in some base and gives it a sign, +1 or -1, from its digits.
// Thue-Morse (base 2, mask 1) flips on every digit 1. Ternary (3:2) flips on every digit 2.
// Rudin-Shapiro flips on every pair of adjacent 1s in binary. Printed: n = 0..39, + for +1 and - for -1.
// cargo run -p readings --example signs
use readings::{name, sign, Design};

fn main() {
    for design in [Design::thue(), Design::ternary(), Design::rudin()] {
        let line: String = (0..40)
            .map(|n| if sign(design, n) == 1 { '+' } else { '-' })
            .collect();
        println!("{:<14} {line}", name(design));
    }
}
