// The zeta function of a rule: the sum of n^(-s) over every positive integer n whose binary digits obey the rule.
// For the golden mean shift (no two 1 bits touch) the sum converges for s above log2 of the golden ratio, 0.694.
// zeta() returns the value with a proven error bound; the brute-force sum over every n below 2^24 agrees.
// cargo run -p automaton --example zeta
use automaton::memory::Rule;
use automaton::Automaton;
use mrly_num::complex::Complex;

fn main() {
    let rule = Rule::new(1, 2, 0b0111).unwrap();
    let machine = Automaton::new(&rule).unwrap();
    println!("converges for s > {:.6}", machine.abscissa());
    println!("{:>3} {:>16} {:>16}", "s", "zeta(s)", "brute force");
    for s in [2.0, 3.0, 4.0] {
        let (value, bound) = machine.zeta(Complex::new(s, 0.0), 1e-10).unwrap();
        let brute: f64 = (1u64..1 << 24)
            .filter(|n| n & (n >> 1) == 0)
            .map(|n| (n as f64).powf(-s))
            .sum();
        println!(
            "{s:>3} {:>16.10} {brute:>16.10}  bound {bound:.0e}",
            value.re
        );
    }
}
