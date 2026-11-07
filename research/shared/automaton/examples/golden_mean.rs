// A subshift of finite type: binary words where two 1s never touch (the golden mean shift).
// A rule reads windows of width 2; code 0b0111 allows the windows 00, 01 and 10 and forbids 11.
// The count of allowed words of each length is the Fibonacci numbers, and the growth rate (Perron root) is the golden ratio 1.618...
// cargo run -p automaton --example golden_mean
use automaton::memory::{counts, exponent, perron, transfer, Rule};

fn main() {
    let rule = Rule::new(1, 2, 0b0111).unwrap();
    println!("transfer matrix {:?}", transfer(&rule));
    println!("words of length 1..12: {:?}", counts(&rule, 12));
    println!("perron root     {:.12}", perron(&rule));
    println!("golden ratio    {:.12}", (1.0 + 5f64.sqrt()) / 2.0);
    println!("entropy (log2)  {:.6} bits per letter", exponent(&rule));
    for word in [vec![0, 1, 0, 1, 0], vec![0, 1, 1, 0]] {
        println!("{word:?} allowed: {}", rule.accepts(&word));
    }
}
