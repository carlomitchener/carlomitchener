use mrly_bang::universe::*;
use mrly_math::code::Code;
use std::collections::BTreeSet;

pub const ALL: &[witness::Witness] = &[
    (
        "total_exposure_names_the_independent_corner_sets",
        total_exposure_names_the_independent_corner_sets,
    ),
    (
        "half_the_rules_hold_the_all_even_corner",
        half_the_rules_hold_the_all_even_corner,
    ),
];

fn total_exposure_names_the_independent_corner_sets() {
    let exposed: Vec<Code> = (0..256u128)
        .map(Code::from)
        .filter(|&c| total_exposure(c, 3))
        .collect();
    assert_eq!(exposed.len(), 35);
    let classes: BTreeSet<Code> = exposed
        .iter()
        .map(|&c| *orbit(c, 3).iter().next().unwrap())
        .collect();
    assert_eq!(
        classes.into_iter().map(Code::get).collect::<Vec<u128>>(),
        [0, 1, 6, 22, 24, 105]
    );
    assert!(total_exposure(Code::from(129u64), 3));
    assert!(!total_exposure(Code::from(23u64), 3));
}

fn half_the_rules_hold_the_all_even_corner() {
    assert_eq!(
        (0..256u128)
            .map(Code::from)
            .filter(|&c| touches_every_corner(c, 3))
            .count(),
        128
    );
    for code in [23u128, 3, 129] {
        assert!(touches_every_corner(Code::from(code), 3), "code={code}");
    }
    assert!(!touches_every_corner(Code::from(232u64), 3));
}
