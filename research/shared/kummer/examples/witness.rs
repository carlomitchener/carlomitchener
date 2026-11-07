// Is the set of k with p not dividing C(a*k, b*k) built digit by digit? A witness says no.
// It is a pair u < p and w = v*p, both in the set, whose sum u + w is not. None means the set follows its digits.
// cargo run -p kummer --example witness
use kummer::{member, witness};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("  p   a   b  witness (u, w)  u in   w in   u+w in");
    for (prime, top, bottom) in [
        (3, 2, 1),
        (5, 2, 1),
        (2, 3, 1),
        (5, 3, 1),
        (3, 5, 2),
        (7, 4, 1),
    ] {
        print!("{prime:>3} {top:>3} {bottom:>3}  ");
        match witness(prime, top, bottom)? {
            Some((u, w)) => {
                let text = format!("({u}, {w})");
                println!(
                    "{text:<15} {:<5}  {:<5}  {}",
                    member(u, prime, top, bottom)?,
                    member(w, prime, top, bottom)?,
                    member(u + w, prime, top, bottom)?
                );
            }
            None => println!("none"),
        }
    }
    Ok(())
}
