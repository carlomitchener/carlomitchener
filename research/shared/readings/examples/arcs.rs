// An arc is a fraction num/den on the circle where the signs of n^2 have a large Fourier peak.
// Partial sums grow like length^(1 - eta). Thue-Morse has arcs at 1/3 and 2/3 with eta = 1 - log(3)/log(4), so growth 0.79.
// Shown: arcs with eta below 0.45 for four designs.
// cargo run -p readings --example arcs
use readings::{arcs, name, Design};

fn main() {
    let designs = [
        Design::thue(),
        Design::ternary(),
        Design::digits(3, 1),
        Design::digits(4, 1),
    ];
    for design in designs {
        println!("{}", name(design));
        for a in arcs(design, 0.45) {
            println!(
                "  {}/{}  eta {:.4}  growth {:.4}",
                a.num,
                a.den,
                a.eta,
                1.0 - a.eta
            );
        }
    }
    println!();
    println!("1 - log(3)/log(4) = {:.4}", 1.0 - 3f64.ln() / 4f64.ln());
}
