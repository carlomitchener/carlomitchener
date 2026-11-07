use mrly_gaussian::Ring;
use mrly_radix::*;
use std::collections::HashSet;

pub const ALL: &[witness::Witness] = &[
    (
        "the_real_base_with_no_twist_is_the_plane_cell",
        the_real_base_with_no_twist_is_the_plane_cell,
    ),
    (
        "the_fill_law_counts_every_word_and_the_twist_only_moves_it",
        the_fill_law_counts_every_word_and_the_twist_only_moves_it,
    ),
];

fn the_real_base_with_no_twist_is_the_plane_cell() {
    let carpet = tile(3, 0b111101111).unwrap();
    assert_eq!(carpet.size(), 8);
    assert_eq!(carpet.ring(), Ring::Gaussian);
    assert_eq!(carpet.base().norm(), 9);
    assert!(!carpet.canonical().unwrap());
    assert!((carpet.dimension() - 8f64.ln() / 3f64.ln()).abs() < 1e-12);
    assert_eq!(format!("{:.6}", carpet.dimension()), "1.892789");
    assert_eq!(carpet.fill(2), 64);
    assert_eq!(carpet.distinct(2), 64);
    let got: HashSet<(i64, i64)> = carpet.words(2).into_iter().collect();
    let mut want = HashSet::new();
    for row in 0..9i64 {
        for col in 0..9i64 {
            let hole = |r: i64, c: i64| r == 1 && c == 1;
            if !hole(row / 3, col / 3) && !hole(row % 3, col % 3) {
                want.insert((col, row));
            }
        }
    }
    assert_eq!(got.len(), 64);
    assert_eq!(got, want);
}

fn the_fill_law_counts_every_word_and_the_twist_only_moves_it() {
    for design in [
        gasket().unwrap(),
        twindragon().unwrap(),
        terdragon().unwrap(),
        flowsnake().unwrap(),
        koch().unwrap(),
    ] {
        for level in 0..=4 {
            assert_eq!(design.words(level).len() as u128, design.fill(level));
            assert!(design.distinct(level) <= design.words(level).len());
        }
        assert!(
            (design.dimension() * (design.base().norm() as f64).ln() / 2.0
                - (design.size() as f64).ln())
            .abs()
                < 1e-12
        );
    }
    let plain = twindragon().unwrap();
    let turned = plain.clone().with_twists(&[0, 1]).unwrap();
    assert_eq!(plain.words(4).len(), turned.words(4).len());
    assert_ne!(plain.words(4), turned.words(4));
    let plain_pair = Radix::from_code(Base::new(Ring::Gaussian, (2, 0)).unwrap(), 3).unwrap();
    assert_eq!(plain_pair.distinct(2), 4);
    let glue = plain_pair.with_twists(&[0, 2]).unwrap();
    assert_eq!(glue.words(2), vec![(0, 0), (1, 0), (2, 0), (1, 0)]);
    assert_eq!(glue.fill(2), 4);
    assert_eq!(glue.distinct(2), 3);
    assert_eq!(glue.code().unwrap(), 3);
    assert!(glue.canonical().unwrap());
    assert_eq!(gasket().unwrap().code().unwrap(), 7);
    assert_eq!(flowsnake().unwrap().code().unwrap(), 127);
    assert!((gasket().unwrap().dimension() - 3f64.ln() / 2f64.ln()).abs() < 1e-12);
    assert!((twindragon().unwrap().dimension() - 2.0).abs() < 1e-12);
    assert!((terdragon().unwrap().dimension() - 2.0).abs() < 1e-12);
    assert!((flowsnake().unwrap().dimension() - 2.0).abs() < 1e-12);
}
