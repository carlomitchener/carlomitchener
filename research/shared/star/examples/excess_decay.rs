// How the arm share differs from the hexagon share as layers are added (carpet, code 23, thin arm).
// The mean excess times layers, plus ln(layers)/4, settles to the constant: the miss shrinks toward 0.
// cargo run -p star --example excess_decay

use star::{constant, decay, Star};

fn main() {
    let excesses = Star::new(23).unwrap().excesses(64, 0).unwrap();
    println!("constant {:.5}", constant());
    println!("layers  settled     miss");
    for layers in [4, 8, 16, 32, 64] {
        let d = decay(&excesses, layers).unwrap();
        println!("{layers:>6} {:>8.5} {:>8.5}", d.logged, d.miss);
    }
}
