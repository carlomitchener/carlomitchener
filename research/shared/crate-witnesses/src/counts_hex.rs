use mrly_math::code::Code;
use mrly_num::prime::is_prime;
use mrly_sequences::counts::hex::*;

pub const ALL: &[witness::Witness] = &[
    ("pro_and_cut_match_census", pro_and_cut_match_census),
    (
        "the_slice_vertex_count_is_centered_hexagonal_at_even_index",
        the_slice_vertex_count_is_centered_hexagonal_at_even_index,
    ),
    (
        "the_prime_vertex_counts_are_cuban_with_norm_witnesses",
        the_prime_vertex_counts_are_cuban_with_norm_witnesses,
    ),
];

fn pro_and_cut_match_census() {
    use mrly_hex::{cut, pro};
    use mrly_three;
    for code in [
        Code(0),
        Code(8),
        Code(17),
        Code(23),
        Code(129),
        Code(232),
        Code(255),
    ] {
        for number in [1usize, 2, 3, 4, 5, 7] {
            for level in 1..3u32 {
                if number.pow(level) > 9 {
                    continue;
                }
                let cell = mrly_three::create(code, number, level as usize, 2).unwrap();
                let p = pro(&cell).unwrap();
                assert_eq!(
                    pro_fills(code, number, level).unwrap(),
                    p.cell.types().count(1) as u128,
                    "pro code={code} n={number} l={level}"
                );
                assert_eq!(
                    pro_voids(code, number, level).unwrap(),
                    p.cell.types().count(0) as u128
                );
                let q = cut(&cell).unwrap();
                assert_eq!(
                    cut_fills(code, number, level).unwrap(),
                    q.cell.types().count(1) as u128,
                    "cut code={code} n={number} l={level}"
                );
                assert_eq!(
                    cut_voids(code, number, level).unwrap(),
                    q.cell.types().count(0) as u128
                );
            }
        }
    }
}

fn slice_vertices(k: usize) -> u128 {
    solid_slice_vertices(2 * k - 1).unwrap()
}

fn the_slice_vertex_count_is_centered_hexagonal_at_even_index() {
    let opening: Vec<u128> = (1..6).map(centered_hexagonal).collect();
    assert_eq!(opening, [1, 7, 19, 37, 61]);
    for k in 1..41usize {
        let m = 2 * k as u128;
        assert_eq!(slice_vertices(k), centered_hexagonal(2 * k), "k={k}");
        assert_eq!(slice_vertices(k) % 3, 1, "k={k}");
        assert_eq!(
            slice_vertices(k),
            m * m + m * (m - 1) + (m - 1) * (m - 1),
            "k={k}"
        );
    }
}

fn the_prime_vertex_counts_are_cuban_with_norm_witnesses() {
    let mut prime_at = Vec::new();
    let mut primes = Vec::new();
    let mut composites = Vec::new();
    for k in 1..21usize {
        if is_prime(slice_vertices(k) as usize) {
            prime_at.push(k);
            primes.push(slice_vertices(k));
        } else {
            composites.push(slice_vertices(k));
        }
    }
    assert_eq!(prime_at, [1, 2, 5, 6, 7, 9, 12, 13, 14, 19]);
    assert_eq!(primes, [7, 37, 271, 397, 547, 919, 1657, 1951, 2269, 4219]);
    assert_eq!(
        composites,
        [91, 169, 721, 1141, 1387, 2611, 2977, 3367, 3781, 4681]
    );
    let far: Vec<u128> = (21..41usize)
        .map(slice_vertices)
        .filter(|&v| is_prime(v as usize))
        .collect();
    assert_eq!(far, [5167, 6211, 7351, 9241, 12097, 13669]);
    for value in primes.iter().chain(far.iter()) {
        assert_eq!(value % 3, 1, "value={value}");
    }
    assert_eq!(4219u128, 37 * 37 + 37 * 38 + 38 * 38);
}
