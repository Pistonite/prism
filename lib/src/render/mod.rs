
/// Shapes broken down into faces, each with a unit size,
/// a position, and a direction
mod face;
pub use face::*;

/// Render the faces into UV grids, provide the coloring,
/// shading, and perspectives accordingly
mod poly;
pub use poly::*;

/// SVG rendering of the polygons
mod svg;
pub use svg::*;

/// Construct 2D polygons from 2D color grid layers
pub fn polygons_from_layers(layers: Vec<Layer>) -> Vec<Polygon> {
    let mut polygons = Vec::new();
    for layer in layers {
        layer.into_polygons(&mut polygons);
    }
    polygons
}
