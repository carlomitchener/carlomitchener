use mrly_error::Result;
pub use mrly_graph::census::*;
use mrly_graph::models::Network;
use std::collections::HashSet;
use std::f64::consts::LN_2;

pub fn total_length(network: &Network) -> f64 {
    network
        .branches
        .iter()
        .map(|b| {
            let a = &network.nodes[b.parent].position;
            let c = &network.nodes[b.child].position;
            a.iter()
                .zip(c)
                .map(|(x, y)| (x - y) * (x - y))
                .sum::<f64>()
                .sqrt()
        })
        .sum()
}

pub fn tips(network: &Network) -> Result<usize> {
    Ok(roles(network)?.iter().filter(|&&r| r == Role::Tip).count())
}

pub fn junctions(network: &Network) -> Result<usize> {
    Ok(roles(network)?
        .iter()
        .filter(|&&r| r == Role::Junction)
        .count())
}

pub fn components(network: &Network) -> Result<usize> {
    let n = network.nodes.len();
    if n == 0 {
        return Ok(0);
    }
    let adjacency = network.adjacency()?;
    let mut seen = vec![false; n];
    let mut count = 0;
    for start in 0..n {
        if seen[start] {
            continue;
        }
        count += 1;
        let mut stack = vec![start];
        seen[start] = true;
        while let Some(current) = stack.pop() {
            for &neighbor in &adjacency[&current] {
                if !seen[neighbor] {
                    seen[neighbor] = true;
                    stack.push(neighbor);
                }
            }
        }
    }
    Ok(count)
}

pub fn fractal_dimension(network: &Network, samples: usize) -> f64 {
    let positions: Vec<&Vec<f64>> = network.nodes.iter().map(|n| &n.position).collect();
    if positions.len() < 2 {
        return 0.0;
    }
    let dim = network.dim;
    let mins: Vec<f64> = (0..dim)
        .map(|a| positions.iter().map(|p| p[a]).fold(f64::MAX, f64::min))
        .collect();
    let maxs: Vec<f64> = (0..dim)
        .map(|a| positions.iter().map(|p| p[a]).fold(f64::MIN, f64::max))
        .collect();
    let extent = mins
        .iter()
        .zip(&maxs)
        .map(|(lo, hi)| hi - lo)
        .fold(0.0, f64::max);
    if extent == 0.0 {
        return 0.0;
    }
    let distinct: HashSet<Vec<u64>> = positions
        .iter()
        .map(|p| p.iter().map(|v| v.to_bits()).collect())
        .collect();
    let mut scales: Vec<f64> = Vec::new();
    let mut log_count: Vec<f64> = Vec::new();
    for k in 0..samples.min(RUNGS as usize + 1) as u32 {
        let split = f64::from_bits(((1023 + k) as u64) << 52);
        let last = (1i64 << k) - 1;
        let mut boxes: HashSet<Vec<i64>> = HashSet::new();
        for p in &positions {
            let key: Vec<i64> = (0..dim)
                .map(|a| ((((p[a] - mins[a]) * split) / extent).floor() as i64).min(last))
                .collect();
            boxes.insert(key);
        }
        scales.push(k as f64);
        log_count.push(f64::ln(boxes.len() as f64));
        if boxes.len() == distinct.len() {
            break;
        }
    }
    if scales.len() < 2 {
        return 0.0;
    }
    let n = scales.len() as f64;
    let mean_x: f64 = scales.iter().sum::<f64>() / n;
    let mean_y: f64 = log_count.iter().sum::<f64>() / n;
    let cov: f64 = scales
        .iter()
        .zip(&log_count)
        .map(|(x, y)| (x - mean_x) * (y - mean_y))
        .sum();
    let var: f64 = scales.iter().map(|x| (x - mean_x) * (x - mean_x)).sum();
    cov / (var * LN_2)
}

const RUNGS: u32 = 32;
