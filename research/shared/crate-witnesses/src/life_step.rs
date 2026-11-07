use mrly_life::step::*;
use mrly_life::Boundary;
use mrly_two::Cell2d;

pub const ALL: &[witness::Witness] = &[(
    "the_fft_step_is_the_crate_step_on_a_design_mask",
    the_fft_step_is_the_crate_step_on_a_design_mask,
)];

fn the_fft_step_is_the_crate_step_on_a_design_mask() {
    use mrly_fft::{convolve, embed_kernel};
    use mrly_life::design_mask;
    use mrly_math::code::Code;
    use mrly_rand::Rng;
    use mrly_tensor::Tensor;
    let size = 32;
    for (level, birth, survive) in [
        (1usize, (0.375, 0.375), (0.25, 0.375)),
        (2, (0.28, 0.38), (0.28, 0.48)),
    ] {
        let mask = design_mask(2, Code::from(7u128), 3, level).unwrap();
        let budget = mask.sum() as usize;
        let window = |(lo, hi): (f64, f64)| -> Vec<usize> {
            (0..=budget)
                .filter(|&k| {
                    let share = k as f64 / budget as f64;
                    lo <= share && share <= hi
                })
                .collect()
        };
        let (born, kept) = (window(birth), window(survive));
        let kernel = embed_kernel(mask.bytes().unwrap(), mask.shape[0], size).unwrap();
        let mut rng = Rng::new(11);
        let mut fast: Vec<u8> = (0..size * size)
            .map(|_| u8::from(rng.chance(0.5)))
            .collect();
        let mut slow = Cell2d::new(Tensor::of(fast.clone(), vec![size, size]).unwrap()).unwrap();
        for step in 0..8 {
            let field: Vec<f64> = fast.iter().map(|&t| f64::from(t)).collect();
            let counts = convolve(&field, &kernel, size).unwrap();
            fast = fast
                .iter()
                .zip(&counts)
                .map(|(&t, &count)| {
                    let n = count.round() as usize;
                    u8::from(if t != 0 {
                        kept.contains(&n)
                    } else {
                        born.contains(&n)
                    })
                })
                .collect();
            slow = next_grid(&slow, &born, &kept, &mask, Boundary::Wrap).unwrap();
            assert_eq!(
                slow.types().bytes().unwrap(),
                &fast[..],
                "level {level} step {step}"
            );
        }
        assert!(fast.contains(&1));
    }
}
