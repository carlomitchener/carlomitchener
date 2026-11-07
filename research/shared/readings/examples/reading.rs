// A reading feeds a sequence of numbers into the design instead of 0, 1, 2, ...
// Here Thue-Morse reads n, n^2, n^3 and the primes. Each line is the first 40 signs.
// cargo run -p readings --example reading
use readings::{stream, Design, READINGS};

fn main() {
    let design = Design::thue();
    for reading in READINGS {
        let line: String = stream(design, reading, 40)
            .iter()
            .map(|&s| if s == 1 { '+' } else { '-' })
            .collect();
        println!("{:<14} {:<10} {line}", reading.name(), reading.formula());
    }
}
