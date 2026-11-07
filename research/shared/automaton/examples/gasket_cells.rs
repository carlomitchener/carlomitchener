// In dimension 2 a letter is a corner of a square (0 to 3). A width-1 rule that forbids one corner keeps three of four squares at every level.
// Code 0b0111 forbids corner 3, so cells(rule, level) lists the occupied cells of a 2^level grid: the Sierpinski triangle.
// cargo run -p automaton --example gasket_cells
use automaton::memory::{cells, counts, Rule};

fn main() {
    let rule = Rule::new(2, 1, 0b0111).unwrap();
    let level = 5;
    let side = 1usize << level;
    let mut grid = vec![false; side * side];
    for c in cells(&rule, level) {
        grid[c as usize] = true;
    }
    println!("counts {:?}", counts(&rule, level));
    for row in grid.chunks(side) {
        let line: String = row.iter().map(|&on| if on { "# " } else { "  " }).collect();
        println!("{}", line.trim_end());
    }
}
