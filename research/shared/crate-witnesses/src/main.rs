mod apollonian;
mod automaton_memory;
mod bang_universe;
mod coarray;
mod counts_counting;
mod counts_faces;
mod counts_ladder;
mod counts_hex;
mod counts_surface;
mod life_step;
mod num_sieve;
mod radix;
mod roulette;
mod hex_census;
mod hex_topology;
mod spin;
mod spirograph;
mod three_census;
mod three_diagonal;
mod three_geometry;
mod two_geometry;

fn main() {
    witness::dispatch(
        &[
            apollonian::ALL,
            automaton_memory::ALL,
            bang_universe::ALL,
            coarray::ALL,
            counts_counting::ALL,
            counts_faces::ALL,
            counts_ladder::ALL,
            counts_hex::ALL,
            counts_surface::ALL,
            life_step::ALL,
            num_sieve::ALL,
            radix::ALL,
            roulette::ALL,
            hex_census::ALL,
            hex_topology::ALL,
            spin::ALL,
            spirograph::ALL,
            three_census::ALL,
            three_diagonal::ALL,
            three_geometry::ALL,
            two_geometry::ALL,
        ]
        .concat(),
    );
}
