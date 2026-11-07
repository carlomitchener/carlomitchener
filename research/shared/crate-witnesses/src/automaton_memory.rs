use mrly_automaton::memory::*;
use mrly_math::code::Code;

pub const ALL: &[witness::Witness] = &[
    (
        "width_one_is_the_plane_design_cell_for_cell",
        width_one_is_the_plane_design_cell_for_cell,
    ),
    (
        "width_one_is_the_memoryless_design",
        width_one_is_the_memoryless_design,
    ),
    (
        "the_golden_rule_counts_the_fibonacci_numbers",
        the_golden_rule_counts_the_fibonacci_numbers,
    ),
    (
        "the_width_three_presets_name_the_plastic_and_the_tribonacci_roots",
        the_width_three_presets_name_the_plastic_and_the_tribonacci_roots,
    ),
    (
        "the_supergolden_rule_counts_the_narayana_cows",
        the_supergolden_rule_counts_the_narayana_cows,
    ),
    (
        "the_full_rule_counts_every_word",
        the_full_rule_counts_every_word,
    ),
    (
        "the_empty_rule_dies_past_its_window",
        the_empty_rule_dies_past_its_window,
    ),
];

fn width_one_is_the_plane_design_cell_for_cell() {
    for code in [1u64, 7, 11, 13, 14, 9] {
        let rule = Rule::new(2, 1, code).unwrap();
        for level in 1..=6 {
            let design = mrly_two::create(Code::from(u128::from(code)), 2, level, 0, 2).unwrap();
            let side = 1usize << level;
            let mut sheet = vec![0u8; side * side];
            for cell in cells(&rule, level) {
                sheet[cell as usize] = 1;
            }
            assert_eq!(
                sheet,
                design.types().bytes().unwrap(),
                "code {code} level {level}"
            );
        }
    }
}

fn width_one_is_the_memoryless_design() {
    for code in [1u64, 7, 11, 13, 14] {
        let rule = Rule::new(2, 1, code).unwrap();
        let fills = code.count_ones() as u64;
        assert_eq!(
            counts(&rule, 4),
            vec![fills, fills.pow(2), fills.pow(3), fills.pow(4)]
        );
        assert_eq!(kappa(&rule), 0.0);
    }
}

fn the_golden_rule_counts_the_fibonacci_numbers() {
    let golden = Rule::new(1, 2, 7).unwrap();
    assert_eq!(counts(&golden, 8), vec![2, 3, 5, 8, 13, 21, 34, 55]);
    assert!((perron(&golden) - 1.618_033_988_749_895).abs() < 1e-12);
    assert_eq!(format!("{:.6}", exponent(&golden)), "0.694242");
    assert_eq!(format!("{:.6}", kappa(&golden)), "0.098239");
    assert_eq!(allowed_windows(&golden), 3);
}

fn the_width_three_presets_name_the_plastic_and_the_tribonacci_roots() {
    let plastic = Rule::new(1, 3, 54).unwrap();
    assert_eq!(counts(&plastic, 8), vec![2, 4, 4, 5, 7, 9, 12, 16]);
    assert_eq!(format!("{:.9}", perron(&plastic)), "1.324717957");
    assert_eq!(format!("{:.6}", kappa(&plastic)), "0.260981");
    let tribonacci = Rule::new(1, 3, 127).unwrap();
    assert_eq!(counts(&tribonacci, 8), vec![2, 4, 7, 13, 24, 44, 81, 149]);
    assert_eq!(format!("{:.9}", perron(&tribonacci)), "1.839286755");
    assert_eq!(format!("{:.6}", kappa(&tribonacci)), "0.056639");
}

fn the_supergolden_rule_counts_the_narayana_cows() {
    let rule = Rule::new(1, 3, 23).unwrap();
    assert_eq!(counts(&rule, 8), vec![2, 4, 4, 6, 9, 13, 19, 28]);
    assert_eq!(format!("{:.6}", perron(&rule)), "1.465571");
    let terms = counts(&rule, 12);
    for l in 5..terms.len() {
        assert_eq!(terms[l], terms[l - 1] + terms[l - 3]);
    }
}

fn the_full_rule_counts_every_word() {
    for dimension in 1..=3 {
        for width in 1..=SPAN / dimension {
            let rule = Rule::full(dimension, width).unwrap();
            let want: Vec<u64> = (1..=5).map(|l| 1u64 << (dimension * l)).collect();
            assert_eq!(counts(&rule, 5), want, "d{dimension} k{width}");
            assert!((exponent(&rule) - dimension as f64).abs() < 1e-12);
            assert_eq!(kappa(&rule), 0.0);
        }
    }
    let plane = Rule::new(2, 2, 65535).unwrap();
    assert_eq!(counts(&plane, 4), vec![4, 16, 64, 256]);
    assert_eq!((plane.states(), plane.windows()), (4, 16));
}

fn the_empty_rule_dies_past_its_window() {
    for width in 1..=3 {
        let rule = Rule::new(1, width, 0).unwrap();
        let want: Vec<u64> = (1..=5)
            .map(|l| if l < width { 1 << l } else { 0 })
            .collect();
        assert_eq!(counts(&rule, 5), want, "k{width}");
        assert_eq!(perron(&rule), 0.0);
        assert!(cells(&rule, 5).is_empty());
    }
}
