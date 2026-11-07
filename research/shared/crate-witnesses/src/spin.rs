use mrly_math::atoms;
use mrly_spin::*;

pub const ALL: &[witness::Witness] = &[
    (
        "the_mass_of_the_profile_is_the_fill",
        the_mass_of_the_profile_is_the_fill,
    ),
    (
        "the_spin_mass_scales_by_the_fill_about_a_filled_corner",
        the_spin_mass_scales_by_the_fill_about_a_filled_corner,
    ),
    (
        "the_harmonics_read_the_rotation_order",
        the_harmonics_read_the_rotation_order,
    ),
];

fn floats(grid: &mrly_tensor::Tensor) -> Vec<f32> {
    grid.bytes().unwrap().iter().map(|&b| b as f32).collect()
}

fn the_mass_of_the_profile_is_the_fill() {
    let carpet = atoms::carpet_nd(3, 2)
        .kron(&atoms::carpet_nd(3, 2))
        .kron(&atoms::carpet_nd(3, 2));
    let data = floats(&carpet);
    let fills = data.iter().sum::<f32>() as f64;
    assert_eq!(fills, 512.0);
    let rings = profile(&data, 27, 4000).unwrap();
    assert!((mass(&rings, 27) - fills).abs() / fills < 0.002);
}

fn the_spin_mass_scales_by_the_fill_about_a_filled_corner() {
    let tile = atoms::carpet_nd(3, 2);
    let carpet = tile.kron(&tile).kron(&tile).kron(&tile);
    let side = 81usize;
    let wide = 2 * side;
    let mut data = vec![0.0f32; wide * wide];
    let bytes = carpet.bytes().unwrap();
    for row in 0..side {
        for col in 0..side {
            data[(row + side) * wide + col + side] = bytes[row * side + col] as f32;
        }
    }
    let rings = profile(&data, wide, 4000).unwrap();
    assert!(mass_within(&rings, wide, 1e-6).abs() < 1e-9);
    for radius in [12.0f64, 18.0, 27.0] {
        let near = mass_within(&rings, wide, radius);
        let far = mass_within(&rings, wide, 3.0 * radius);
        assert!(near > 0.0);
        assert!((far / (8.0 * near) - 1.0).abs() < 0.08, "radius {radius}");
    }
    let whole = mass_within(&rings, wide, reach(wide));
    assert!((whole - mass(&rings, wide)).abs() / whole < 1e-9);
}

fn the_harmonics_read_the_rotation_order() {
    let square = harmonics(&floats(&atoms::ones_2d(8)), 8, 128, 12).unwrap();
    assert!(square[0] > 0.0);
    assert!(square[4] > 1e-3 * square[0]);
    assert!(square[8] > 1e-3 * square[0]);
    for m in [1, 2, 3, 5, 6, 7, 9, 10, 11] {
        assert!(square[m] < 1e-9 * square[0], "m {m}");
    }
    assert_eq!(turns(&square), 4);
    let mut bar = vec![0.0f32; 16];
    for i in [5, 6, 9, 10, 4, 11] {
        bar[i] = 1.0;
    }
    assert_eq!(turns(&harmonics(&bar, 4, 64, 8).unwrap()), 2);
    let mut blob = vec![0.0f32; 16];
    blob[0] = 1.0;
    assert_eq!(turns(&harmonics(&blob, 4, 64, 8).unwrap()), 1);
    assert_eq!(turns(&[1.0, 0.0, 0.0]), 0);
    assert_eq!(
        (petals(6, 4), petals(8, 4), petals(5, 1), petals(3, 0)),
        (12, 8, 5, 0)
    );
}
