pub use mrly_gaussian::*;

pub fn div_rem(ring: Ring, z: (i64, i64), w: (i64, i64)) -> ((i64, i64), (i64, i64)) {
    let n = ring.norm(w.0, w.1) as i64;
    let p = ring.mul(z, ring.conjugate(w.0, w.1));
    let q = (
        (2 * p.0 + n).div_euclid(2 * n),
        (2 * p.1 + n).div_euclid(2 * n),
    );
    let s = ring.mul(q, w);
    (q, (z.0 - s.0, z.1 - s.1))
}

pub fn gaussian_gcd(ring: Ring, z: (i64, i64), w: (i64, i64)) -> (i64, i64) {
    let (mut z, mut w) = (z, w);
    while w != (0, 0) {
        let (_, r) = div_rem(ring, z, w);
        z = w;
        w = r;
    }
    ring.canon(z.0, z.1)
}
