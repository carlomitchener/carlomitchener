use mrly_math::code::Code;
use mrly_math::factory;
use mrly_sequences::counts::counting::*;

pub const ALL: &[witness::Witness] = &[("fill_matches_rendered_sum", fill_matches_rendered_sum)];

fn fill_matches_rendered_sum() {
    for dimension in 2..=3usize {
        for code in [Code(0), Code(1), Code(7), Code(23), Code(100)] {
            if code >= factory::total_codes(dimension, 2).unwrap() {
                continue;
            }
            for number in 1..6 {
                for level in 1..3 {
                    let rendered =
                        factory::create(code, number, dimension, 2, level as usize).unwrap();
                    assert_eq!(
                        fill(code, number, dimension, level, 2).unwrap(),
                        rendered.sum() as u128,
                        "code={code} d={dimension} n={number} l={level}"
                    );
                }
            }
        }
    }
}
