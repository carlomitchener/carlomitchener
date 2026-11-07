pub use mrly_bang::word::*;
use mrly_error::{Result, value_error};
use mrly_math::code::Code;
use mrly_math::factory;
use mrly_math::factory::MagicLayer;
use mrly_math::name::Bang;
use mrly_tensor::Tensor;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Letter {
    pub fill: u128,
    pub runs_h: u128,
    pub runs_v: u128,
    pub touch_h: u128,
    pub touch_v: u128,
    pub components: u128,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Counts {
    pub side: u128,
    pub fill: u128,
    pub components: u128,
    pub runs_h: u128,
    pub runs_v: u128,
}

fn pieces(tile: &Tensor) -> u128 {
    let (rows, cols) = (tile.shape[0], tile.shape[1]);
    let mut seen = vec![false; rows * cols];
    let mut count = 0u128;
    let mut stack: Vec<usize> = Vec::new();
    for start in 0..rows * cols {
        if tile.at(start) == 0 || seen[start] {
            continue;
        }
        count += 1;
        seen[start] = true;
        stack.push(start);
        while let Some(at) = stack.pop() {
            let (r, c) = (at / cols, at % cols);
            let walk = |next: usize, seen: &mut Vec<bool>, stack: &mut Vec<usize>| {
                if tile.at(next) != 0 && !seen[next] {
                    seen[next] = true;
                    stack.push(next);
                }
            };
            if r > 0 {
                walk(at - cols, &mut seen, &mut stack);
            }
            if r + 1 < rows {
                walk(at + cols, &mut seen, &mut stack);
            }
            if c > 0 {
                walk(at - 1, &mut seen, &mut stack);
            }
            if c + 1 < cols {
                walk(at + 1, &mut seen, &mut stack);
            }
        }
    }
    count
}

pub fn letter(layer: &MagicLayer) -> Result<Letter> {
    if layer.design.dim != 2 {
        return value_error("a letter's run and contact counts are a plane reading.");
    }
    let tile = tile_of(layer)?;
    let (rows, cols) = (tile.shape[0], tile.shape[1]);
    let on = |r: usize, c: usize| tile.at(r * cols + c) != 0;
    let (mut fill, mut runs_h, mut runs_v) = (0u128, 0u128, 0u128);
    let (mut touch_h, mut touch_v) = (0u128, 0u128);
    for r in 0..rows {
        for c in 0..cols {
            if !on(r, c) {
                continue;
            }
            fill += 1;
            if c == 0 || !on(r, c - 1) {
                runs_h += 1;
            }
            if r == 0 || !on(r - 1, c) {
                runs_v += 1;
            }
        }
        if on(r, 0) && on(r, cols - 1) {
            touch_h += 1;
        }
    }
    for c in 0..cols {
        if on(0, c) && on(rows - 1, c) {
            touch_v += 1;
        }
    }
    Ok(Letter {
        fill,
        runs_h,
        runs_v,
        touch_h,
        touch_v,
        components: pieces(&tile),
    })
}

fn mul(a: u128, b: u128) -> Option<u128> {
    a.checked_mul(b)
}

fn closed(read: &Letter) -> bool {
    read.components == 1 || (read.touch_h == 0 && read.touch_v == 0)
}

fn grow(state: &Counts, side: u128, read: &Letter) -> Option<Counts> {
    let fill = mul(state.fill, read.fill)?;
    let runs_h = mul(state.fill, read.runs_h - read.touch_h)?
        .checked_add(mul(state.runs_h, read.touch_h)?)?;
    let runs_v = mul(state.fill, read.runs_v - read.touch_v)?
        .checked_add(mul(state.runs_v, read.touch_v)?)?;
    let components = match (read.touch_h, read.touch_v) {
        (0, 0) => mul(state.fill, read.components)?,
        (0, _) => state.runs_v,
        (_, 0) => state.runs_h,
        _ => state.components,
    };
    Some(Counts {
        side: mul(state.side, side)?,
        fill,
        components,
        runs_h,
        runs_v,
    })
}

pub fn prefixes(layers: &[MagicLayer]) -> Result<Vec<Counts>> {
    let mut state = Counts {
        side: 1,
        fill: 1,
        components: 1,
        runs_h: 1,
        runs_v: 1,
    };
    let mut out = Vec::with_capacity(layers.len());
    for layer in layers {
        let read = letter(layer)?;
        if !closed(&read) {
            return value_error(format!(
                "letter c{} at side {} is neither connected nor contact-free, so its word has no closed component count.",
                layer.design.code, layer.number
            ));
        }
        match grow(&state, layer.number as u128, &read) {
            Some(next) => state = next,
            None => break,
        }
        out.push(state);
    }
    Ok(out)
}

pub fn components(layers: &[MagicLayer]) -> Result<u128> {
    let counts = prefixes(layers)?;
    if counts.len() < layers.len() {
        return value_error("the word's component count passes what a u128 holds.");
    }
    match counts.last() {
        Some(last) => Ok(last.components),
        None => value_error("a word needs at least one letter."),
    }
}

pub fn fills(layers: &[MagicLayer]) -> Result<Vec<u128>> {
    layers
        .iter()
        .map(|layer| Ok(u128::from(tile_of(layer)?.sum())))
        .collect()
}

pub fn side(layers: &[MagicLayer]) -> Result<u128> {
    let mut out = 1u128;
    for layer in layers {
        match out.checked_mul(layer.number as u128) {
            Some(next) => out = next,
            None => return value_error("the word's side passes what a u128 holds."),
        }
    }
    Ok(out)
}

pub fn fill(layers: &[MagicLayer]) -> Result<u128> {
    let mut out = 1u128;
    for count in fills(layers)? {
        match out.checked_mul(count) {
            Some(next) => out = next,
            None => return value_error("the word's fill passes what a u128 holds."),
        }
    }
    Ok(out)
}

pub fn native(layers: &[MagicLayer]) -> bool {
    !layers.is_empty() && layers.iter().all(|l| l.number == l.design.base)
}

pub fn constant_functional(layers: &[MagicLayer]) -> Result<f64> {
    if layers.is_empty() {
        return value_error("a word needs at least one letter.");
    }
    let mut total = 0.0;
    for layer in layers {
        total += (letter(layer)?.components as f64).log2();
    }
    Ok(total / layers.len() as f64)
}

pub fn thue_morse(index: usize) -> usize {
    index.count_ones() as usize % 2
}

pub fn rates(layers: &[MagicLayer]) -> Result<Vec<(f64, f64)>> {
    Ok(prefixes(layers)?
        .iter()
        .enumerate()
        .map(|(index, counts)| {
            let length = (index + 1) as f64;
            (
                (counts.components as f64).log2() / length,
                (counts.fill as f64).log2() / length,
            )
        })
        .collect())
}

pub fn staircase(depth: usize) -> Result<Vec<MagicLayer>> {
    if depth < 1 {
        return value_error("a staircase needs at least one block.");
    }
    let carpet = Bang::new(7, 2, 2);
    let mut out = Vec::new();
    for step in 1..=depth {
        for place in 1..=step {
            out.push(MagicLayer::new(carpet.clone(), 2 * place + 1));
        }
    }
    Ok(out)
}

fn tile_of(layer: &MagicLayer) -> Result<Tensor> {
    factory::create(
        Code::from(layer.design.code),
        layer.number,
        layer.design.dim,
        layer.design.base,
        1,
    )
}
