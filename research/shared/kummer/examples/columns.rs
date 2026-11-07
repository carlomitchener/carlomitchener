// Kummer's theorem: p divides the binomial C(a*k, b*k) exactly when adding b*k and (a-b)*k in base p has a carry.
// This walks that addition one base-p digit at a time, for p = 3, a = 5, b = 2: k = 13 carries, k = 16 does not.
// Each line: the digit of k, the carry state, the digits of b*k and (a-b)*k in that column, and the next state (none means a carry).
// cargo run -p kummer --example columns
use kummer::{columns, member};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let (prime, top, bottom) = (3, 5, 2);
    for k in [13, 16] {
        println!("k = {k}, member = {}", member(k, prime, top, bottom)?);
        for column in columns(k, prime, top, bottom)? {
            println!(
                "  digit {}  state {:?}  left {}  right {}  next {:?}",
                column.digit, column.state, column.left, column.right, column.next
            );
        }
    }
    Ok(())
}
