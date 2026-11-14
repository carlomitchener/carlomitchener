pub use mrly_bang::universe::*;
use mrly_math::code::Code;

pub fn permutations(n: usize) -> Vec<Vec<usize>> {
    if n == 0 {
        return vec![vec![]];
    }
    let mut out = Vec::new();
    let mut items: Vec<usize> = (0..n).collect();
    heap(&mut items, n, &mut out);
    out.sort();
    out
}

pub fn anf(code: Code, dimension: usize) -> Vec<u8> {
    let cells = corners(dimension);
    let mut coeff: Vec<u8> = (0..cells.len())
        .map(|i| ((code.get() >> i) & 1) as u8)
        .collect();
    for axis in 0..dimension {
        for (i, cell) in cells.iter().enumerate() {
            if cell[axis] == 1 {
                let mut lower = cell.clone();
                lower[axis] = 0;
                coeff[i] ^= coeff[corner_index(&lower)];
            }
        }
    }
    coeff
}

pub fn total_exposure(code: Code, dimension: usize) -> bool {
    let cells = corners(dimension);
    let code = code.get();
    for (i, cell) in cells.iter().enumerate() {
        if (code >> i) & 1 == 0 {
            continue;
        }
        for axis in 0..dimension {
            let mut neighbor = cell.clone();
            neighbor[axis] ^= 1;
            if (code >> corner_index(&neighbor)) & 1 == 1 {
                return false;
            }
        }
    }
    true
}

pub fn touches_every_corner(code: Code, dimension: usize) -> bool {
    let all_even: Vec<u8> = vec![0; dimension];
    (code.get() >> corner_index(&all_even)) & 1 == 1
}

fn heap(items: &mut Vec<usize>, k: usize, out: &mut Vec<Vec<usize>>) {
    if k == 1 {
        out.push(items.clone());
        return;
    }
    for i in 0..k {
        heap(items, k - 1, out);
        if k.is_multiple_of(2) {
            items.swap(i, k - 1);
        } else {
            items.swap(0, k - 1);
        }
    }
}
