// A sensor array grown from a generator: copy the generator at every sensor, scaled by the base.
// Generator {0,1,3} in base 4 at level 2 gives 9 sensors on a line. A # marks a sensor position.
// cargo run -p coarray --example fractal
use coarray::fractal;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let generator = [0, 1, 3];
    for level in 1..=2 {
        let sensors = fractal(&generator, 4, level)?;
        let top = *sensors.last().unwrap() as usize;
        let ruler: String = (0..=top)
            .map(|x| {
                if sensors.contains(&(x as u64)) {
                    '#'
                } else {
                    '.'
                }
            })
            .collect();
        println!("level {level}: {sensors:?}");
        println!("         {ruler}");
    }
    Ok(())
}
