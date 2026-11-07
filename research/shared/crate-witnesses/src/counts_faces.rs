use mrly_math::code::Code;
use mrly_math::factory;
use mrly_sequences::counts::exposure_of_tile;
use mrly_sequences::counts::faces::*;
use mrly_tensor::Tensor;
use mrly_three;
use mrly_two;
use std::collections::HashSet;

pub const ALL: &[witness::Witness] = &[
    (
        "the_recurrence_matches_the_rendered_skeleton",
        the_recurrence_matches_the_rendered_skeleton,
    ),
    (
        "the_rendered_skeleton_is_the_census",
        the_rendered_skeleton_is_the_census,
    ),
    (
        "the_terms_obey_the_recurrence",
        the_terms_obey_the_recurrence,
    ),
    ("the_classics_close", the_classics_close),
    (
        "a_repeated_root_carries_a_linear_term",
        a_repeated_root_carries_a_linear_term,
    ),
];

fn brute(grid: &Tensor) -> Skeleton {
    let dimension = grid.shape.len();
    let mut seen: Vec<HashSet<(Vec<usize>, u32)>> = vec![HashSet::new(); dimension + 1];
    for flat in 0..grid.size() {
        if grid.at(flat) == 0 {
            continue;
        }
        let mut coords = vec![0usize; dimension];
        let mut rest = flat;
        for axis in (0..dimension).rev() {
            coords[axis] = rest % grid.shape[axis];
            rest /= grid.shape[axis];
        }
        for spans in 0..1u32 << dimension {
            for ends in 0..1u32 << dimension {
                if ends & spans != 0 {
                    continue;
                }
                let corner: Vec<usize> = (0..dimension)
                    .map(|axis| coords[axis] + (ends >> axis & 1) as usize)
                    .collect();
                seen[spans.count_ones() as usize].insert((corner, spans));
            }
        }
    }
    let counts: Vec<u128> = seen.iter().map(|faces| faces.len() as u128).collect();
    let euler = counts
        .iter()
        .enumerate()
        .map(|(k, &count)| {
            if k % 2 == 0 {
                count as i128
            } else {
                -(count as i128)
            }
        })
        .sum();
    Skeleton { counts, euler }
}

fn the_recurrence_matches_the_rendered_skeleton() {
    for (code, dimension, base, top) in [
        (7u128, 2usize, 2usize, 4u32),
        (6, 2, 2, 4),
        (13, 2, 2, 4),
        (100, 2, 3, 4),
        (23, 3, 2, 4),
        (254, 3, 2, 4),
        (105, 3, 2, 4),
        (123456789, 3, 3, 3),
        (23, 3, 3, 3),
    ] {
        let code = Code(code);
        let tile = factory::create(code, 3, dimension, base, 1).unwrap();
        let placements = Placements::of_tile(&tile).unwrap();
        for level in 1..=top {
            let grid = factory::create(code, 3, dimension, base, level as usize).unwrap();
            assert_eq!(
                placements.at(level).unwrap(),
                brute(&grid),
                "code={code} d={dimension} q={base} l={level}"
            );
        }
    }
}

fn the_rendered_skeleton_is_the_census() {
    let carpet = mrly_two::census::census(&mrly_two::create(Code(7), 3, 2, 0, 2).unwrap()).unwrap();
    let level_two = skeleton(Code(7), 3, 2, 2, 2).unwrap();
    assert_eq!(
        (
            level_two.vertices(),
            level_two.edges(),
            level_two.cells(),
            level_two.euler
        ),
        (
            carpet.vertices as u128,
            carpet.edges as u128,
            64,
            carpet.euler as i128
        )
    );
    let euler: Vec<i128> = (1..4)
        .map(|l| skeleton(Code(7), 3, 2, 2, l).unwrap().euler)
        .collect();
    assert_eq!(euler, [0, -8, -72]);
    for level in 1..3 {
        let sponge =
            mrly_three::census(&mrly_three::create(Code(23), 3, level, 2).unwrap()).unwrap();
        let closed = skeleton(Code(23), 3, 3, 2, level as u32).unwrap();
        assert_eq!(
            closed.counts,
            [
                sponge.vertices as u128,
                sponge.edges as u128,
                sponge.faces as u128,
                sponge.fills as u128
            ]
        );
        assert_eq!(closed.euler, sponge.euler as i128);
    }
}

fn the_terms_obey_the_recurrence() {
    for (code, dimension, base) in [
        (7u128, 2usize, 2usize),
        (6, 2, 2),
        (100, 2, 3),
        (23, 3, 2),
        (254, 3, 2),
        (123456789, 3, 3),
    ] {
        let tile = factory::create(Code(code), 3, dimension, base, 1).unwrap();
        let placements = Placements::of_tile(&tile).unwrap();
        let skeletons: Vec<Skeleton> = (0..12).map(|l| placements.at(l).unwrap()).collect();
        for (level, skeleton) in skeletons.iter().enumerate().skip(1) {
            let exposed = exposure_of_tile(&tile, level as u32).unwrap();
            assert_eq!(
                2 * skeleton.counts[dimension - 1],
                2 * dimension as u128 * skeleton.cells() + exposed,
                "code={code} l={level}"
            );
        }
        for k in 0..=dimension {
            let rule = placements.recurrence(Some(k)).unwrap();
            let terms: Vec<i128> = skeletons.iter().map(|s| s.counts[k] as i128).collect();
            for at in rule.len()..terms.len() {
                let predicted: i128 = rule
                    .iter()
                    .enumerate()
                    .map(|(back, &c)| c * terms[at - back - 1])
                    .sum();
                assert_eq!(
                    predicted, terms[at],
                    "code={code} k={k} at={at} rule={rule:?}"
                );
            }
        }
        let rule = placements.recurrence(None).unwrap();
        let terms: Vec<i128> = skeletons.iter().map(|s| s.euler).collect();
        for at in rule.len()..terms.len() {
            let predicted: i128 = rule
                .iter()
                .enumerate()
                .map(|(back, &c)| c * terms[at - back - 1])
                .sum();
            assert_eq!(
                predicted, terms[at],
                "code={code} euler at={at} rule={rule:?}"
            );
        }
    }
}

fn the_classics_close() {
    let carpet = factory::create(Code(7), 3, 2, 2, 1).unwrap();
    let carpet = Placements::of_tile(&carpet).unwrap();
    assert_eq!(carpet.roots(Some(0)), [(1, 1), (3, 1), (8, 1)]);
    for level in 0..10u32 {
        let (three, eight) = (3u128.pow(level), 8u128.pow(level));
        let skeleton = carpet.at(level).unwrap();
        assert_eq!(35 * skeleton.vertices(), 40 + 56 * three + 44 * eight);
        assert_eq!(5 * skeleton.edges(), 8 * three + 12 * eight);
        assert_eq!(skeleton.cells(), eight);
        assert_eq!(7 * skeleton.euler, 8 - eight as i128);
    }
    let sponge = factory::create(Code(23), 3, 3, 2, 1).unwrap();
    let sponge = Placements::of_tile(&sponge).unwrap();
    assert_eq!(sponge.roots(None), [(1, 1), (3, 1), (8, 1), (20, 1)]);
    assert_eq!(sponge.recurrence(Some(0)).unwrap(), [32, -275, 724, -480]);
    for level in 0..10u32 {
        let (three, eight, twenty) = (3u128.pow(level), 8u128.pow(level), 20u128.pow(level));
        let skeleton = sponge.at(level).unwrap();
        assert_eq!(
            11305 * skeleton.vertices(),
            16320 + 25536 * three + 28424 * eight + 20160 * twenty
        );
        assert_eq!(
            85 * skeleton.edges(),
            192 * three + 408 * eight + 420 * twenty
        );
        assert_eq!(skeleton.faces(), 2 * eight + 4 * twenty);
        assert_eq!(skeleton.cells(), twenty);
        assert_eq!(
            133 * skeleton.euler,
            192 - 38 * eight as i128 - 21 * twenty as i128
        );
    }
    let vertices: Vec<u128> = (1..5).map(|l| sponge.at(l).unwrap().vertices()).collect();
    assert_eq!(vertices, [64, 896, 15616, 295808]);
    let euler: Vec<i128> = (1..5).map(|l| sponge.at(l).unwrap().euler).collect();
    assert_eq!(euler, [-4, -80, -1408, -26432]);
}

fn a_repeated_root_carries_a_linear_term() {
    let tile = factory::create(Code(123456789), 3, 3, 3, 1).unwrap();
    let placements = Placements::of_tile(&tile).unwrap();
    assert_eq!(
        placements.roots(Some(0)),
        [(0, 2), (1, 2), (2, 1), (3, 1), (5, 1), (16, 1)]
    );
    assert_eq!(
        placements.roots(Some(1)),
        [(0, 1), (1, 1), (2, 1), (3, 1), (5, 1), (16, 1)]
    );
    let vertices: Vec<u128> = (0..6)
        .map(|l| placements.at(l).unwrap().vertices())
        .collect();
    assert_eq!(vertices, [8, 57, 699, 10463, 164778, 2626182]);
    for level in 2..12u32 {
        let [one, two, three, five, sixteen] = [1i128, 2, 3, 5, 16].map(|root| root.pow(level));
        let powers = 57657600 * 193 / 225 * one + 11 * 1921920 * i128::from(level)
            - 57657600 * 19 / 28 * two
            + 57657600 * 667 / 156 * three
            + 57657600 * 941 / 1100 * five
            + 144201667 * sixteen;
        let vertices = placements.at(level).unwrap().vertices() as i128;
        assert_eq!(57657600 * vertices, powers, "l={level}");
    }
}
