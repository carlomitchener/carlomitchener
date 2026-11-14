use crate::counting::fill_from_corners;
use crate::counting::positions;
use mrly_graph::core_graph;
pub use mrly_sequences::counts::surface::*;
use mrly_tensor::Tensor;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

fn strides(shape: &[usize]) -> Vec<usize> {
    (0..shape.len())
        .map(|axis| shape[axis + 1..].iter().product())
        .collect()
}

fn occupancy(tile: &Tensor) -> u128 {
    (tile.size() - tile.count(0)) as u128
}

pub fn pairs(tile: &Tensor) -> Vec<(u128, u128)> {
    let shape = &tile.shape;
    let strides = strides(shape);
    (0..shape.len())
        .map(|axis| {
            let (stride, side) = (strides[axis], shape[axis]);
            let (mut adjacent, mut spanning) = (0u128, 0u128);
            for flat in 0..tile.size() {
                if tile.at(flat) == 0 {
                    continue;
                }
                let position = flat / stride % side;
                if position == 0 && tile.at(flat + (side - 1) * stride) != 0 {
                    spanning += 1;
                }
                if position + 1 < side && tile.at(flat + stride) != 0 {
                    adjacent += 1;
                }
            }
            (adjacent, spanning)
        })
        .collect()
}

pub fn exposure_of_tile(tile: &Tensor, level: u32) -> Option<u128> {
    Exposure::of_tile(tile).at(level)
}

pub fn exposure_recurrence(tile: &Tensor) -> Vec<i128> {
    Exposure::of_tile(tile).recurrence()
}

fn branches(grid: &Tensor) -> Option<i128> {
    Some(core_graph(grid).ok()?.branches.len() as i128)
}

pub fn edges_of_tile(tile: &Tensor, level: u32) -> Option<u128> {
    if level == 0 {
        return None;
    }
    let first = branches(tile)?;
    if first == 0 {
        return Some(0);
    }
    if level == 1 {
        return u128::try_from(first).ok();
    }
    let mut seq = vec![first];
    let mut grid = tile.clone();
    for _ in 0..3 {
        grid = grid.kron(tile);
        seq.push(branches(&grid)?);
    }
    let det = seq[0].checked_mul(seq[2])? - seq[1].checked_mul(seq[1])?;
    if det == 0 {
        return None;
    }
    let sum = seq[0].checked_mul(seq[3])? - seq[1].checked_mul(seq[2])?;
    let product = seq[1].checked_mul(seq[3])? - seq[2].checked_mul(seq[2])?;
    while seq.len() < level as usize {
        let last = seq[seq.len() - 1];
        let prior = seq[seq.len() - 2];
        let next = sum.checked_mul(last)? - product.checked_mul(prior)?;
        seq.push(next / det);
    }
    u128::try_from(seq[level as usize - 1]).ok()
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Exposure {
    pub occupancy: u128,
    pub exposed: u128,
    pub axes: Vec<(u128, u128)>,
}

impl Exposure {
    pub fn of_tile(tile: &Tensor) -> Exposure {
        Exposure {
            occupancy: occupancy(tile),
            exposed: tile.exposed(),
            axes: pairs(tile),
        }
    }
    pub fn from_corners(
        filled: &[Vec<u8>],
        number: usize,
        dimension: usize,
        base: usize,
    ) -> Exposure {
        let set: HashSet<&Vec<u8>> = filled.iter().collect();
        let across = |corner: &[u8], axis: usize| -> u128 {
            (0..dimension)
                .filter(|&b| b != axis)
                .map(|b| positions(corner[b] as usize, number, base))
                .product()
        };
        let occupancy = fill_from_corners(filled, number, dimension, 1, base);
        let axes: Vec<(u128, u128)> = (0..dimension)
            .map(|axis| {
                let (mut adjacent, mut spanning) = (0u128, 0u128);
                for corner in filled {
                    let mut next = corner.clone();
                    next[axis] = ((corner[axis] as usize + 1) % base) as u8;
                    if set.contains(&next) {
                        adjacent +=
                            positions(corner[axis] as usize, number.saturating_sub(1), base)
                                * across(corner, axis);
                    }
                    if corner[axis] == 0 && number > 0 {
                        let mut far = corner.clone();
                        far[axis] = ((number - 1) % base) as u8;
                        if set.contains(&far) {
                            spanning += across(corner, axis);
                        }
                    }
                }
                (adjacent, spanning)
            })
            .collect();
        let buried: u128 = axes.iter().map(|&(adjacent, _)| adjacent).sum();
        Exposure {
            occupancy,
            exposed: 2 * dimension as u128 * occupancy - 2 * buried,
            axes,
        }
    }
    pub fn at(&self, level: u32) -> Option<u128> {
        let mut value = self.exposed;
        for step in 1..level {
            let buried = self
                .axes
                .iter()
                .try_fold(0u128, |sum, &(adjacent, spanning)| {
                    sum.checked_add(adjacent.checked_mul(spanning.checked_pow(step)?)?)
                })?;
            value = self
                .occupancy
                .checked_mul(value)?
                .checked_sub(buried.checked_mul(2)?)?;
        }
        Some(value)
    }
    pub fn recurrence(&self) -> Vec<i128> {
        let mut roots: Vec<u128> = self
            .axes
            .iter()
            .map(|&(_, spanning)| spanning)
            .filter(|&spanning| spanning != 0)
            .collect();
        roots.sort_unstable();
        roots.dedup();
        roots.insert(0, self.occupancy);
        let mut poly: Vec<i128> = vec![1];
        for root in roots {
            let mut next = vec![0i128; poly.len() + 1];
            for (power, &coefficient) in poly.iter().enumerate() {
                next[power] += coefficient;
                next[power + 1] -= root as i128 * coefficient;
            }
            poly = next;
        }
        poly[1..].iter().map(|&coefficient| -coefficient).collect()
    }
}
