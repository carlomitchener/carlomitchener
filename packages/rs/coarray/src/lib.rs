use mrly_error::{Result, value_error};
use mrly_num::digits::elements;

pub const MOST: u64 = 1 << 20;

pub fn fractal(generator: &[u64], base: u64, level: u32) -> Result<Vec<u64>> {
    let mut digits = generator.to_vec();
    digits.sort_unstable();
    digits.dedup();
    if digits.len() != generator.len() || digits.first() != Some(&0) {
        return value_error("a generator lists distinct digits, 0 among them.");
    }
    if digits.iter().any(|&d| d >= base) {
        return value_error(format!("every digit sits below the base {base}."));
    }
    let size = (digits.len() as u64).checked_pow(level);
    if size.is_none_or(|n| n > MOST) || base.checked_pow(level).is_none() {
        return value_error(format!(
            "level {level} passes the {MOST} sensors an array holds."
        ));
    }
    Ok(std::iter::once(0)
        .chain(elements(base, &digits, level as usize))
        .collect())
}

pub fn law(generator: &[u64], level: u32) -> Option<(u64, u64)> {
    if level < 2 || !generator.contains(&0) || !holes(generator).is_empty() {
        return None;
    }
    let u = paired(generator).len() as u64;
    Some((
        u.checked_pow(level)?,
        (generator.len() as u64).checked_pow(level)?,
    ))
}

pub fn weights(sensors: &[u64]) -> Vec<u64> {
    let Some(span) = spread(sensors) else {
        return Vec::new();
    };
    let mut out = vec![0; 2 * span as usize + 1];
    for &p in sensors {
        for &q in sensors {
            out[(p + span - q) as usize] += 1;
        }
    }
    out
}

pub fn holes(sensors: &[u64]) -> Vec<i64> {
    let span = spread(sensors).unwrap_or(0) as i64;
    weights(sensors)
        .iter()
        .enumerate()
        .filter(|&(_, &w)| w == 0)
        .map(|(i, _)| i as i64 - span)
        .collect()
}

pub fn paired(sensors: &[u64]) -> Vec<u64> {
    let Some(span) = spread(sensors) else {
        return Vec::new();
    };
    let w = weights(sensors);
    let mut out: Vec<u64> = sensors
        .iter()
        .copied()
        .filter(|&g| {
            sensors
                .iter()
                .any(|&h| h != g && w[(g + span - h) as usize] == 1)
        })
        .collect();
    out.sort_unstable();
    out
}

pub fn essential(sensors: &[u64]) -> Vec<bool> {
    let Some(reader) = Reader::new(sensors) else {
        return Vec::new();
    };
    sensors
        .iter()
        .map(|&s| reader.kills(s).next().is_some())
        .collect()
}

pub fn lost(sensors: &[u64], sensor: u64) -> Vec<i64> {
    let Some(reader) = Reader::new(sensors) else {
        return Vec::new();
    };
    if !reader.holds(sensor as i64) {
        return Vec::new();
    }
    let mut out: Vec<i64> = reader.kills(sensor).flat_map(|t| [t, -t]).collect();
    out.sort_unstable();
    out.dedup();
    out
}

fn spread(sensors: &[u64]) -> Option<u64> {
    Some(sensors.iter().max()? - sensors.iter().min()?)
}

struct Reader<'a> {
    sensors: &'a [u64],
    least: i64,
    span: i64,
    weights: Vec<u64>,
    member: Vec<bool>,
}

impl<'a> Reader<'a> {
    fn new(sensors: &'a [u64]) -> Option<Reader<'a>> {
        let span = spread(sensors)?;
        let least = *sensors.iter().min()?;
        let mut member = vec![false; span as usize + 1];
        for &s in sensors {
            member[(s - least) as usize] = true;
        }
        Some(Reader {
            sensors,
            least: least as i64,
            span: span as i64,
            weights: weights(sensors),
            member,
        })
    }

    fn holds(&self, x: i64) -> bool {
        (0..=self.span).contains(&(x - self.least)) && self.member[(x - self.least) as usize]
    }

    fn kills(&self, sensor: u64) -> impl Iterator<Item = i64> + '_ {
        let s = sensor as i64;
        self.sensors.iter().filter_map(move |&q| {
            let t = s - q as i64;
            match self.weights[(t + self.span) as usize] {
                1 if t != 0 => Some(t),
                2 if t != 0 && self.holds(s + t) => Some(t),
                _ => None,
            }
        })
    }
}
