// The carry machine behind everything: states are the carries (c, e) pending in b*k and (a-b)*k.
// Reading one base-p digit moves a state to another, or to none when the column carries. Here p = 3, a = 5, b = 2.
// cargo run -p kummer --example carry
use kummer::carry;

// closes marks states from which zero digits flush the carries out without a carry.
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let machine = carry(3, 5, 2)?;
    println!(
        "{} states, digits 0..{}",
        machine.states.len(),
        machine.prime
    );
    for (i, state) in machine.states.iter().enumerate() {
        let moves: Vec<String> = machine.moves[i]
            .iter()
            .map(|m| m.map_or("-".to_string(), |to| format!("{:?}", machine.states[to])))
            .collect();
        println!(
            "state {state:?} closes {:<5}  digit 0, 1, 2 go to {}",
            machine.closes[i],
            moves.join("  ")
        );
    }
    Ok(())
}
