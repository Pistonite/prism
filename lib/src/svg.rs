use serde::{Deserialize, Serialize};

use crate::Polygon;

/// SVG image rendered from polygons
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(into_wasm_abi))]
pub struct Svg {
    /// The SVG text content
    pub content: String,
    /// The unit length of the grid
    pub unit: f64,
    /// The minimum x coordinate of all points.
    ///
    /// This is used for the web app to render the grid correctly
    pub shift_x: f64,
    /// The minimum y coordinate of all points.
    ///
    /// This is used for the web app to render the grid correctly
    pub shift_y: f64,
}

impl Svg {
    pub fn from_polygons(polygons: &[Polygon], unit: f64, force_square: bool) -> Self {
        let (shift_x, shift_y, width, height) = bounds(polygons, force_square);
        let mut content = format!(r#"<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="{}" height="{}">"#, width*unit, height*unit);
        for polygon in polygons {
            let tag = make_polygon(polygon, shift_x, shift_y, unit);
            content.push_str(&tag);
        }
        content.push_str("</svg>");

        Self {
            content,
            unit,
            shift_x: -shift_x,
            shift_y: -shift_y,
        }
    }
}

/// Returns shift_x, shift_y, width, height
fn bounds(polygons: &[Polygon], force_square: bool) -> (f64, f64, f64, f64) {
    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut max_y = f64::NEG_INFINITY;

    for polygon in polygons {
        for (x, y) in &polygon.verts {
            min_x = min_x.min(*x);
            min_y = min_y.min(*y);
            max_x = max_x.max(*x);
            max_y = max_y.max(*y);
        }
    }

    let shift_x = -min_x;
    let shift_y = -min_y;
    let width = max_x - min_x;
    let height = max_y - min_y;

    if !force_square {
        return (shift_x, shift_y, width, height);
    }

    let side_length = width.max(height);
    let shift_x = shift_x + (side_length - width) / 2.0;
    let shift_y = shift_y + (side_length - height) / 2.0;

    (shift_x, shift_y, side_length, side_length)

}

fn make_polygon(polygon: &Polygon, shift_x: f64, shift_y: f64, unit: f64) -> String {
    if polygon.verts.is_empty() {
        return String::new();
    }
    let path = make_path(&polygon.verts, shift_x, shift_y, unit);
    format!(r#"<path d="{}" fill="{}"/>"#, path, polygon.color)
}

fn make_path(points: &[(f64, f64)], shift_x: f64, shift_y: f64, unit: f64) -> String {
    let mut s = String::from("M");

    for (x, y) in points {
        s.push_str(&format!("{} {}L", (x+shift_x)*unit, (y+shift_y)*unit));
    }

    s.pop();
    s.push('Z');
    s
}
