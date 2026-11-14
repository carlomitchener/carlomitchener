// The decay depends on the layer count mod 4. Odd counts have a constant 1/8 higher than even counts.
// Residual is the limit of miss * layers^2; None means the odd branch has no fixed value.
// cargo run -p star --example branch_residuals

use star::Branch;

fn main() {
    for layers in 1..=8 {
        let branch = Branch::of(layers);
        println!(
            "layers {layers}: {:<7} constant {:>8.5} residual {:?}",
            branch.name(),
            branch.constant(),
            branch.residual()
        );
    }
}
