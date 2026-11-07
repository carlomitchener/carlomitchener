use mrly_math::code::Code;
use mrly_sequences::counts::hex::{
    solid_slice_boundary, solid_slice_edges, solid_slice_interior, solid_slice_triangles,
    solid_slice_vertices,
};
use mrly_hex::census::*;
use mrly_hex::geometry::cut;
use mrly_hex::graph::slice_core_graph;
use mrly_hex::CellHex;
use mrly_three;

pub const ALL: &[witness::Witness] = &[
    (
        "the_five_closed_forms_match_the_census_to_eight",
        the_five_closed_forms_match_the_census_to_eight,
    ),
    (
        "a_blind_quadratic_fit_reproduces_the_wider_slices",
        a_blind_quadratic_fit_reproduces_the_wider_slices,
    ),
    (
        "fresh_builds_at_the_wide_sides_hold_the_forms",
        fresh_builds_at_the_wide_sides_hold_the_forms,
    ),
    (
        "the_fill_adjacency_counts_the_sub_mesh_interior_edges",
        the_fill_adjacency_counts_the_sub_mesh_interior_edges,
    ),
    (
        "the_lemma_needs_the_sub_mesh_and_not_the_hexagon",
        the_lemma_needs_the_sub_mesh_and_not_the_hexagon,
    ),
];

fn solid_slice(number: usize) -> CellHex {
    cut(&mrly_three::ones(number, 1).unwrap()).unwrap()
}

fn readings(rec: &Census) -> [i64; 5] {
    [
        rec.triangles as i64,
        rec.boundary_edges as i64,
        rec.edges as i64,
        rec.interior_edges as i64,
        rec.vertices as i64,
    ]
}

fn lagrange(seed: [i64; 3], k: i64) -> i64 {
    seed[0] * (k - 2) * (k - 3) / 2 - seed[1] * (k - 1) * (k - 3) + seed[2] * (k - 1) * (k - 2) / 2
}

fn the_five_closed_forms_match_the_census_to_eight() {
    for index in 1..9usize {
        let number = 2 * index - 1;
        let rec = census(&solid_slice(number), false);
        let k = index as i64;
        assert_eq!(readings(&rec)[0], 24 * k * k - 24 * k + 6, "k={k}");
        assert_eq!(readings(&rec)[1], 12 * k - 6, "k={k}");
        assert_eq!(readings(&rec)[2], 36 * k * k - 30 * k + 6, "k={k}");
        assert_eq!(readings(&rec)[3], 36 * k * k - 42 * k + 12, "k={k}");
        assert_eq!(readings(&rec)[4], 12 * k * k - 6 * k + 1, "k={k}");
        assert_eq!(rec.euler, 1, "k={k}");
        let closed = [
            solid_slice_triangles(number).unwrap(),
            solid_slice_boundary(number).unwrap(),
            solid_slice_edges(number).unwrap(),
            solid_slice_interior(number).unwrap(),
            solid_slice_vertices(number).unwrap(),
        ];
        for (got, want) in readings(&rec).iter().zip(closed) {
            assert_eq!(*got as u128, want, "k={k}");
        }
    }
    let three = census(&solid_slice(3), false);
    assert_eq!(readings(&three), [54, 18, 90, 72, 37]);
}

fn a_blind_quadratic_fit_reproduces_the_wider_slices() {
    let seed: Vec<[i64; 5]> = (1..4)
        .map(|k| readings(&census(&solid_slice(2 * k - 1), false)))
        .collect();
    for k in 4..11i64 {
        let rec = census(&solid_slice(2 * k as usize - 1), false);
        let got = readings(&rec);
        for j in 0..5 {
            let fitted = lagrange([seed[0][j], seed[1][j], seed[2][j]], k);
            assert_eq!(got[j], fitted, "k={k} count={j}");
        }
    }
}

fn fresh_builds_at_the_wide_sides_hold_the_forms() {
    for k in [12usize, 16, 20] {
        let number = 2 * k - 1;
        let rec = census(&solid_slice(number), false);
        assert_eq!(
            readings(&rec).map(|v| v as u128),
            [
                solid_slice_triangles(number).unwrap(),
                solid_slice_boundary(number).unwrap(),
                solid_slice_edges(number).unwrap(),
                solid_slice_interior(number).unwrap(),
                solid_slice_vertices(number).unwrap(),
            ],
            "k={k}"
        );
        if number == 39 {
            assert_eq!(readings(&rec), [9126, 234, 13806, 13572, 4681]);
        }
    }
}

fn the_fill_adjacency_counts_the_sub_mesh_interior_edges() {
    let mut meshes = 0;
    for level in 1..4usize {
        for design in [None, Some(23u128), Some(232), Some(3), Some(129)] {
            let cell = match design {
                None => mrly_three::ones(3, level).unwrap(),
                Some(code) => mrly_three::create(Code(code), 3, level, 2).unwrap(),
            };
            let slice = cut(&cell).unwrap();
            let sub = fills_only(&slice);
            let core = slice_core_graph(&slice).unwrap();
            assert_eq!(
                core.nodes.len(),
                sub.triangles,
                "design={design:?} l={level}"
            );
            assert_eq!(
                core.branches.len(),
                sub.edges - sub.boundary_edges,
                "design={design:?} l={level}"
            );
            meshes += 1;
        }
    }
    assert_eq!(meshes, 15);
}

fn the_lemma_needs_the_sub_mesh_and_not_the_hexagon() {
    let slice = cut(&mrly_three::carpet(3, 3).unwrap()).unwrap();
    let sub = fills_only(&slice);
    let whole = census(&slice, false);
    assert_eq!(slice_core_graph(&slice).unwrap().branches.len(), 2880);
    assert_eq!(sub.edges - sub.boundary_edges, 2880);
    assert_eq!(whole.edges - whole.boundary_edges, 6480);
}
