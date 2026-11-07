// The arcs predict the partial sums of Thue-Morse on n^2.
// Each row sums the first 2^e signs of n^2 (actual) and compares with the arc model (model).
// The model is a leading-order fit: close for small e, and it drifts as lower-order terms matter.
// cargo run -p readings --example model
use readings::{bias, model, stream, Design, Reading};

fn main() {
    let design = Design::thue();
    let exponents: Vec<u32> = (6..=18).collect();
    let signs = stream(design, Reading::Square, 1 << 18);
    let actual = bias(&signs, &exponents);
    let predicted = model(design, 0.45, &exponents);
    println!(" e  actual   model");
    for (i, e) in exponents.iter().enumerate() {
        println!("{e:>2}  {:>6}  {:>7.1}", actual[i], predicted[i]);
    }
}
