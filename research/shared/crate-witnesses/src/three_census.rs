use mrly_bang::universe::{orbit, total_exposure, touches_every_corner};
use mrly_math::code::Code;
use mrly_three::census::*;
use mrly_three::designs;
use mrly_three::vertices;
use mrly_two;
use std::collections::BTreeSet;

pub const ALL: &[witness::Witness] = &[
    (
        "the_face_ledger_prints_the_family_closed_forms",
        the_face_ledger_prints_the_family_closed_forms,
    ),
    (
        "the_face_matrix_fits_its_eigenvalues_and_predicts",
        the_face_matrix_fits_its_eigenvalues_and_predicts,
    ),
    ("the_void_buries_no_face", the_void_buries_no_face),
    (
        "total_exposure_holds_for_the_independent_corner_sets",
        total_exposure_holds_for_the_independent_corner_sets,
    ),
    (
        "the_all_even_rule_touches_every_grid_corner",
        the_all_even_rule_touches_every_grid_corner,
    ),
    (
        "the_net_falls_short_of_the_grid_corners",
        the_net_falls_short_of_the_grid_corners,
    ),
];

fn tile_fill(code: u128, number: usize) -> u128 {
    fills(&designs::create(Code(code), number, 1, 2).unwrap()) as u128
}

fn state(code: u128, number: usize, level: usize) -> (i128, i128) {
    let cell = designs::create(Code(code), number, level, 2).unwrap();
    (surface(&cell) as i128, hidden(&cell) as i128)
}

fn second_eigenvalue(code: u128, number: usize) -> i128 {
    let half = (number / 2) as i128;
    let side = number as i128;
    match code {
        23 => side * side - half * half,
        232 => half * half,
        _ => (side - half) * (side - half),
    }
}

fn the_face_ledger_prints_the_family_closed_forms() {
    let visible = [
        (23u128, [72u128, 1056, 18048, 336384]),
        (232, [30, 198, 1374, 9606]),
        (3, [56, 608, 7040, 83456]),
        (129, [54, 486, 4374, 39366]),
    ];
    for (code, faces) in visible {
        let fc = tile_fill(code, 3);
        for (index, &want) in faces.iter().enumerate() {
            let level = index + 1;
            let cell = designs::create(Code(code), 3, level, 2).unwrap();
            assert_eq!(surface(&cell), want, "code={code} l={level}");
            assert_eq!(
                hidden(&cell),
                6 * fc.pow(level as u32) - want,
                "code={code} l={level}"
            );
        }
    }
    let carpet: Vec<u128> = (1..5)
        .map(|level| hidden(&designs::create(Code(23), 3, level, 2).unwrap()))
        .collect();
    assert_eq!(carpet, [48, 1344, 29952, 623616]);
}

fn the_face_matrix_fits_its_eigenvalues_and_predicts() {
    let mut fitted = 0;
    for (number, top) in [(3usize, 3usize), (5, 2), (7, 2)] {
        for code in [23u128, 232, 3, 129] {
            let fc = tile_fill(code, number) as i128;
            let l2 = second_eigenvalue(code, number);
            let states: Vec<(i128, i128)> =
                (1..=top).map(|level| state(code, number, level)).collect();
            let work = states[0].1 / 2;
            for (index, &(v, h)) in states.iter().enumerate() {
                let level = index as u32 + 1;
                assert_eq!(v + h, 6 * fc.pow(level), "code={code} n={number} l={level}");
                let want = if work == 0 {
                    0
                } else {
                    2 * work * (fc.pow(level) - l2.pow(level)) / (fc - l2)
                };
                assert_eq!(h, want, "code={code} n={number} l={level}");
            }
            if top < 3 || work == 0 {
                continue;
            }
            let ((v1, h1), (v2, h2), (v3, h3)) = (states[0], states[1], states[2]);
            let base = v1 * h2 - v2 * h1;
            assert_eq!(
                v1 * h3 - h1 * v3,
                (fc + l2) * base,
                "code={code} n={number}"
            );
            assert_eq!(v2 * h3 - v3 * h2, fc * l2 * base, "code={code} n={number}");
            if code == 23 && number == 3 {
                let entries = [
                    v2 * h2 - v3 * h1,
                    v1 * v3 - v2 * v2,
                    h2 * h2 - h3 * h1,
                    v1 * h3 - v2 * h2,
                ];
                for entry in entries {
                    assert_eq!(entry % base, 0, "code={code} n={number}");
                }
                let matrix = [
                    [entries[0] / base, entries[1] / base],
                    [entries[2] / base, entries[3] / base],
                ];
                assert_eq!(matrix, [[12, 4], [8, 16]]);
            }
            let numerator = (v2 * h2 - v3 * h1) * v3 + (v3 * v1 - v2 * v2) * h3;
            assert_eq!(numerator % base, 0, "code={code} n={number}");
            let next = numerator / base;
            let closed = 6 * fc.pow(4) - 2 * work * (fc.pow(4) - l2.pow(4)) / (fc - l2);
            assert_eq!(next, closed, "code={code} n={number}");
            fitted += 1;
        }
    }
    assert_eq!(fitted, 3);
}

fn the_void_buries_no_face() {
    for k in 1..13u128 {
        let number = 2 * k as usize - 1;
        let cell = designs::create(Code(129), number, 1, 2).unwrap();
        let cells = k * k * k + (k - 1) * (k - 1) * (k - 1);
        assert_eq!(fills(&cell) as u128, cells, "k={k}");
        assert_eq!(surface(&cell), 6 * cells, "k={k}");
        assert_eq!(hidden(&cell), 0, "k={k}");
        let flat = mrly_two::create(Code(9), number, 1, 0, 2).unwrap();
        let tally = mrly_two::census::census(&flat).unwrap();
        assert_eq!(tally.edges as u128, tally.perimeter, "k={k}");
    }
    for level in 1..5u32 {
        let cell = designs::create(Code(129), 3, level as usize, 2).unwrap();
        assert_eq!(surface(&cell), 6 * 9u128.pow(level), "l={level}");
    }
}

fn total_exposure_holds_for_the_independent_corner_sets() {
    for number in [3usize, 5, 7] {
        for code in 0..256u128 {
            let cell = designs::create(Code(code), number, 1, 2).unwrap();
            let open = surface(&cell) == 6 * fills(&cell) as u128;
            assert_eq!(
                open,
                total_exposure(Code(code), 3),
                "code={code} n={number}"
            );
        }
    }
    let exposed: Vec<u128> = (0..256).filter(|&c| total_exposure(Code(c), 3)).collect();
    let classes: BTreeSet<u128> = exposed
        .iter()
        .map(|&c| orbit(Code(c), 3).iter().next().unwrap().get())
        .collect();
    assert_eq!(exposed.len(), 35);
    assert_eq!(
        classes.into_iter().collect::<Vec<u128>>(),
        [0, 1, 6, 22, 24, 105]
    );
}

fn the_all_even_rule_touches_every_grid_corner() {
    for k in 1..4usize {
        let number = 2 * k - 1;
        let grid = (number + 1).pow(3);
        for code in 0..256u128 {
            let cell = designs::create(Code(code), number, 1, 2).unwrap();
            let whole = vertices(&cell).unwrap() == grid;
            assert_eq!(
                whole,
                touches_every_corner(Code(code), 3),
                "code={code} k={k}"
            );
        }
    }
    assert_eq!(
        (0..256u128)
            .filter(|&c| touches_every_corner(Code(c), 3))
            .count(),
        128
    );
}

fn the_net_falls_short_of_the_grid_corners() {
    for k in 1..13usize {
        let cell = designs::create(Code(232), 2 * k - 1, 1, 2).unwrap();
        let m = k - 1;
        assert_eq!(vertices(&cell).unwrap(), 8 * m * m * (k + 2), "k={k}");
        assert_eq!(
            8 * k * k * k - vertices(&cell).unwrap(),
            24 * k - 16,
            "k={k}"
        );
    }
    for k in 1..17usize {
        let flat = mrly_two::net(2 * k - 1, 1).unwrap();
        assert_eq!(mrly_two::vertices(&flat).unwrap(), 4 * k * k - 4, "k={k}");
    }
}
