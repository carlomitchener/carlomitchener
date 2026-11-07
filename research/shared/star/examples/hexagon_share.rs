// The share of inked cells on the hexagonal cut through the 3D carpet (code 23), for odd layer numbers.
// n = 1 mod 4 runs low (0.48, 0.43, 0.41, 0.40); n = 3 mod 4 runs high (0.78, 0.69, 0.67, 0.63).
// cargo run -p star --example hexagon_share

use star::Star;

fn main() {
    let carpet = Star::new(23).unwrap();
    for n in [1, 3, 5, 7, 9, 11, 13, 25, 51] {
        let share = carpet.hexagon(n).unwrap();
        println!(
            "n={n:>2} {:>5}/{:<5} {:.5}",
            share.inked,
            share.cells,
            share.value()
        );
    }
}
