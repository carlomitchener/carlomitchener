use mrly_error::{Result, overflow_error, value_error};
use mrly_math::code::Code;
use mrly_math::factory::{MagicLayer, code_to_corners};
use serde::{Deserialize, Serialize};

pub const CORNERS: usize = 20;

fn corner_count(dimension: usize, base: usize) -> Result<usize> {
    let count = base.pow(dimension as u32);
    if count >= 128 {
        return overflow_error(format!(
            "dimension {dimension} base {base} has {count} corners, past the 127 a u128 code holds."
        ));
    }
    Ok(count)
}

pub fn usage(number: u128, dimension: usize, base: usize) -> Result<Code> {
    Ok(mask(number, corner_count(dimension, base)? as u128))
}

fn mask(number: u128, radix: u128) -> Code {
    if number == 0 {
        return Code(1);
    }
    let mut out: u128 = 0;
    let mut rest = number;
    while rest > 0 {
        out |= 1 << (rest % radix);
        rest /= radix;
    }
    Code(out)
}

pub fn member(code: Code, number: u128, dimension: usize, base: usize) -> Result<bool> {
    Ok(usage(number, dimension, base)?.get() & !code.get() == 0)
}

pub fn distinct(number: u128, dimension: usize, base: usize) -> Result<u32> {
    Ok(usage(number, dimension, base)?.get().count_ones())
}

pub fn containing(number: u128, dimension: usize, base: usize) -> Result<u128> {
    Ok(1 << (corner_count(dimension, base)? as u32 - distinct(number, dimension, base)?))
}

pub fn coordinates(number: u128, dimension: usize, base: usize) -> Result<Vec<u128>> {
    let radix = corner_count(dimension, base)? as u128;
    let mut out = vec![0u128; dimension];
    let mut rest = number;
    let mut place: u128 = 1;
    while rest > 0 {
        let mut corner = rest % radix;
        for axis in (0..dimension).rev() {
            out[axis] += (corner % base as u128) * place;
            corner /= base as u128;
        }
        rest /= radix;
        place *= base as u128;
    }
    Ok(out)
}

pub fn interleave(coords: &[u128], base: usize) -> Result<u128> {
    if coords.is_empty() {
        return value_error("interleave needs at least one coordinate.");
    }
    let dimension = coords.len();
    let radix = corner_count(dimension, base)? as u128;
    let mut digits = Vec::new();
    let mut rest: Vec<u128> = coords.to_vec();
    while rest.iter().any(|&c| c > 0) {
        let mut corner: u128 = 0;
        for value in rest.iter_mut() {
            corner = corner * base as u128 + *value % base as u128;
            *value /= base as u128;
        }
        digits.push(corner);
    }
    let mut out: u128 = 0;
    for &corner in digits.iter().rev() {
        out = match out.checked_mul(radix).and_then(|v| v.checked_add(corner)) {
            Some(value) => value,
            None => {
                return overflow_error("the woven number passes a hundred and twenty-eight bits.");
            }
        };
    }
    Ok(out)
}

pub fn members(code: Code, dimension: usize, base: usize, count: usize) -> Result<Vec<u128>> {
    let radix = corner_count(dimension, base)? as u128;
    let allowed: Vec<u128> = (0..radix).filter(|&i| (code.get() >> i) & 1 == 1).collect();
    let mut out = Vec::with_capacity(count);
    if count == 0 || allowed.is_empty() {
        return Ok(out);
    }
    if allowed[0] == 0 {
        out.push(0);
    }
    let mut length = 1usize;
    while out.len() < count {
        let mut slots = vec![0usize; length];
        if allowed[0] == 0 {
            slots[0] = 1;
            if allowed.len() == 1 {
                return Ok(out);
            }
        }
        'level: loop {
            let mut value: u128 = 0;
            let mut fits = true;
            for &slot in &slots {
                match value
                    .checked_mul(radix)
                    .and_then(|v| v.checked_add(allowed[slot]))
                {
                    Some(next) => value = next,
                    None => {
                        fits = false;
                        break;
                    }
                }
            }
            if !fits {
                return Ok(out);
            }
            out.push(value);
            if out.len() == count {
                return Ok(out);
            }
            for place in (0..length).rev() {
                slots[place] += 1;
                if slots[place] < allowed.len() {
                    continue 'level;
                }
                slots[place] = usize::from(place == 0 && allowed[0] == 0);
            }
            break;
        }
        length += 1;
        if radix.checked_pow(length as u32 - 1).is_none() {
            return Ok(out);
        }
    }
    Ok(out)
}

pub fn count_below(code: Code, dimension: usize, base: usize, limit: u128) -> Result<u128> {
    let radix = corner_count(dimension, base)? as u128;
    let allowed: Vec<u128> = (0..radix).filter(|&i| (code.get() >> i) & 1 == 1).collect();
    if limit == 0 || allowed.is_empty() {
        return Ok(0);
    }
    let mut digits = Vec::new();
    let mut rest = limit;
    while rest > 0 {
        digits.push(rest % radix);
        rest /= radix;
    }
    digits.reverse();
    let k = allowed.len() as u128;
    let lead = allowed.iter().filter(|&&v| v != 0).count() as u128;
    let mut total: u128 = if allowed[0] == 0 { 1 } else { 0 };
    let mut power: u128 = 1;
    for _ in 1..digits.len() {
        total += lead * power;
        power *= k;
    }
    for (place, &digit) in digits.iter().enumerate() {
        let below = allowed
            .iter()
            .filter(|&&v| v < digit && (place > 0 || v != 0))
            .count() as u128;
        let tail = digits.len() - place - 1;
        total += below * k.pow(tail as u32);
        if !allowed.contains(&digit) {
            break;
        }
    }
    Ok(total)
}

#[derive(Serialize, Deserialize)]
pub struct Press {
    pub dimension: usize,
    pub base: usize,
    corners: usize,
    tallies: Vec<i128>,
}

impl Press {
    pub fn new(dimension: usize, base: usize) -> Result<Press> {
        let corners = corner_count(dimension, base)?;
        if corners > CORNERS {
            return value_error(format!(
                "the tally press holds at most {CORNERS} corners, not {corners}."
            ));
        }
        Ok(Press {
            dimension,
            base,
            corners,
            tallies: vec![0; 1 << corners],
        })
    }
    pub fn add(&mut self, number: u128, weight: i128) {
        self.tallies[mask(number, self.corners as u128).get() as usize] += weight;
    }
    pub fn total(&self, code: Code) -> i128 {
        let code = code.get();
        let mut sum = self.tallies[0];
        let mut sub = code;
        while sub != 0 {
            sum += self.tallies[sub as usize];
            sub = (sub - 1) & code;
        }
        sum
    }
    pub fn totals(&self) -> Vec<i128> {
        let mut out = self.tallies.clone();
        for bit in 0..self.corners {
            for mask in 0..out.len() {
                if mask >> bit & 1 == 1 {
                    out[mask] += out[mask ^ (1 << bit)];
                }
            }
        }
        out
    }
}

fn layer_radix(layer: &MagicLayer) -> u128 {
    (layer.number as u128).pow(layer.design.dim as u32)
}

pub fn layer_table(layer: &MagicLayer) -> Result<Vec<bool>> {
    let corners = code_to_corners(
        Code::from(layer.design.code),
        layer.design.dim,
        layer.design.base,
    )?;
    let dimension = layer.design.dim;
    let base = layer.design.base;
    let side = layer.number;
    let mut out = Vec::with_capacity(side.pow(dimension as u32));
    for cell in 0..side.pow(dimension as u32) {
        let mut rest = cell;
        let mut residue = vec![0u8; dimension];
        for axis in (0..dimension).rev() {
            residue[axis] = ((rest % side) % base) as u8;
            rest /= side;
        }
        out.push(corners.contains(&residue));
    }
    Ok(out)
}

fn word_tables(layers: &[MagicLayer]) -> Result<Vec<Vec<bool>>> {
    if layers.is_empty() {
        return value_error("a word needs at least one layer.");
    }
    let dimension = layers[0].design.dim;
    if layers.iter().any(|l| l.design.dim != dimension) {
        return value_error("all word layers must have the same dimension.");
    }
    layers.iter().map(layer_table).collect()
}

pub fn word_count(layers: &[MagicLayer]) -> Result<u128> {
    let tables = word_tables(layers)?;
    Ok(tables
        .iter()
        .map(|t| t.iter().filter(|&&b| b).count() as u128)
        .product())
}

pub fn word_member(layers: &[MagicLayer], number: u128) -> Result<bool> {
    let tables = word_tables(layers)?;
    let mut rest = number;
    let mut ok = true;
    for (layer, table) in layers.iter().zip(&tables).rev() {
        let radix = layer_radix(layer);
        ok &= table[(rest % radix) as usize];
        rest /= radix;
    }
    if rest > 0 {
        return value_error(format!("number {number} lies past the word's domain."));
    }
    Ok(ok)
}

pub fn word_members(layers: &[MagicLayer]) -> Result<Vec<u128>> {
    let tables = word_tables(layers)?;
    let alphabets: Vec<Vec<u128>> = tables
        .iter()
        .map(|t| {
            t.iter()
                .enumerate()
                .filter(|&(_, &b)| b)
                .map(|(i, _)| i as u128)
                .collect()
        })
        .collect();
    if alphabets.iter().any(|a| a.is_empty()) {
        return Ok(Vec::new());
    }
    let radixes: Vec<u128> = layers.iter().map(layer_radix).collect();
    let mut out = Vec::new();
    let mut slots = vec![0usize; layers.len()];
    loop {
        let mut value: u128 = 0;
        for (place, &slot) in slots.iter().enumerate() {
            value = value * radixes[place] + alphabets[place][slot];
        }
        out.push(value);
        let mut place = layers.len();
        loop {
            if place == 0 {
                return Ok(out);
            }
            place -= 1;
            slots[place] += 1;
            if slots[place] < alphabets[place].len() {
                break;
            }
            slots[place] = 0;
        }
    }
}

pub fn word_profile(layers: &[MagicLayer]) -> Result<Vec<u128>> {
    let tables = word_tables(layers)?;
    let dimension = layers[0].design.dim;
    let mut out = vec![1u128];
    let mut stride: usize = 1;
    for (layer, table) in layers.iter().zip(&tables).rev() {
        let side = layer.number;
        let mut profile = vec![0u128; dimension * (side - 1) + 1];
        for (cell, &filled) in table.iter().enumerate() {
            if filled {
                let mut rest = cell;
                let mut total = 0usize;
                for _ in 0..dimension {
                    total += rest % side;
                    rest /= side;
                }
                profile[total] += 1;
            }
        }
        let mut next = vec![0u128; (profile.len() - 1) * stride + out.len()];
        for (i, &a) in profile.iter().enumerate() {
            if a == 0 {
                continue;
            }
            for (j, &b) in out.iter().enumerate() {
                next[i * stride + j] += a * b;
            }
        }
        out = next;
        stride *= side;
    }
    Ok(out)
}

pub fn profile(code: Code, dimension: usize, base: usize, level: usize) -> Result<Vec<u128>> {
    if level < 1 {
        return value_error("level must be at least 1.");
    }
    let layer = MagicLayer::new(
        mrly_math::name::Bang::new(code.get(), dimension, base),
        base,
    );
    word_profile(&vec![layer; level])
}
