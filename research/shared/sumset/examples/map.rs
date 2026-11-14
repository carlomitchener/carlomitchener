// Which integers are sums of a number with base-3 digits 0 and 1, and a number with base-4 digits 0 and 1?
// Level 6 covers 0 to 729, written 73 to a row. # is in the set, . is not. The last cell, 729 = 3^6, is always in.
// cargo run -p sumset --example map
use sumset::Sumset;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let set = Sumset::new(6)?;
    let marks: Vec<char> = (0..=set.top())
        .map(|x| {
            if set.contains(x) == Some(true) {
                '#'
            } else {
                '.'
            }
        })
        .collect();
    for row in marks.chunks(73) {
        println!("{}", row.iter().collect::<String>());
    }
    println!(
        "{} of {} integers in 1..={}",
        set.count(set.top()).unwrap(),
        set.top(),
        set.top()
    );
    Ok(())
}
