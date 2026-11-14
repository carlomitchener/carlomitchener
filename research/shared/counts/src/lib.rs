pub mod closed;
pub mod counting;
pub mod faces;
pub mod hex;
pub mod ladder;
pub mod measure;
pub mod surface;

pub use closed::*;
pub use counting::*;
pub use faces::{Placements, Skeleton, skeleton, skeleton_of_tile, skeleton_recurrence};
pub use hex::*;
pub use measure::{Cost, Measure};
use mrly_error::{Result, value_error};
use mrly_math::name::{Bang, Sequence as SequenceName};
use mrly_name::Named;
pub use mrly_sequences::counts::*;
pub use surface::*;

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Axis {
    Level,
    Side,
    Window,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Tag {
    Proved,
    Verified,
    Conjecture,
    Refuted,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Key {
    pub code: u128,
    pub dimension: usize,
    pub base: usize,
    pub measure: Measure,
    pub axis: Axis,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Sequence {
    pub key: Key,
    pub terms: Vec<i128>,
    pub capped: bool,
    pub closed: Option<Closed>,
    pub tag: Option<Tag>,
}

impl Axis {
    pub const ALL: [Axis; 3] = [Axis::Level, Axis::Side, Axis::Window];
    pub fn slug(self) -> &'static str {
        match self {
            Axis::Level => "level",
            Axis::Side => "side",
            Axis::Window => "window",
        }
    }
    pub fn parse(slug: &str) -> Result<Axis> {
        match slug {
            "level" => Ok(Axis::Level),
            "side" => Ok(Axis::Side),
            "window" => Ok(Axis::Window),
            other => value_error(format!("unknown axis {other:?}.")),
        }
    }
    pub fn start(self) -> i32 {
        match self {
            Axis::Level | Axis::Window => 1,
            Axis::Side => 2,
        }
    }
    pub fn place(self, index: usize, number: usize) -> (usize, u32) {
        match self {
            Axis::Level | Axis::Window => (number, index as u32 + 1),
            Axis::Side => (2 * index + 3, 1),
        }
    }
}

impl Tag {
    pub fn text(self) -> &'static str {
        match self {
            Tag::Proved => "Proved",
            Tag::Verified => "Verified",
            Tag::Conjecture => "Conjecture",
            Tag::Refuted => "Refuted",
        }
    }
}

impl Key {
    pub const fn new(
        code: u128,
        dimension: usize,
        base: usize,
        measure: Measure,
        axis: Axis,
    ) -> Key {
        Key {
            code,
            dimension,
            base,
            measure,
            axis,
        }
    }
    pub fn named(&self) -> SequenceName {
        SequenceName::new(
            self.code,
            self.dimension,
            self.base,
            self.measure.slug(),
            self.axis.slug(),
        )
    }
    pub fn name(&self) -> String {
        self.named().to_file().unwrap_or_default()
    }
    pub fn id(&self) -> String {
        self.named().to_id()
    }
    pub fn design(&self) -> Bang {
        Bang::new(self.code, self.dimension, self.base)
    }
    pub fn number(&self) -> usize {
        self.base.max(3)
    }
}
