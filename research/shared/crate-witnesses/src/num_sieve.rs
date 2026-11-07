use mrly_zeta::sieve::*;

pub const ALL: &[witness::Witness] = &[(
    "the_plane_ratio_at_two_million_factors_rounds_to_nine_digits",
    the_plane_ratio_at_two_million_factors_rounds_to_nine_digits,
)];

fn the_plane_ratio_at_two_million_factors_rounds_to_nine_digits() {
    let read = ratio(&odd_word(2_000_000), 2).unwrap();
    assert_eq!(format!("{read:.9}"), "0.785398262");
    assert!(read > PLANE_LIMIT);
}
