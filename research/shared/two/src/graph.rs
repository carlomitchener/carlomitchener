use mrly_error::Result;
use mrly_graph::extract;
use mrly_graph::models::Network;
use mrly_math::cell::models::Cell2d;

pub fn core_graph(cell: &Cell2d) -> Result<Network> {
    extract::core_graph(cell.types())
}

pub fn edge_graph(cell: &Cell2d) -> Result<Network> {
    extract::edge_graph(cell.types())
}

pub fn tunnel_graph(cell: &Cell2d) -> Result<Network> {
    extract::tunnel_graph(cell.types())
}

pub fn vertices(cell: &Cell2d) -> Result<usize> {
    Ok(edge_graph(cell)?.nodes.len())
}

pub fn edges(cell: &Cell2d) -> Result<usize> {
    Ok(edge_graph(cell)?.branches.len())
}
