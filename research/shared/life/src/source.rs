use mrly_error::Result;
pub use mrly_life::source::*;
use mrly_math::code::Code;
use mrly_num::prime;
use mrly_num::series;
use mrly_rand::Rng;
use mrly_sequences::counts;
use mrly_two as two;
use mrly_two::census;

pub fn sequence(seq: Source, limit: usize) -> Result<Vec<usize>> {
    match seq {
        Source::Evens => Ok(series::evens(limit)),
        Source::Odds => Ok(series::odds(limit)),
        Source::Random(seed) => Ok(random_subset(seed, limit)),
        Source::Primes => Ok(prime::primes(limit)),
        Source::Binary => Ok(series::binary(limit)),
        Source::Fibonacci => Ok(series::fibonacci(limit)),
        Source::GridSquares => mrly_sequence(limit, |n| Ok(n * n)),
        Source::CarpetFills => mrly_sequence(limit, |n| Ok(census::fills(&two::carpet(n, 1)?))),
        Source::CarpetVoids => mrly_sequence(limit, |n| Ok(census::voids(&two::carpet(n, 1)?))),
        Source::NetFills => mrly_sequence(limit, |n| Ok(census::fills(&two::net(n, 1)?))),
        Source::NetVoids => mrly_sequence(limit, |n| Ok(census::voids(&two::net(n, 1)?))),
        Source::TreeFills => mrly_sequence(limit, |n| Ok(census::fills(&two::htree(n, 1)?))),
        Source::TreeVoids => mrly_sequence(limit, |n| Ok(census::voids(&two::htree(n, 1)?))),
        Source::VoidFills => mrly_sequence(limit, |n| Ok(census::fills(&two::void(n, 1)?))),
        Source::VoidVoids => mrly_sequence(limit, |n| Ok(census::voids(&two::void(n, 1)?))),
        Source::PointFills => mrly_sequence(limit, |n| Ok(census::fills(&two::point(n, 1)?))),
        Source::PointVoids => mrly_sequence(limit, |n| Ok(census::voids(&two::point(n, 1)?))),
        Source::DustFills => mrly_sequence(limit, |n| Ok(census::fills(&two::dust(n, 1)?))),
        Source::DustVoids => mrly_sequence(limit, |n| Ok(census::voids(&two::dust(n, 1)?))),
        Source::LineFills => mrly_sequence(limit, |n| Ok(census::fills(&two::hline(n, 1)?))),
        Source::LineVoids => mrly_sequence(limit, |n| Ok(census::voids(&two::hline(n, 1)?))),
        Source::StarFills => mrly_sequence(limit, |n| Ok(census::fills(&two::star(n, 1)?))),
        Source::StarVoids => mrly_sequence(limit, |n| Ok(census::voids(&two::star(n, 1)?))),
        Source::CodeFills(code) => mrly_sequence(limit, |n| {
            Ok(counts::fill(Code::from(code), n, DIM, 1, BASE)? as usize)
        }),
        Source::CodeVoids(code) => mrly_sequence(limit, |n| {
            Ok(counts::void(Code::from(code), n, DIM, 1, BASE)? as usize)
        }),
    }
}

const DIM: usize = 2;

const BASE: usize = 2;

fn random_subset(seed: u64, limit: usize) -> Vec<usize> {
    let mut rng = Rng::new(seed);
    let mut options: Vec<usize> = (0..=limit).collect();
    let count = 1 + rng.below(options.len());
    for i in 0..count {
        let j = i + rng.below(options.len() - i);
        options.swap(i, j);
    }
    let mut out = options[..count].to_vec();
    out.sort_unstable();
    out
}

fn mrly_sequence(limit: usize, count_of: impl Fn(usize) -> Result<usize>) -> Result<Vec<usize>> {
    let mut out = Vec::new();
    let mut number = 1;
    loop {
        let value = count_of(number)?;
        if value > limit {
            break;
        }
        if !out.contains(&value) {
            out.push(value);
        }
        number += 2;
        if number > limit + 3 {
            break;
        }
    }
    out.sort_unstable();
    Ok(out)
}

pub fn oeis(source: Source) -> Option<String> {
    match source {
        Source::Evens => Some("A005843".to_string()),
        Source::Odds => Some("A005408".to_string()),
        Source::Primes => Some("A000040".to_string()),
        Source::Binary => Some("A000079".to_string()),
        Source::Fibonacci => Some("A000045".to_string()),
        Source::GridSquares => Some("A016754".to_string()),
        Source::CarpetFills => Some("A000567".to_string()),
        Source::CarpetVoids => Some("A000290".to_string()),
        Source::NetFills => Some("A045944".to_string()),
        Source::NetVoids => Some("A000290".to_string()),
        Source::TreeFills => Some("A000384".to_string()),
        Source::TreeVoids => Some("A014105".to_string()),
        Source::VoidFills => Some("A001844".to_string()),
        Source::VoidVoids => Some("A046092".to_string()),
        Source::PointFills => Some("A000290".to_string()),
        Source::PointVoids => Some("A000567".to_string()),
        Source::DustFills => Some("A000290".to_string()),
        Source::DustVoids => Some("A045944".to_string()),
        Source::LineFills => Some("A014105".to_string()),
        Source::LineVoids => Some("A000384".to_string()),
        Source::StarFills => Some("A046092".to_string()),
        Source::StarVoids => Some("A001844".to_string()),
        Source::Random(_) | Source::CodeFills(_) | Source::CodeVoids(_) => None,
    }
}
