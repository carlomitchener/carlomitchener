use mrly_math::atoms;
use mrly_math::code::Code;
use mrly_math::factory;
use mrly_sequences::counts::surface::*;

pub const ALL: &[witness::Witness] = &[
    (
        "prediction_matches_census_on_every_cube_code",
        prediction_matches_census_on_every_cube_code,
    ),
    (
        "the_corners_fold_what_the_tile_shows",
        the_corners_fold_what_the_tile_shows,
    ),
    ("the_classics_close", the_classics_close),
];

fn prediction_matches_census_on_every_cube_code() {
    for bits in 0..256u128 {
        let code = Code(bits);
        for level in 1..3u32 {
            let direct = factory::create(code, 3, 3, 2, level as usize).unwrap();
            assert_eq!(
                surface(code, 3, level, 2).unwrap(),
                direct.exposed(),
                "code={code} l={level}"
            );
        }
    }
}

fn the_corners_fold_what_the_tile_shows() {
    for bits in 0..256u128 {
        let code = Code(bits);
        for number in [1usize, 2, 3, 4, 5, 7] {
            let filled = factory::code_to_corners(code, 3, 2).unwrap();
            let tile = factory::create(code, number, 3, 2, 1).unwrap();
            assert_eq!(
                Exposure::from_corners(&filled, number, 3, 2),
                Exposure::of_tile(&tile),
                "code={code} n={number}"
            );
        }
    }
    for (code, dimension, base) in [
        (Code(7), 2usize, 3usize),
        (Code(100), 2, 3),
        (Code(511), 2, 3),
        (Code(4369), 4, 2),
        (Code(32767), 4, 2),
        (Code(1), 1, 2),
        (Code(2), 1, 3),
    ] {
        for number in [2usize, 3, 4, 5, 6, 9] {
            let filled = factory::code_to_corners(code, dimension, base).unwrap();
            let tile = factory::create(code, number, dimension, base, 1).unwrap();
            assert_eq!(
                Exposure::from_corners(&filled, number, dimension, base),
                Exposure::of_tile(&tile),
                "code={code} d={dimension} q={base} n={number}"
            );
        }
    }
}

fn the_classics_close() {
    let sponge: Vec<u128> = (1..4)
        .map(|l| surface(Code(23), 3, l, 2).unwrap())
        .collect();
    assert_eq!(sponge, [72, 1056, 18048]);
    let carpet: Vec<u128> = (1..5)
        .map(|l| exposure(Code(7), 3, 2, l, 2).unwrap())
        .collect();
    assert_eq!(carpet, [16, 80, 496, 3536]);
    assert_eq!(
        exposure_recurrence(&factory::create(Code(7), 3, 2, 2, 1).unwrap()),
        [11, -24]
    );
    assert_eq!(exposure_of_tile(&atoms::ones_3d(2), 3), Some(384));
    assert_eq!(exposure_of_tile(&atoms::ones_3d(1), 5), Some(6));
    assert!(exposure(Code(23), 3, 3, 120, 2).is_err());
}
