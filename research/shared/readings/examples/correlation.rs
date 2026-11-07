// Correlation between a sign stream and a shifted copy of itself: +1 is the same, -1 is opposite, 0 is unrelated.
// Thue-Morse on n has a known correlation of -1/3 at shift 1. Rudin-Shapiro is built to have almost none.
// Printed: the first 8 shifts for each design, on the first 2^18 signs.
// cargo run -p readings --example correlation
use readings::{battery, name, stream, Design, Reading};

fn main() {
    println!("-1/3 = {:.4}", -1.0 / 3.0);
    for design in [Design::thue(), Design::rudin()] {
        let b = battery(&stream(design, Reading::N, 1 << 18));
        println!();
        println!("{} on n, mean {:.4}", name(design), b.mean);
        for (i, c) in b.shift.iter().take(8).enumerate() {
            println!("  shift {} {:>8.4}", i + 1, c);
        }
    }
}
