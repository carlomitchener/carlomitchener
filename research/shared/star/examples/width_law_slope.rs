// A wider arm changes how fast the excess decays. width_law predicts the slope from the half width.
// Measured slope uses 64 layers of the carpet (code 23); it should match the prediction to 3 digits.
// cargo run -p star --example width_law_slope

use star::{decay, width_law, Star};

fn main() {
    let carpet = Star::new(23).unwrap();
    println!("half predicted measured");
    for half in [0, 2, 4, 8, 16] {
        let excesses = carpet.excesses(64, half).unwrap();
        let slope = decay(&excesses, 64).unwrap().slope.unwrap();
        println!("{half:>4} {:>9.4} {slope:>8.4}", width_law(half));
    }
}
