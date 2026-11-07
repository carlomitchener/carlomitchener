pub use mrly_hex::census::*;

pub fn corners(x: i64, y: i64, start: i64) -> [Point; 3] {
    if (x + y + start).rem_euclid(2) == 0 {
        north(x, y)
    } else {
        south(x, y)
    }
}

pub fn edges_of(c: &[Point; 3]) -> [Edge; 3] {
    let sorted = |a: Point, b: Point| if a <= b { (a, b) } else { (b, a) };
    [sorted(c[0], c[1]), sorted(c[1], c[2]), sorted(c[0], c[2])]
}

fn north(x: i64, y: i64) -> [Point; 3] {
    [(x, 2 * y + 2), (x + 1, 2 * y), (x + 2, 2 * y + 2)]
}

fn south(x: i64, y: i64) -> [Point; 3] {
    [(x, 2 * y), (x + 1, 2 * y + 2), (x + 2, 2 * y)]
}

type Point = (i64, i64);

type Edge = (Point, Point);
