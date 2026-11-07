use mrly_roulette::crossings::*;
use mrly_roulette::{distinct, pencils, track};

pub const ALL: &[witness::Witness] = &[
    (
        "two_curves_on_one_orbit_cross_twice_the_ratio_whatever_their_seats",
        two_curves_on_one_orbit_cross_twice_the_ratio_whatever_their_seats,
    ),
    (
        "a_curve_below_the_threshold_crosses_itself_a_times_b_less_one",
        a_curve_below_the_threshold_crosses_itself_a_times_b_less_one,
    ),
    (
        "an_alignment_reach_crowds_the_nodes_and_the_points_fall_short",
        an_alignment_reach_crowds_the_nodes_and_the_points_fall_short,
    ),
    (
        "the_coincident_pencils_collapse_to_one_pencil_a_curve",
        the_coincident_pencils_collapse_to_one_pencil_a_curve,
    ),
];

fn carpet() -> Vec<u8> {
    vec![1, 1, 1, 1, 0, 1, 1, 1, 1]
}

fn two_curves_on_one_orbit_cross_twice_the_ratio_whatever_their_seats() {
    let seats = pencils(&carpet(), 3, 3, "fill", 0.3, 0.0, 1).unwrap();
    for a in [3, 4, 5, 6, 7] {
        let path = track("in", a, 1, 4, 1).unwrap();
        let count = nodes(&path, &seats, 3000, 4e-4).unwrap();
        assert_eq!(count.paired(), 56 * a);
        assert_eq!(count.selved(), 0);
        assert_eq!((count.most, count.crowded), (1, 0));
    }
}

fn a_curve_below_the_threshold_crosses_itself_a_times_b_less_one() {
    let seats = pencils(&[1, 0, 0, 0, 0, 0, 0, 1, 0], 3, 3, "fill", 0.9, 0.0, 1).unwrap();
    let path = track("in", 7, 4, 4, 1).unwrap();
    let count = nodes(&path, &seats, 6000, 4e-4).unwrap();
    assert_eq!(count.selves, vec![21, 21]);
    assert_eq!(count.pair(0, 1), 56);
    assert_eq!(count.total(), 98);
}

fn an_alignment_reach_crowds_the_nodes_and_the_points_fall_short() {
    let seats = pencils(&carpet(), 3, 3, "fill", 0.79, 0.0, 1).unwrap();
    let path = track("in", 7, 3, 4, 1).unwrap();
    let count = nodes(&path, &seats, 6000, 4e-4).unwrap();
    assert_eq!((count.total(), count.crowded, count.most), (1288, 28, 6));
    assert_eq!((count.points, count.branches), (1148, 2352));
}

fn the_coincident_pencils_collapse_to_one_pencil_a_curve() {
    let seats = pencils(&carpet(), 3, 3, "fill", 0.9, 0.0, 1).unwrap();
    for (kind, ring, wheel) in [("in", 7, 4), ("in", 7, 2), ("in", 7, 3), ("out", 5, 8)] {
        let path = track(kind, ring, wheel, 4, 1).unwrap();
        assert_eq!(
            spread(&path, &seats, true).len(),
            distinct(&path, &seats, true)
        );
    }
}
