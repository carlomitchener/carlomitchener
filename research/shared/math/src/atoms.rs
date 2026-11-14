pub use mrly_math::atoms::*;
use mrly_tensor::Tensor;

pub fn carpet_nd(n: usize, rank: usize) -> Tensor {
    build(n, rank, |at| odd(at) <= 1)
}

pub fn net_nd(n: usize, rank: usize) -> Tensor {
    build(n, rank, |at| odd(at) + 1 >= rank)
}

pub fn tree_nd(n: usize, rank: usize, axis: usize) -> Tensor {
    build(n, rank, |at| {
        at.iter().enumerate().all(|(i, c)| i == axis || c % 2 == 0)
    })
}

pub fn void_nd(n: usize, rank: usize) -> Tensor {
    build(n, rank, |at| at.iter().all(|c| c % 2 == at[0] % 2))
}

pub fn point_nd(n: usize, rank: usize) -> Tensor {
    build(n, rank, |at| odd(at) == rank)
}

pub fn dust_nd(n: usize, rank: usize) -> Tensor {
    build(n, rank, |at| odd(at) == 0)
}

pub fn line_nd(n: usize, rank: usize, axis: usize) -> Tensor {
    build(n, rank, |at| {
        at.iter().enumerate().all(|(i, c)| i == axis || c % 2 == 1)
    })
}

pub fn star_nd(n: usize, rank: usize) -> Tensor {
    build(n, rank, |at| odd(at) == 1)
}

fn build(n: usize, rank: usize, mut rule: impl FnMut(&[usize]) -> bool) -> Tensor {
    let mut out = Tensor::new(vec![n; rank]);
    let mut at = vec![0usize; rank];
    for flat in 0..out.size() {
        let mut rest = flat;
        for axis in (0..rank).rev() {
            at[axis] = rest % n;
            rest /= n;
        }
        out.put(flat, i64::from(rule(&at)));
    }
    out
}

fn odd(at: &[usize]) -> usize {
    at.iter().filter(|c| *c % 2 == 1).count()
}
