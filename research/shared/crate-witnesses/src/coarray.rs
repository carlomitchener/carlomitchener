use coarray::*;
use std::collections::BTreeSet;

pub const ALL: &[witness::Witness] = &[
    (
        "the_fast_test_is_the_definition",
        the_fast_test_is_the_definition,
    ),
    (
        "theorem_a_counts_u_to_the_level",
        theorem_a_counts_u_to_the_level,
    ),
    (
        "cohen_and_eldar_table_one_reads_as_printed",
        cohen_and_eldar_table_one_reads_as_printed,
    ),
    (
        "the_compressed_base_reads_as_printed",
        the_compressed_base_reads_as_printed,
    ),
];

fn coarray(s: &[u64]) -> BTreeSet<i64> {
    s.iter()
        .flat_map(|&p| s.iter().map(move |&q| p as i64 - q as i64))
        .collect()
}

fn brute(s: &[u64]) -> Vec<bool> {
    let whole = coarray(s);
    s.iter()
        .map(|&x| {
            let rest: Vec<u64> = s.iter().copied().filter(|&y| y != x).collect();
            coarray(&rest) != whole
        })
        .collect()
}

fn count(generator: &[u64], base: u64, level: u32) -> usize {
    let f = fractal(generator, base, level).unwrap();
    essential(&f).iter().filter(|&&e| e).count()
}

fn row(generator: &[u64], base: u64, levels: u32) -> Vec<usize> {
    (1..=levels).map(|r| count(generator, base, r)).collect()
}

fn the_fast_test_is_the_definition() {
    for (g, b, r) in [
        (&[0, 1, 2][..], 5, 2),
        (&[0, 1, 2][..], 4, 3),
        (&[0, 1, 2, 4][..], 9, 2),
        (&[0, 1, 4, 6][..], 8, 3),
        (&[0, 1, 2, 3][..], 7, 2),
        (&[0, 1, 2, 3, 7][..], 11, 2),
        (&[0, 3, 5][..], 6, 3),
    ] {
        let f = fractal(g, b, r).unwrap();
        assert_eq!(essential(&f), brute(&f));
        for &s in &f {
            let rest: Vec<u64> = f.iter().copied().filter(|&y| y != s).collect();
            let gone: Vec<i64> = coarray(&f).difference(&coarray(&rest)).copied().collect();
            assert_eq!(lost(&f, s), gone);
        }
    }
}

fn theorem_a_counts_u_to_the_level() {
    let g = [0, 1, 2, 4];
    assert_eq!(paired(&g), vec![0, 1, 4]);
    assert_eq!(count(&g, 9, 4), 81);
    assert_eq!(law(&g, 4), Some((81, 256)));
    assert_eq!((count(&[0, 1, 2], 5, 2), count(&[0, 1, 2], 5, 3)), (4, 8));
    assert_eq!(count(&[0, 1, 2, 3], 7, 2), 4);
    assert_eq!(count(&[0, 1, 4, 6], 13, 3), 64);
    assert_eq!((count(&g, 9, 5), count(&g, 9, 6)), (243, 729));
    assert_eq!(law(&[0, 1, 2], 1), None);
    assert_eq!(law(&[0, 1, 4], 2), None);
    assert!(holes(&fractal(&g, 9, 3).unwrap()).is_empty());
}

fn cohen_and_eldar_table_one_reads_as_printed() {
    let s = [0, 1, 2, 4, 7, 10, 13, 16, 18, 19, 20];
    let g = [0, 1, 3, 5, 11, 13, 17, 18, 19, 20];
    assert_eq!(
        weights(&s)[20..],
        [11, 4, 4, 6, 2, 2, 5, 2, 2, 4, 2, 2, 3, 2, 2, 2, 3, 2, 3, 2, 1]
    );
    assert_eq!(
        weights(&g)[20..],
        [10, 4, 5, 2, 2, 2, 3, 2, 3, 1, 2, 1, 2, 2, 2, 2, 2, 3, 2, 2, 1]
    );
    assert_eq!(paired(&s), vec![0, 20]);
    assert_eq!(paired(&g), vec![0, 11, 20]);
    assert_eq!(row(&s, 41, 3), [3, 4, 8]);
    assert_eq!(row(&g, 41, 3), [3, 9, 27]);
}

fn the_compressed_base_reads_as_printed() {
    assert_eq!(row(&[0, 1, 2], 4, 6), [3, 2, 2, 2, 2, 2]);
    assert_eq!(row(&[0, 1, 4, 6], 7, 5), [4, 7, 6, 6, 6]);
    assert_eq!(row(&[0, 1, 4, 6], 8, 5), [4, 11, 25, 53, 109]);
    assert_eq!(row(&[0, 1, 2, 3, 7], 11, 4), [5, 14, 29, 61]);
    assert!(holes(&fractal(&[0, 1, 4, 6], 8, 4).unwrap()).is_empty());
}
