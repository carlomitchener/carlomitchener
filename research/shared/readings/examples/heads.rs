// A near head is an exact shortcut: the reading at scale*n + offset is a signed copy of the reading at n.
// For n^2, (2n)^2 = 4 n^2 is n^2 shifted two places, and Thue-Morse ignores shifts, so the sign at 2n equals the sign at n.
// Columns: scale and offset, the digits shifted (level), the sign that comes out, and whether it is exact.
// cargo run -p readings --example heads
use readings::{near_heads, Design, Reading};

fn main() {
    let design = Design::thue();
    for reading in [Reading::N, Reading::Square, Reading::Cube] {
        println!("{} ({})", reading.name(), reading.formula());
        let heads = near_heads(design, reading);
        for h in heads.iter().filter(|h| !h.kernel && h.scale <= 4) {
            println!(
                "  scale {} offset {}  level {}  sign {:>2}  exact {}",
                h.scale, h.offset, h.level, h.sign, h.exact
            );
        }
    }
}
