/// Low-level or shared math utils
mod math;
pub use math::*;

/// Tree-representation of prism shapes
///
/// This is the data structure used in the config (script)
mod tree;

/// Flat list representation of rendered prism shapes
/// that accounts for hidden shapes and cuts in the tree
///
/// This is the output of rendering the tree
mod flat;

/// Prism broken down into faces, each with a unit size,
/// a position, and a direction
///
/// This is the output of rendering the flat list.
mod face;

/// Render the faces into UV grids, provide the coloring,
/// shading, and perspectives accordingly
mod poly;
pub use poly::Polygon;

impl tree::PrismTree {
    /// Render the prism object into a list of polygons.
    /// Polygons that should be on top are in the back.
    pub fn render(&self) -> Result<Vec<Polygon>, String> {
        let prisms = self.render_prisms();

        let mut faces = Vec::new();
        for prism in &prisms {
            prism.render_faces(&mut faces);
        }
        face::sort_faces(&mut faces);

        let mut canvas = face::Canvas::new();
        for face in &faces {
            canvas.render_face(face);
        }

        let layers = canvas.into_layers(self.get_shader());

        let mut polygons = Vec::new();
        for layer in layers {
            layer.into_polygons(&mut polygons);
        }

        Ok(polygons)
    }
}

pub use tree::PrismTree as Prism;

/// SVG rendering of the polygons
mod svg;
pub use svg::Svg;
