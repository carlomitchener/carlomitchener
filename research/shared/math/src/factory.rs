use mrly_error::{Result, value_error};
use mrly_math::code::Code;
pub use mrly_math::factory::*;
use mrly_tensor::Tensor;

pub fn magic(layers: &[MagicLayer]) -> Result<Tensor> {
    if layers.len() < 2 {
        return value_error("magic needs at least two layers.");
    }
    let dimension = layers[0].design.dim;
    if layers.iter().any(|l| l.design.dim != dimension) {
        return value_error("magic layers must share one dimension.");
    }
    let mut out: Option<Tensor> = None;
    for layer in layers {
        let next = create(
            Code::from(layer.design.code),
            layer.number,
            dimension,
            layer.design.base,
            1,
        )?;
        out = Some(match out {
            Some(tile) => tile.kron(&next),
            None => next,
        });
    }
    Ok(out.expect("two or more layers leave a tile"))
}
