use mrly_error::{Result, value_error};
use mrly_math::code::Code;
use mrly_math::factory;
use mrly_tensor::Tensor;
use std::collections::HashMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Skeleton {
    pub counts: Vec<u128>,
    pub euler: i128,
}

impl Skeleton {
    fn from_counts(counts: Vec<u128>) -> Option<Skeleton> {
        let euler = counts
            .iter()
            .enumerate()
            .try_fold(0i128, |sum, (k, &count)| {
                let signed = i128::try_from(count).ok()?;
                if k % 2 == 0 {
                    sum.checked_add(signed)
                } else {
                    sum.checked_sub(signed)
                }
            })?;
        Some(Skeleton { counts, euler })
    }
    pub fn vertices(&self) -> u128 {
        self.counts[0]
    }
    pub fn edges(&self) -> u128 {
        self.counts.get(1).copied().unwrap_or(0)
    }
    pub fn faces(&self) -> u128 {
        self.counts.get(2).copied().unwrap_or(0)
    }
    pub fn cells(&self) -> u128 {
        self.counts[self.counts.len() - 1]
    }
}

fn normalize(mask: u32, dimension: usize) -> u32 {
    let mut shift = 0u32;
    for axis in 0..dimension {
        let bit = 1u32 << axis;
        let low = (0..1u32 << dimension).any(|cell| cell & bit == 0 && mask >> cell & 1 == 1);
        if !low {
            shift |= bit;
        }
    }
    if shift == 0 {
        return mask;
    }
    let mut moved = 0u32;
    for cell in 0..1u32 << dimension {
        if mask >> cell & 1 == 1 {
            moved |= 1 << (cell & !shift);
        }
    }
    moved
}

fn support(mask: u32, dimension: usize) -> u32 {
    (0..1u32 << dimension)
        .filter(|&cell| mask >> cell & 1 == 1)
        .fold(0, |acc, cell| acc | cell)
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Placements {
    dimension: usize,
    states: Vec<u32>,
    transitions: Vec<Vec<(usize, u128)>>,
}

impl Placements {
    pub fn of_tile(tile: &Tensor) -> Result<Placements> {
        let dimension = tile.shape.len();
        if dimension == 0 || dimension > 4 {
            return value_error("the face recurrence runs in one to four dimensions.");
        }
        let cells = 1usize << dimension;
        let states: Vec<u32> = (1..1u32 << cells)
            .filter(|&mask| normalize(mask, dimension) == mask)
            .collect();
        let index: HashMap<u32, usize> = states
            .iter()
            .enumerate()
            .map(|(at, &mask)| (mask, at))
            .collect();
        let shape = &tile.shape;
        let total = tile.size();
        let transitions = states
            .iter()
            .map(|&mask| {
                let mut counts: HashMap<usize, u128> = HashMap::new();
                for flat in 0..total {
                    let mut digit = vec![0usize; dimension];
                    let mut rest = flat;
                    for axis in (0..dimension).rev() {
                        digit[axis] = rest % shape[axis];
                        rest /= shape[axis];
                    }
                    let mut wrapped = 0u32;
                    for axis in 0..dimension {
                        if digit[axis] + 1 == shape[axis] {
                            wrapped |= 1 << axis;
                        }
                    }
                    let fits =
                        (0..cells as u32)
                            .filter(|&cell| mask >> cell & 1 == 1)
                            .all(|cell| {
                                let moved: Vec<usize> = (0..dimension)
                                    .map(|axis| {
                                        (digit[axis] + (cell as usize >> axis & 1)) % shape[axis]
                                    })
                                    .collect();
                                tile.at(tile.index(&moved)) != 0
                            });
                    if !fits {
                        continue;
                    }
                    let mut carried = 0u32;
                    for cell in 0..cells as u32 {
                        if mask >> cell & 1 == 1 {
                            carried |= 1 << (cell & wrapped);
                        }
                    }
                    *counts.entry(index[&carried]).or_insert(0) += 1;
                }
                let mut sorted: Vec<(usize, u128)> = counts.into_iter().collect();
                sorted.sort_unstable();
                sorted
            })
            .collect();
        Ok(Placements {
            dimension,
            states,
            transitions,
        })
    }
    fn state(&self, mask: u32) -> usize {
        let wanted = normalize(mask, self.dimension);
        self.states.binary_search(&wanted).unwrap_or(usize::MAX)
    }
    fn vector(&self, level: u32) -> Option<Vec<u128>> {
        let mut values = vec![0u128; self.states.len()];
        values[self.state(1)] = 1;
        for _ in 0..level {
            let mut next = vec![0u128; self.states.len()];
            for (at, edges) in self.transitions.iter().enumerate() {
                for &(to, count) in edges {
                    next[at] = next[at].checked_add(count.checked_mul(values[to])?)?;
                }
            }
            values = next;
        }
        Some(values)
    }
    fn functional(&self, k: usize) -> Vec<i128> {
        let dimension = self.dimension;
        let mut weights = vec![0i128; self.states.len()];
        for points in 0..1u32 << dimension {
            if points.count_ones() as usize != dimension - k {
                continue;
            }
            let window: Vec<u32> = (0..1u32 << dimension)
                .filter(|&cell| cell & !points == 0)
                .collect();
            for subset in 1..1u32 << window.len() {
                let mask = window
                    .iter()
                    .enumerate()
                    .filter(|&(bit, _)| subset >> bit & 1 == 1)
                    .fold(0u32, |acc, (_, &cell)| acc | 1 << cell);
                let sign = if subset.count_ones() % 2 == 1 { 1 } else { -1 };
                weights[self.state(mask)] += sign;
            }
        }
        weights
    }
    pub fn at(&self, level: u32) -> Option<Skeleton> {
        let values = self.vector(level)?;
        let counts = (0..=self.dimension)
            .map(|k| {
                let total = self.functional(k).iter().zip(&values).try_fold(
                    0i128,
                    |sum, (&weight, &value)| {
                        sum.checked_add(weight.checked_mul(i128::try_from(value).ok()?)?)
                    },
                )?;
                u128::try_from(total).ok()
            })
            .collect::<Option<Vec<u128>>>()?;
        Skeleton::from_counts(counts)
    }
    pub fn roots(&self, k: Option<usize>) -> Vec<(u128, u32)> {
        let mut live = vec![false; self.states.len()];
        for face in 0..=self.dimension {
            if k.is_some_and(|wanted| wanted != face) {
                continue;
            }
            for (at, &weight) in self.functional(face).iter().enumerate() {
                if weight != 0 {
                    live[at] = true;
                }
            }
        }
        let mut order: Vec<usize> = (0..self.states.len()).collect();
        order.sort_by_key(|&at| {
            std::cmp::Reverse(support(self.states[at], self.dimension).count_ones())
        });
        for &at in &order {
            if live[at] {
                for &(to, _) in &self.transitions[at] {
                    live[to] = true;
                }
            }
        }
        let diagonal = |at: usize| -> u128 {
            self.transitions[at]
                .iter()
                .find(|&&(to, _)| to == at)
                .map_or(0, |&(_, count)| count)
        };
        let mut distinct: Vec<u128> = order
            .iter()
            .filter(|&&at| live[at])
            .map(|&at| diagonal(at))
            .collect();
        distinct.sort_unstable();
        distinct.dedup();
        distinct
            .into_iter()
            .map(|root| {
                let mut height = vec![0u32; self.states.len()];
                for &at in order.iter().rev() {
                    if !live[at] {
                        continue;
                    }
                    let below = self.transitions[at]
                        .iter()
                        .filter(|&&(to, _)| to != at)
                        .map(|&(to, _)| height[to])
                        .max()
                        .unwrap_or(0);
                    height[at] = below + u32::from(diagonal(at) == root);
                }
                (root, height.into_iter().max().unwrap_or(0))
            })
            .filter(|&(_, multiplicity)| multiplicity > 0)
            .collect()
    }
    pub fn recurrence(&self, k: Option<usize>) -> Option<Vec<i128>> {
        let mut poly: Vec<i128> = vec![1];
        for (root, multiplicity) in self.roots(k) {
            for _ in 0..multiplicity {
                let mut next = vec![0i128; poly.len() + 1];
                for (power, &coefficient) in poly.iter().enumerate() {
                    next[power] = next[power].checked_add(coefficient)?;
                    next[power + 1] = next[power + 1]
                        .checked_sub(i128::try_from(root).ok()?.checked_mul(coefficient)?)?;
                }
                poly = next;
            }
        }
        Some(poly[1..].iter().map(|&coefficient| -coefficient).collect())
    }
}

pub fn skeleton_of_tile(tile: &Tensor, level: u32) -> Result<Option<Skeleton>> {
    Ok(Placements::of_tile(tile)?.at(level))
}

pub fn skeleton(
    code: Code,
    number: usize,
    dimension: usize,
    base: usize,
    level: u32,
) -> Result<Skeleton> {
    let tile = factory::create(code, number, dimension, base, 1)?;
    match Placements::of_tile(&tile)?.at(level) {
        Some(skeleton) => Ok(skeleton),
        None => value_error("a face count passes a hundred and twenty-eight bits."),
    }
}

pub fn skeleton_recurrence(
    code: Code,
    number: usize,
    dimension: usize,
    base: usize,
    k: Option<usize>,
) -> Result<Vec<i128>> {
    let tile = factory::create(code, number, dimension, base, 1)?;
    match Placements::of_tile(&tile)?.recurrence(k) {
        Some(coefficients) => Ok(coefficients),
        None => value_error("a recurrence coefficient passes a hundred and twenty-eight bits."),
    }
}
