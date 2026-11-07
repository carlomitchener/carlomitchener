// The power of p in C(a*k, b*k), read from carries, against the same power found by dividing the binomial itself.
// Here p = 3, a = 5, b = 2. A member is a k whose power is 0: no carry, p does not divide.
// cargo run -p kummer --example valuation
use kummer::{member, valuation};

fn binomial(n: u128, k: u128) -> u128 {
    (1..=k).fold(1, |acc, i| acc * (n - k + i) / i)
}

fn power_of(mut n: u128, prime: u128) -> u32 {
    let mut power = 0;
    while n.is_multiple_of(prime) {
        n /= prime;
        power += 1;
    }
    power
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let (prime, top, bottom) = (3, 5, 2);
    println!("  k  by carries  by division  member");
    for k in 1..=16u64 {
        let direct = power_of(
            binomial(u128::from(top * k), u128::from(bottom * k)),
            u128::from(prime),
        );
        println!(
            "{k:>3}  {:>10}  {direct:>11}  {}",
            valuation(k, prime, top, bottom)?,
            member(k, prime, top, bottom)?
        );
    }
    Ok(())
}
