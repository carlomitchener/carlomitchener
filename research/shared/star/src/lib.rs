use mrly_error::{value_error, Result};
use mrly_math::code::Code;
use mrly_math::factory::code_to_corners;
use num::series::{CATALAN, EULER};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Share {
    pub inked: i64,
    pub cells: i64,
}

impl Share {
    pub fn value(self) -> f64 {
        self.inked as f64 / self.cells as f64
    }

    pub fn reduced(self) -> (i64, i64) {
        let (mut a, mut b) = (self.inked.abs(), self.cells.abs());
        while b != 0 {
            let next = a % b;
            a = b;
            b = next;
        }
        let divisor = a.max(1);
        (self.inked / divisor, self.cells / divisor)
    }
}

pub fn chi8(number: usize) -> i64 {
    [0, 1, 0, -1, 0, -1, 0, 1][number % 8]
}

pub fn arm_law(number: usize) -> Result<Share> {
    if number == 0 || number.is_multiple_of(2) {
        return value_error("the layer number must be odd.");
    }
    Ok(Share {
        inked: number as i64 + chi8(number),
        cells: 2 * number as i64,
    })
}

pub fn constant() -> f64 {
    (1.0 + 2f64.sqrt()).ln() / (2.0 * 2f64.sqrt()) - CATALAN / 8.0 - EULER / 4.0 - 2f64.ln() / 2.0
}

pub fn width_law(half: usize) -> f64 {
    let reach = (half / 2) as f64;
    let parity = f64::from(u8::from((half / 4).is_multiple_of(2)));
    -(reach + parity) / (4.0 * (2.0 * reach + 1.0))
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Branch {
    Zero,
    Two,
    Odd,
}

impl Branch {
    pub fn of(layers: usize) -> Branch {
        match layers % 4 {
            0 => Branch::Zero,
            2 => Branch::Two,
            _ => Branch::Odd,
        }
    }

    pub fn residual(self) -> Option<f64> {
        match self {
            Branch::Zero => Some(-23.0 / 192.0),
            Branch::Two => Some(25.0 / 192.0),
            Branch::Odd => None,
        }
    }

    pub fn constant(self) -> f64 {
        constant() + if self == Branch::Odd { 0.125 } else { 0.0 }
    }

    pub fn name(self) -> String {
        match self {
            Branch::Zero => "0 mod 4",
            Branch::Two => "2 mod 4",
            Branch::Odd => "odd",
        }
        .to_string()
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct Decay {
    pub layers: usize,
    pub excess: f64,
    pub scaled: f64,
    pub logged: f64,
    pub miss: f64,
    pub linear: f64,
    pub residual: f64,
    pub slope: Option<f64>,
}

#[derive(Serialize, Deserialize)]
pub struct Star {
    corners: [bool; 8],
}

impl Star {
    pub fn new(code: u128) -> Result<Star> {
        let filled = code_to_corners(Code::from(code), 3, 2)?;
        let mut corners = [false; 8];
        for corner in filled {
            corners[usize::from(corner[0]) << 2
                | usize::from(corner[1]) << 1
                | usize::from(corner[2])] = true;
        }
        Ok(Star { corners })
    }

    fn inked(&self, x: i64, y: i64, z: i64) -> bool {
        let bit = |c: i64| (c.div_euclid(4) & 1) as usize;
        self.corners[bit(x) << 2 | bit(y) << 1 | bit(z)]
    }

    pub fn cell(&self, number: usize, x: i64, z: i64) -> Option<bool> {
        let n = number as i64;
        let y = 6 * n - 2 - x - z;
        let inside = (0..4 * n).contains(&x) && (0..4 * n).contains(&z) && (0..4 * n).contains(&y);
        inside.then(|| self.inked(x, y, z))
    }

    pub fn hexagon(&self, number: usize) -> Result<Share> {
        if number == 0 || number.is_multiple_of(2) {
            return value_error("the layer number must be odd.");
        }
        let n = number as i64;
        let size = 4 * n;
        let (mut cells, mut inked) = (0i64, 0i64);
        for index in 0..2 * n {
            let z = 2 * index;
            let target = 6 * n - 2 - z;
            let low = 0.max(target - size + 1);
            let high = (size - 1).min(target);
            if high < low {
                continue;
            }
            for rest in 0..8 {
                let count = (high - rest).div_euclid(8) - (low - 1 - rest).div_euclid(8);
                if count <= 0 {
                    continue;
                }
                cells += count;
                if self.inked(rest, (target - rest).rem_euclid(8), z) {
                    inked += count;
                }
            }
        }
        Ok(Share { inked, cells })
    }

    pub fn arm(&self, number: usize, half: usize) -> Result<Share> {
        if number == 0 || number.is_multiple_of(2) {
            return value_error("the layer number must be odd.");
        }
        let (n, half) = (number as i64, half as i64);
        let size = 4 * n;
        let (mut cells, mut inked) = (0i64, 0i64);
        for index in 0..2 * n {
            let z = 2 * index;
            let target = 6 * n - 2 - z;
            let base = target / 2;
            for x in base - half - 1..=base + half + 1 {
                let y = target - x;
                if !(0..size).contains(&x) || !(0..size).contains(&y) || (x - y).abs() > half {
                    continue;
                }
                cells += 1;
                inked += i64::from(self.inked(x, y, z));
            }
        }
        Ok(Share { inked, cells })
    }

    pub fn excesses(&self, layers: usize, half: usize) -> Result<Vec<f64>> {
        if layers == 0 {
            return value_error("the layer count must be at least one.");
        }
        (0..layers)
            .map(|step| {
                let number = 2 * step + 1;
                Ok(self.arm(number, half)?.value() - self.hexagon(number)?.value())
            })
            .collect()
    }
}

pub fn decay(excesses: &[f64], layers: usize) -> Result<Decay> {
    if layers < 2 || layers > excesses.len() {
        return value_error("the layer count must be at least two and within the excesses read.");
    }
    let mean = |count: usize| excesses[..count].iter().sum::<f64>() / count as f64;
    let scaled = mean(layers) * layers as f64;
    let near = mean(layers / 2) * (layers / 2) as f64;
    let logged = scaled + (layers as f64).ln() / 4.0;
    let miss = logged - Branch::of(layers).constant();
    Ok(Decay {
        layers,
        excess: mean(layers),
        scaled,
        logged,
        miss,
        linear: miss * layers as f64,
        residual: miss * layers as f64 * layers as f64,
        slope: layers
            .is_multiple_of(4)
            .then(|| (scaled - near) / 2f64.ln()),
    })
}
