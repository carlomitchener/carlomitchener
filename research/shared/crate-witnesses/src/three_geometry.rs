use mrly_three::designs;

pub const ALL: &[witness::Witness] = &[(
    "orientations_preserve_sum_and_shape",
    orientations_preserve_sum_and_shape,
)];

fn orientations_preserve_sum_and_shape() {
    let c = designs::carpet(3, 1).unwrap();
    for i in 0..24 {
        let o = c.clone().orient(i).unwrap();
        assert_eq!(o.types().sum(), c.types().sum());
        assert_eq!(o.types().shape, c.types().shape);
    }
    assert!(c.clone().orient(24).is_err());
}
