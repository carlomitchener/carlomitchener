// How many k below p^level have p not dividing C(2k, k)? The crate counts them with a carry machine.
// Known answer: k qualifies when every base-p digit of k is at most (p-1)/2, so the count is ((p+1)/2)^level.
// cargo run -p kummer --example count
use kummer::count;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("prime  level  count  ((p+1)/2)^level");
    for prime in [3u64, 5, 7, 11] {
        for level in 1..=4 {
            println!(
                "{prime:>5}  {level:>5}  {:>5}  {:>5}",
                count(prime, 2, 1, level)?,
                prime.div_ceil(2).pow(level)
            );
        }
    }
    Ok(())
}
