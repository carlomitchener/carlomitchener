use mrly_apollonian::*;
use mrly_num::factor::gcd;

pub const ALL: &[witness::Witness] = &[
    (
        "every_line_tangent_circle_is_the_ford_circle_over_its_own_fraction",
        every_line_tangent_circle_is_the_ford_circle_over_its_own_fraction,
    ),
    (
        "the_stack_is_the_shadow_of_the_line_tangent_circles",
        the_stack_is_the_shadow_of_the_line_tangent_circles,
    ),
];

fn every_line_tangent_circle_is_the_ford_circle_over_its_own_fraction() {
    let p = grow("strip", 2048).unwrap();
    let marks = touches(&p);
    assert_eq!(marks.len(), 323);
    assert_eq!(
        marks[0],
        Touch {
            num: 1,
            den: 32,
            k: 2048
        }
    );
    assert_eq!(
        marks[322],
        Touch {
            num: 31,
            den: 32,
            k: 2048
        }
    );
    assert!(p
        .circles
        .iter()
        .filter(|c| on_line(**c))
        .all(|&c| is_ford(c)));
    for mark in &marks {
        assert_eq!(mark.k, 2 * mark.den * mark.den);
        assert_eq!(gcd(mark.num as u128, mark.den as u128), 1);
    }
    assert!(marks
        .windows(2)
        .all(|pair| { pair[0].num * pair[1].den < pair[1].num * pair[0].den }));
    assert!(touches(&grow("-1,2,2,3", 2048).unwrap()).is_empty());
}

fn the_stack_is_the_shadow_of_the_line_tangent_circles() {
    let p = grow("strip", 2048).unwrap();
    let read = shadow(&p, 32).unwrap();
    assert!(read.covered);
    assert_eq!(read.reach, 2048);
    assert_eq!((read.nodes, read.touched, read.missed), (323, 323, 0));
    assert_eq!(read.offford, 0);
    assert_eq!((read.bright, read.want), (528, 528));
    let shallow = shadow(&p, 16).unwrap();
    assert_eq!(
        (
            shallow.nodes,
            shallow.touched,
            shallow.missed,
            shallow.bright
        ),
        (79, 79, 0, 136)
    );
    assert!(!shadow(&grow("strip", 512).unwrap(), 32).unwrap().covered);
    assert_eq!(
        shadow(&grow("-1,2,2,3", 1000).unwrap(), 32).unwrap().nodes,
        0
    );
    assert!(shadow(&p, ORDER_CAP + 1).is_err());
    assert!(shadow(&p, 0).is_err());
}
