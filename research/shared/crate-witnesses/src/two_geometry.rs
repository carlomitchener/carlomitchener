use mrly_tensor::Tensor;
use mrly_two::designs;
use mrly_two::geometry::*;

pub const ALL: &[witness::Witness] = &[(
    "special_rotations_preserve_sum",
    special_rotations_preserve_sum,
)];

fn special_rotations_preserve_sum() {
    let tree = designs::htree(3, 1).unwrap();
    let mask = Tensor::of(vec![0, 1, 3, 2], vec![2, 2]).unwrap();
    let s = special(&mask, &tree).unwrap();
    assert_eq!(s.width(), 6);
    assert_eq!(s.types().sum(), 4 * tree.types().sum());
    assert!(special(&Tensor::of(vec![4], vec![1, 1]).unwrap(), &tree).is_err());
}
