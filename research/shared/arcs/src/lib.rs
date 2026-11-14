pub use mrly_arcs::*;
use mrly_error::{Result, overflow_error, value_error};
use mrly_math::code::Code;
use mrly_math::factory::code_to_corners;
use serde::{Deserialize, Serialize};

pub fn trace(side: usize, on: &[bool]) -> Result<Arcs> {
    if side == 0 || on.len() != side * side {
        return value_error("arcs need side^2 cells and a side of at least one.");
    }
    let rows = side * (side + 1);
    let across = |x: usize, y: usize| y * side + x;
    let upright = |x: usize, y: usize| rows + y * (side + 1) + x;
    let pairs = |x: usize, y: usize| {
        let (bottom, top) = (across(x, y), across(x, y + 1));
        let (left, right) = (upright(x, y), upright(x + 1, y));
        if on[y * side + x] {
            [(bottom, left), (top, right)]
        } else {
            [(bottom, right), (top, left)]
        }
    };
    let mut dsu = Dsu {
        parent: (0..2 * rows).collect(),
    };
    let mut ends = vec![0u8; 2 * rows];
    for y in 0..side {
        for x in 0..side {
            for (a, b) in pairs(x, y) {
                ends[a] += 1;
                ends[b] += 1;
                dsu.union(a, b);
            }
        }
    }
    let mut open = vec![false; 2 * rows];
    let mut root = vec![false; 2 * rows];
    for (point, &count) in ends.iter().enumerate() {
        let r = dsu.find(point);
        root[r] = true;
        open[r] |= count == 1;
    }
    let strands = (0..2 * rows).filter(|&r| root[r] && open[r]).count() as u64;
    let loops = (0..2 * rows).filter(|&r| root[r] && !open[r]).count() as u64;
    let mut cells = vec![0u8; side * side];
    for y in 0..side {
        for x in 0..side {
            let [(lower, _), (upper, _)] = pairs(x, y);
            let mut byte = u8::from(on[y * side + x]);
            if !open[dsu.find(lower)] {
                byte |= 2;
            }
            if !open[dsu.find(upper)] {
                byte |= 4;
            }
            cells[y * side + x] = byte;
        }
    }
    Ok(Arcs {
        side,
        cells,
        loops,
        strands,
    })
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Law {
    pub formula: String,
    pub loops: u64,
}

pub fn law(code: Code, base: usize, level: usize) -> Result<Option<Law>> {
    code_to_corners(code, 2, base)?;
    let Ok(n) = u32::try_from(level) else {
        return overflow_error(format!("level {level} is past any loop law."));
    };
    let power = |b: i128, e: u32| b.checked_pow(e);
    let value = |terms: &[Option<i128>]| -> Option<i128> {
        terms
            .iter()
            .try_fold(0i128, |sum, term| sum.checked_add((*term)?))
    };
    let (formula, loops) = match (base, code.get()) {
        (3, 495) => (
            "(8^n - 1)/7 - 3^n + n + 1",
            power(8, n).map(|p| (p - 1) / 7).and_then(|head| {
                value(&[Some(head), power(3, n).map(|p| -p), Some(i128::from(n) + 1)])
            }),
        ),
        (2, 7 | 14) if n == 0 => ("3^(n-1) - 2^n + 1, n >= 1", Some(0)),
        (2, 7 | 14) => (
            "3^(n-1) - 2^n + 1, n >= 1",
            value(&[power(3, n - 1), power(2, n).map(|p| -p), Some(1)]),
        ),
        (2, 11 | 13) if n == 0 => ("3^(n-1) - 2^(n-1), n >= 1", Some(0)),
        (2, 11 | 13) => (
            "3^(n-1) - 2^(n-1), n >= 1",
            value(&[power(3, n - 1), power(2, n - 1).map(|p| -p)]),
        ),
        (2, 9) => ("2^n - 1", power(2, n).map(|p| p - 1)),
        (2, _) => ("0", Some(0)),
        _ => return Ok(None),
    };
    match loops.and_then(|count| u64::try_from(count).ok()) {
        Some(loops) => Ok(Some(Law {
            formula: formula.to_string(),
            loops,
        })),
        None => overflow_error(format!("the loop law passes 64 bits at level {level}.")),
    }
}

struct Dsu {
    parent: Vec<usize>,
}

impl Dsu {
    fn find(&mut self, mut i: usize) -> usize {
        while self.parent[i] != i {
            self.parent[i] = self.parent[self.parent[i]];
            i = self.parent[i];
        }
        i
    }

    fn union(&mut self, a: usize, b: usize) {
        let (ra, rb) = (self.find(a), self.find(b));
        self.parent[ra] = rb;
    }
}
