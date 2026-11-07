use mrly_bang::universe::orbit;
use mrly_graph::census::components as network_components;
use mrly_graph::spectrum::laplacian_spectrum;
use mrly_math::code::Code;
use mrly_sequences::counts::hex::centered_hexagonal;
use mrly_hex::census::census;
use mrly_hex::geometry::cut;
use mrly_hex::graph::slice_core_graph;
use mrly_hex::topology::*;
use mrly_hex::CellHex;
use mrly_hex::FILL;
use mrly_hex::GRID;
use mrly_three::{self, Cell3d};

pub const ALL: &[witness::Witness] = &[
    (
        "the_four_families_fill_the_slice_and_name_their_classes",
        the_four_families_fill_the_slice_and_name_their_classes,
    ),
    (
        "carpet_and_net_partition_the_hexagon_triangle_by_triangle",
        carpet_and_net_partition_the_hexagon_triangle_by_triangle,
    ),
    (
        "the_layer_weighted_area_is_a_second_route_to_the_fill",
        the_layer_weighted_area_is_a_second_route_to_the_fill,
    ),
    (
        "the_carpet_slice_counts_its_pieces_and_holes_two_ways",
        the_carpet_slice_counts_its_pieces_and_holes_two_ways,
    ),
    (
        "the_other_families_puncture_in_opposite_phase",
        the_other_families_puncture_in_opposite_phase,
    ),
    (
        "the_carpet_slice_percolates_at_base_three",
        the_carpet_slice_percolates_at_base_three,
    ),
    (
        "the_other_slices_shatter_or_never_grow_at_base_three",
        the_other_slices_shatter_or_never_grow_at_base_three,
    ),
    (
        "the_carpet_slice_fails_to_percolate_at_base_five",
        the_carpet_slice_fails_to_percolate_at_base_five,
    ),
    (
        "the_slice_exponent_climbs_with_the_size_it_is_read_at",
        the_slice_exponent_climbs_with_the_size_it_is_read_at,
    ),
    (
        "the_deep_slices_hold_their_spectral_exponents",
        the_deep_slices_hold_their_spectral_exponents,
    ),
];

fn slice(code: u128, number: usize, level: usize) -> CellHex {
    cut(&mrly_three::create(Code(code), number, level, 2).unwrap()).unwrap()
}

fn section_area(cell: &Cell3d) -> u128 {
    let grid = cell.types();
    let side = grid.shape[0];
    let mut total = 0;
    for i in 0..side {
        for j in 0..side {
            for l in 0..side {
                if grid.get(&[i, j, l]).unwrap() == 0 {
                    continue;
                }
                let layer = 3 * side as i64 - 2 * (i + j + l) as i64;
                total += match layer {
                    1 | 5 => 1,
                    2 | 4 => 4,
                    3 => 6,
                    _ => 0,
                };
            }
        }
    }
    total
}

fn the_four_families_fill_the_slice_and_name_their_classes() {
    let expected = [
        (23u128, 42usize, 23u128),
        (232, 12, 23),
        (3, 18, 3),
        (129, 12, 24),
    ];
    for (code, fill, class) in expected {
        let cut = slice(code, 3, 1);
        assert_eq!(census(&cut, false).fills, fill, "code={code}");
        assert_eq!(
            *orbit(Code(code), 3).iter().next().unwrap(),
            Code(class),
            "code={code}"
        );
    }
}

fn carpet_and_net_partition_the_hexagon_triangle_by_triangle() {
    let pairs = [
        (3usize, 42u128, 12u128),
        (5, 72, 78),
        (7, 204, 90),
        (9, 210, 276),
        (11, 486, 240),
    ];
    for number in (1..32).step_by(2) {
        let carpet = slice(23, number, 1);
        let net = slice(232, number, 1);
        let (left, right) = (carpet.cell.types(), net.cell.types());
        assert_eq!(left.shape, right.shape, "n={number}");
        let mut filled = 0;
        for (index, &value) in left.bytes().unwrap().iter().enumerate() {
            let other = right.bytes().unwrap()[index];
            if value == GRID || other == GRID {
                assert_eq!(value, other, "n={number}");
                continue;
            }
            assert_ne!(value, other, "n={number}");
            if value == FILL || other == FILL {
                filled += 1;
            }
        }
        let (a, b) = (
            census(&carpet, false).fills as u128,
            census(&net, false).fills as u128,
        );
        assert_eq!(filled as u128, 6 * (number as u128).pow(2), "n={number}");
        assert_eq!(a + b, 6 * (number as u128).pow(2), "n={number}");
        if let Some(&(_, want_a, want_b)) = pairs.iter().find(|p| p.0 == number) {
            assert_eq!((a, b), (want_a, want_b), "n={number}");
        }
        if number == 31 {
            assert_eq!((a, b, a + b), (3696, 2070, 5766));
        }
    }
}

fn the_layer_weighted_area_is_a_second_route_to_the_fill() {
    for number in 1..17usize {
        let carpet = mrly_three::create(Code(23), number, 1, 2).unwrap();
        let net = mrly_three::create(Code(232), number, 1, 2).unwrap();
        let whole = 6 * (number as u128).pow(2);
        assert_eq!(
            section_area(&carpet) + section_area(&net),
            whole,
            "n={number}"
        );
        if number.is_multiple_of(2) {
            assert_eq!(section_area(&carpet), whole / 2, "n={number}");
            continue;
        }
        for code in [23u128, 232, 3, 129] {
            let cell = mrly_three::create(Code(code), number, 1, 2).unwrap();
            assert_eq!(
                section_area(&cell),
                census(&cut(&cell).unwrap(), false).fills as u128,
                "code={code} n={number}"
            );
        }
    }
}

fn the_carpet_slice_counts_its_pieces_and_holes_two_ways() {
    let pieces = [1, 1, 7, 1, 19, 1, 37, 1, 61, 1, 91, 1, 127, 1];
    let punctures = [0, 1, 0, 7, 0, 19, 0, 37, 0, 61, 0, 91, 0, 127];
    for (index, (&want_pieces, &want_holes)) in pieces.iter().zip(punctures.iter()).enumerate() {
        let k = index + 1;
        let cut = slice(23, 2 * k - 1, 1);
        assert_eq!(components(&cut).unwrap(), want_pieces, "k={k}");
        assert_eq!(
            network_components(&slice_core_graph(&cut).unwrap()).unwrap(),
            want_pieces,
            "k={k}"
        );
        assert_eq!(holes(&cut).unwrap(), want_holes, "k={k}");
        assert_eq!(rim_holes(&cut).unwrap(), want_holes, "k={k}");
        let law = centered_hexagonal(k.div_ceil(2)) as usize;
        assert_eq!(
            if k.is_multiple_of(2) {
                want_holes
            } else {
                want_pieces
            },
            law,
            "k={k}"
        );
    }
}

fn the_other_families_puncture_in_opposite_phase() {
    for k in 1..11usize {
        for code in [3u128, 129] {
            let cut = slice(code, 2 * k - 1, 1);
            assert_eq!(holes(&cut).unwrap(), 0, "code={code} k={k}");
            assert_eq!(rim_holes(&cut).unwrap(), 0, "code={code} k={k}");
        }
    }
    for (k, want) in [(3usize, 1usize), (5, 7), (7, 19), (9, 37)] {
        let cut = slice(232, 2 * k - 1, 1);
        assert_eq!(holes(&cut).unwrap(), want, "k={k}");
        assert_eq!(rim_holes(&cut).unwrap(), want, "k={k}");
    }
}

fn the_carpet_slice_percolates_at_base_three() {
    for (level, triangles) in [(1usize, 42usize), (2, 306), (3, 2250)] {
        let cut = slice(23, 3, level);
        assert_eq!(census(&cut, false).fills, triangles, "l={level}");
        assert_eq!(components(&cut).unwrap(), 1, "l={level}");
        assert_eq!(giant(&cut).unwrap(), triangles, "l={level}");
    }
}

fn the_other_slices_shatter_or_never_grow_at_base_three() {
    for level in 1..4usize {
        let net = slice(232, 3, level);
        assert_eq!(census(&net, false).fills, 12, "l={level}");
        assert_eq!(components(&net).unwrap(), 1, "l={level}");
    }
    let mut tree = 0;
    let mut anti = 0;
    for level in 1..4usize {
        let cut = slice(3, 3, level);
        assert_eq!(giant(&cut).unwrap(), 8, "l={level}");
        assert!(components(&cut).unwrap() > tree, "l={level}");
        tree = components(&cut).unwrap();
        let cut = slice(129, 3, level);
        assert_eq!(giant(&cut).unwrap(), 6, "l={level}");
        assert!(components(&cut).unwrap() > anti, "l={level}");
        anti = components(&cut).unwrap();
    }
    assert_eq!((tree, anti), (40, 55));
}

fn the_carpet_slice_fails_to_percolate_at_base_five() {
    let cut = slice(23, 5, 2);
    assert_eq!(census(&cut, false).fills, 1164);
    assert_eq!(components(&cut).unwrap(), 20);
    assert_eq!(giant(&cut).unwrap(), 192);
}

fn reading(code: u128, number: usize, level: usize) -> (usize, usize, f64) {
    let cell = slice(code, number, level);
    let piece = giant_network(&cell).unwrap();
    let spectrum = laplacian_spectrum(&piece, true).unwrap();
    let zeros = spectrum.iter().filter(|v| **v < 1e-10).count();
    (
        piece.nodes.len(),
        zeros,
        spectral_exponent(&cell, 0.1).unwrap(),
    )
}

fn the_slice_exponent_climbs_with_the_size_it_is_read_at() {
    let rows = [
        (23u128, 3usize, 1usize, 42usize, 0.91),
        (23, 3, 2, 306, 1.25),
        (23, 5, 2, 192, 1.05),
    ];
    for (code, number, level, nodes, want) in rows {
        let (got_nodes, zeros, exponent) = reading(code, number, level);
        assert_eq!(got_nodes, nodes, "code={code} n={number} l={level}");
        assert_eq!(zeros, 1, "code={code} n={number} l={level}");
        assert!(
            (exponent - want).abs() < 0.005,
            "code={code} n={number} l={level} {exponent}"
        );
    }
}

fn the_deep_slices_hold_their_spectral_exponents() {
    for (code, number, level, nodes, want) in [
        (255u128, 9usize, 1usize, 486usize, 1.61),
        (23, 3, 3, 2250, 1.44),
        (255, 19, 1, 2166, 1.79),
    ] {
        let (got_nodes, zeros, exponent) = reading(code, number, level);
        assert_eq!(got_nodes, nodes, "code={code} n={number}");
        assert_eq!(zeros, 1, "code={code} n={number}");
        assert!(
            (exponent - want).abs() < 0.005,
            "code={code} n={number} {exponent}"
        );
    }
}
