use mrly_sequences::counts::ladder::*;

pub const ALL: &[witness::Witness] = &[(
    "the_three_dimensional_block_is_the_published_anchor",
    the_three_dimensional_block_is_the_published_anchor,
)];

fn the_three_dimensional_block_is_the_published_anchor() {
    let block = even_block(3, 3).unwrap();
    assert_eq!(block, vec![vec![6, 6], vec![1, 3]]);
    assert_eq!(trace(&block), 9);
    assert_eq!(determinant(&block).unwrap(), 12);
    assert_eq!(characteristic(&block).unwrap(), vec![1, -9, 12]);
    assert_eq!(
        ladder(3, 3, 6).unwrap(),
        vec![1, 6, 42, 306, 2250, 16578, 122202]
    );
    let root = perron(&block).unwrap();
    assert!((root - (9.0 + 33f64.sqrt()) / 2.0).abs() < 1e-9);
    assert!((root.log(3.0) - 1.818_410).abs() < 1e-6);
    assert!((20f64.log(3.0) - 1.0 - 1.726_833).abs() < 1e-6);
}
