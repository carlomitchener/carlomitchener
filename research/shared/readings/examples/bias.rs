// Bias is the running sum of the signs. Fair coins would give about the square root of the length.
// Thue-Morse on n stays at 0 for every e from 1. On n^2, n^2 + n, n^3 and the primes the sum drifts, but far below 2^e.
// Columns: e, then the sum of the first 2^e signs for each reading.
// cargo run -p readings --example bias
use readings::{bias, stream, Design, READINGS};

fn main() {
    let design = Design::thue();
    let exponents: Vec<u32> = (10..=20).collect();
    let rows: Vec<Vec<i64>> = READINGS
        .iter()
        .map(|&r| bias(&stream(design, r, 1 << 20), &exponents))
        .collect();
    print!("{:>3}", "e");
    for r in READINGS {
        print!("{:>14}", r.formula());
    }
    println!();
    for (i, e) in exponents.iter().enumerate() {
        print!("{e:>3}");
        for row in &rows {
            print!("{:>14}", row[i]);
        }
        println!();
    }
}
