use mrly_tensor::Tensor;
use mrly_two::Cell2d;
use std::f64::consts::LN_2;

pub fn churn(grids: &[Cell2d]) -> f64 {
    if grids.len() < 2 {
        return 0.0;
    }
    let total: f64 = grids
        .windows(2)
        .map(|pair| spread(pair[0].types(), pair[1].types()))
        .sum();
    total / (grids.len() - 1) as f64
}

pub fn entropy(grid: &Cell2d) -> i64 {
    let types = grid.types();
    let total = types.size();
    if total == 0 {
        return 0;
    }
    let ones = types.count(1);
    let p = ones as f64 / total as f64;
    if p == 0.0 || p == 1.0 {
        return 0;
    }
    let bits = -(p * (f64::ln(p) / LN_2) + (1.0 - p) * (f64::ln(1.0 - p) / LN_2));
    (bits * 1000.0).round() as i64
}

fn spread(a: &Tensor, b: &Tensor) -> f64 {
    if a.shape != b.shape || a.size() == 0 {
        return 1.0;
    }
    let differing = (0..a.size()).filter(|&i| a.at(i) != b.at(i)).count();
    differing as f64 / a.size() as f64
}
