use mrly_apollonian::*;
use mrly_error::{Result, value_error};
use num::lattice::farey;
use serde::{Deserialize, Serialize};

pub const CURVATURE_CAP: i64 = 8192;

pub const CIRCLE_CAP: usize = 200_000;

pub const ORDER_CAP: usize = 64;

pub const ROOTS: [&str; 4] = ["strip", "-1,2,2,3", "-2,3,6,7", "-3,4,12,13"];

pub const STRIDE: usize = 4;

fn column(q: &Quad, at: usize) -> [i64; 4] {
    let read = |c: &Circle| match at {
        0 => c.k,
        1 => c.x,
        _ => c.y,
    };
    [read(&q[0]), read(&q[1]), read(&q[2]), read(&q[3])]
}

pub fn form(u: [i64; 4], v: [i64; 4]) -> i128 {
    let su: i128 = u.iter().map(|&a| i128::from(a)).sum();
    let sv: i128 = v.iter().map(|&a| i128::from(a)).sum();
    let dot: i128 = (0..4).map(|i| i128::from(u[i]) * i128::from(v[i])).sum();
    su * sv - 2 * dot
}

pub fn sound(q: &Quad) -> bool {
    let (k, x, y) = (column(q, 0), column(q, 1), column(q, 2));
    form(k, k) == 0
        && form(k, x) == 0
        && form(k, y) == 0
        && form(x, y) == 0
        && form(x, x) == -4
        && form(y, y) == -4
}

pub fn reflect(q: &Quad, at: usize) -> Circle {
    let (mut k, mut x, mut y) = (0i64, 0i64, 0i64);
    for (i, c) in q.iter().enumerate() {
        if i != at {
            k += c.k;
            x += c.x;
            y += c.y;
        }
    }
    Circle {
        k: 2 * k - q[at].k,
        x: 2 * x - q[at].x,
        y: 2 * y - q[at].y,
    }
}

pub fn swap(q: &Quad, at: usize) -> Quad {
    let mut out = *q;
    out[at] = reflect(q, at);
    out
}

#[derive(Serialize, Deserialize)]
pub struct Shadow {
    pub order: usize,
    pub reach: i64,
    pub covered: bool,
    pub nodes: usize,
    pub touched: usize,
    pub missed: usize,
    pub offford: usize,
    pub bright: u128,
    pub want: u128,
}

pub fn shadow(p: &Packing, order: usize) -> Result<Shadow> {
    if order == 0 || order > ORDER_CAP {
        return value_error(format!("the depth must be between 1 and {ORDER_CAP}."));
    }
    let reach = 2 * (order as i64) * (order as i64);
    let mut out = Shadow {
        order,
        reach,
        covered: p.strip && p.cap >= reach,
        nodes: 0,
        touched: 0,
        missed: 0,
        offford: 0,
        bright: 0,
        want: (order as u128) * (order as u128 + 1) / 2,
    };
    if !p.strip {
        return Ok(out);
    }
    out.offford = p
        .circles
        .iter()
        .filter(|c| on_line(**c) && c.k <= reach && !is_ford(**c))
        .count();
    let mut held: Vec<(i64, i64)> = touches(p)
        .into_iter()
        .filter(|t| t.den <= order as i64)
        .map(|t| (t.num, t.den))
        .collect();
    let mut lit: Vec<(i64, i64)> = farey(order)
        .iter()
        .filter(|n| n.num > 0 && n.num < n.den)
        .map(|n| (n.num as i64, n.den as i64))
        .collect();
    out.touched = held.len();
    out.nodes = lit.len();
    held.sort_unstable();
    lit.sort_unstable();
    out.missed = held
        .iter()
        .filter(|pair| lit.binary_search(pair).is_err())
        .count()
        + lit
            .iter()
            .filter(|pair| held.binary_search(pair).is_err())
            .count();
    out.bright = order as u128
        + lit
            .iter()
            .map(|&(_, den)| (order as u128) / den as u128)
            .sum::<u128>();
    Ok(out)
}
