use mrly_roulette::*;
use std::f64::consts::{PI, TAU};

pub const ALL: &[witness::Witness] = &[
    (
        "the_simple_curve_holds_its_whole_inside_in_the_hole",
        the_simple_curve_holds_its_whole_inside_in_the_hole,
    ),
    (
        "the_disc_reads_the_innermost_curve_and_not_the_farthest_seat",
        the_disc_reads_the_innermost_curve_and_not_the_farthest_seat,
    ),
    (
        "the_mean_winding_is_the_signed_areas_over_the_disc",
        the_mean_winding_is_the_signed_areas_over_the_disc,
    ),
];

fn ring() -> Vec<u8> {
    vec![1, 1, 1, 1, 0, 1, 1, 1, 1]
}

fn the_simple_curve_holds_its_whole_inside_in_the_hole() {
    let d = 0.9;
    for (kind, rho) in [("in", 2.0), ("out", 4.0)] {
        let path = track(kind, 3, 1, 4, 1).unwrap();
        let pencil = Pencil {
            x: d,
            y: 0.0,
            seat: (1, 0),
            kind: Kind::Fill,
        };
        let bounds = disc(&path, &[pencil]).unwrap();
        assert!((bounds.radius - (rho + d)).abs() < 1e-12);
        assert!((bounds.hole - (rho - d)).abs() < 1e-12);
        let form = rho * (rho + path.side * d * d) / (rho + d).powi(2);
        let side = 512;
        let slack = 2.0 * TAU * rho * (1.0 + d) * (2.0 * (rho + d) / side as f64)
            / (PI * (rho + d).powi(2));
        let cover = cover(&path, &[pencil], true, 2, side).unwrap();
        assert_eq!(cover.mask.len(), side * side);
        assert!((cover.areas - form).abs() < 1e-12);
        assert!(cover.covered < slack);
        assert!((cover.hole - form).abs() < slack);
        assert!((cover.winding - form).abs() < slack);
    }
}

fn the_disc_reads_the_innermost_curve_and_not_the_farthest_seat() {
    let corners = pencils(&ring(), 3, 3, "corners", 1.2, 0.0, 1).unwrap();
    let straddle = track("in", 3, 2, 4, 1).unwrap();
    let bounds = disc(&straddle, &corners).unwrap();
    assert_eq!(
        format!("{:.6} {:.6}", bounds.radius, bounds.hole),
        "3.400000 0.200000"
    );
    let inscribed = (bounds.hole / bounds.radius).powi(2);
    let cover = cover(&straddle, &corners, true, 2, 512).unwrap();
    assert!(cover.hole >= inscribed && cover.hole < 2.0 * inscribed);
    let out = track("in", 5, 4, 4, 1).unwrap();
    let far = Pencil {
        x: 0.9,
        y: 0.0,
        seat: (1, 0),
        kind: Kind::Fill,
    };
    let past = disc(&out, &[far]).unwrap();
    assert_eq!(
        format!("{:.6} {:.6}", past.radius, past.hole),
        "4.600000 2.600000"
    );
    let empty = disc(&straddle, &[]).unwrap();
    assert_eq!(
        format!("{:.6} {:.6}", empty.radius, empty.hole),
        "1.000000 1.000000"
    );
}

fn the_mean_winding_is_the_signed_areas_over_the_disc() {
    let fills = pencils(&ring(), 3, 3, "fill", 0.9, 0.0, 1).unwrap();
    let seven = track("in", 7, 3, 4, 1).unwrap();
    let drawn = representatives(&seven, &fills, true);
    assert_eq!(drawn.len(), 8);
    let bounds = disc(&seven, &fills).unwrap();
    let area = PI * bounds.radius * bounds.radius;
    let want: f64 = drawn
        .iter()
        .map(|&k| signed_area(&seven, &fills[k]).unwrap())
        .sum::<f64>()
        / area;
    let side = 384;
    let arcs: f64 = drawn
        .iter()
        .map(|&k| TAU * 3.0 * 4.0 * (1.0 + fills[k].x.hypot(fills[k].y)))
        .sum();
    let slack = 2.0 * arcs * (2.0 * bounds.radius / side as f64) / area;
    let cover = cover(&seven, &fills, true, 2, side).unwrap();
    assert!((cover.areas - want).abs() < 1e-12);
    assert!((cover.winding - want).abs() < slack);
    assert!(cover.covered > 0.0 && cover.hole > 0.0);
    assert!((cover.covered + cover.hole) < 1.0);
    assert_eq!(
        format!("{:.6} {:.6}", bounds.radius, bounds.hole),
        "5.800000 2.200000"
    );
    let walled = mrly_roulette::cover(&seven, &fills, true, 2, 256).unwrap();
    assert_eq!(walled.mask.len(), 256 * 256);
    assert_eq!(
        format!(
            "{:.6} {:.6} {:.6} {:.6} {:.6}",
            walled.covered, walled.hole, walled.wall, walled.winding, walled.areas
        ),
        "0.814487 0.140825 0.269255 9.104609 9.103448"
    );
    let inside = walled.mask.iter().filter(|&&code| code > 0).count();
    let shape = walled.mask.iter().filter(|&&code| code == 3).count();
    assert_eq!(format!("{:.6}", shape as f64 / inside as f64), "0.814487");
}
