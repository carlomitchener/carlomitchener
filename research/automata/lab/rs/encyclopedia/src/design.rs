use crate::grid::Grid;
use mrly_bang::universe::orbit;
use mrly_error::value_error;
use mrly_error::Result;
use mrly_math::catalog::{Design, ANTIS_2D, CLASSICS_2D};
use mrly_math::code::Code;
use mrly_two as two;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Shape {
    Named(Design),
    Code(u128),
}

const NAMED: [(Design, &str); 10] = [
    (Design::Carpet, "carpet"),
    (Design::Net, "net"),
    (Design::Htree, "htree"),
    (Design::Vtree, "vtree"),
    (Design::Void, "void"),
    (Design::Point, "point"),
    (Design::Dust, "dust"),
    (Design::Hline, "hline"),
    (Design::Vline, "vline"),
    (Design::Star, "star"),
];

impl Shape {
    pub fn token(self) -> String {
        match self {
            Shape::Named(design) => NAMED
                .iter()
                .find(|(d, _)| *d == design)
                .map(|(_, name)| (*name).to_string())
                .unwrap_or_else(|| design.name().to_lowercase()),
            Shape::Code(code) => format!("code{code}"),
        }
    }

    pub fn parse(token: &str) -> Result<Shape> {
        if let Some(rest) = token.strip_prefix("code") {
            return match rest.parse::<u128>() {
                Ok(code) => Ok(Shape::Code(code)),
                Err(_) => value_error(format!("design code {rest:?} is not a number.")),
            };
        }
        match NAMED.iter().find(|(_, name)| *name == token) {
            Some((design, _)) => Ok(Shape::Named(*design)),
            None => value_error(format!("unknown design {token:?}.")),
        }
    }

    pub fn build(self, side: usize, level: usize) -> Result<Grid> {
        let cell = match self {
            Shape::Named(design) => two::named(design, side, level, 0)?,
            Shape::Code(code) => two::create(Code::from(code), side, level, 0, 2)?,
        };
        Grid::from_cell(&cell)
    }
}

pub fn classes() -> Vec<u128> {
    (1..16u128)
        .filter(|&bits| {
            let code = Code::from(bits);
            orbit(code, 2).iter().next() == Some(&code)
        })
        .collect()
}

pub fn standard_shapes() -> Vec<Shape> {
    let mut out: Vec<Shape> = classes().into_iter().map(Shape::Code).collect();
    out.extend(CLASSICS_2D.iter().map(|&d| Shape::Named(d)));
    out.extend(ANTIS_2D.iter().map(|&d| Shape::Named(d)));
    out
}

pub fn distinct(shapes: &[Shape], side: usize, level: usize) -> Result<Vec<(Shape, Grid)>> {
    let mut out: Vec<(Shape, Grid)> = Vec::new();
    for &shape in shapes {
        let grid = shape.build(side, level)?;
        if grid.is_empty() || out.iter().any(|(_, g)| *g == grid) {
            continue;
        }
        out.push((shape, grid));
    }
    Ok(out)
}

pub mod witnesses {
    use super::*;

    pub const ALL: &[witness::Witness] = &[(
        "the_plane_classes_are_the_five_known_codes_and_code_seven_is_the_carpet",
        the_plane_classes_are_the_five_known_codes_and_code_seven_is_the_carpet,
    )];

    fn the_plane_classes_are_the_five_known_codes_and_code_seven_is_the_carpet() {
        assert_eq!(classes(), vec![1, 3, 6, 7, 15]);
        let carpet = Shape::Named(Design::Carpet).build(3, 1).unwrap();
        assert_eq!(Shape::Code(7).build(3, 1).unwrap(), carpet);
        assert_eq!(carpet, Grid::from_rows(&["111", "101", "111"]));
        assert_eq!(Shape::Code(15).build(3, 1).unwrap(), Grid::full(3, 3));
        for shape in standard_shapes() {
            assert_eq!(Shape::parse(&shape.token()).unwrap(), shape);
        }
    }
}
