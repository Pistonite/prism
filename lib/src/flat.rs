use csscolorparser::Color;
use derive_more::derive::{Deref, DerefMut};

use crate::face::Face;
use crate::math::{nonneg, Vec3};

/// Render result of a Prism Tree, representing a positive 3D prism
/// in the space
#[derive(Debug, Clone, PartialEq, Deref, DerefMut)]
pub struct Prism {
    /// Color of the prism
    pub color: Color,
    #[deref]
    #[deref_mut]
    shape: Geom3,

    // the visibility fields are to track (partial) visibility
    // of faces as the prism is cut into multiple pieces

    /// The visible area of the top (+Z) face
    top_visible: Geom2,
    /// The visible area of the bottom (-Z) face
    bottom_visible: Geom2,

    /// Visibility of the front face (+X)
    x_pos_visible: bool,
    /// Visibility of the back face (-X)
    x_neg_visible: bool,
    /// Visibility of the +Y face
    y_pos_visible: bool,
    /// Visibility of the -Y face
    y_neg_visible: bool,
}
macro_rules! prism_subtraction_part {
    ($out:ident, $color: ident, pos: $pos:expr, size: [$x_size:expr, $y_size:expr, $z_size:expr $(,)?]) => {{
        let size = ($x_size, $y_size, $z_size);
        if size.0 > 0 && size.1 > 0 && size.2 > 0 {
            $out.push(crate::flat::Prism::new($color, $pos, size))
        }
    }};
}
impl Prism {
    pub fn new(color: &Color, pos: impl Into<Vec3<i32>>, size: impl Into<Vec3<u32>>) -> Self {
        todo!()
        // Self {
        //     color: color.clone(),
        //     shape: Geom3::new(pos, size),
        // }
    }
    /// Subtract the geometries in the operands from the geometry in the vector
    pub fn vec_subtract(v: &mut Vec<Self>, operands: &[Self]) {
        if operands.is_empty() {
            return;
        }
        let original = std::mem::take(v);
        for orig in original {
            for op in operands {
                orig.subtract_into(op, v);
            }
        }
    }

    /// Subtract another prism from this prism
    ///
    /// Output is a list of prisms that are the result of the subtraction.
    /// Only positive volume prisms are emitted. The results
    /// are pushed to the out vec.
    fn subtract_into(&self, operand: &Self, out: &mut Vec<Self>) {
        // this ensures we are subtracting a prism that
        // has no parts outside of self, to simplify the math
        let b = self.intersection(operand);
        if !b.has_positive_volume() {
            // nothing to subtract
            out.push(self.clone());
            return;
        }
        let color = &self.color;
        // top
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                self.pos.x(),
                self.pos.y(),
                b.z_end(),
            ),
            size: [
                self.size.x(),
                self.size.y(),
                nonneg_sub!(self.z_end(), b.z_end()),
            ]
        };
        // +x
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                b.x_end(),
                self.pos.y(),
                b.pos.z(),
            ),
            size: [
                nonneg_sub!(self.x_end(), b.x_end()),
                self.size.y(),
                b.size.z(),
            ]
        };
        
        // -x
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                self.pos.x(),
                self.pos.y(),
                b.pos.z(),
            ),
            size: [
                nonneg_sub!(b.pos.x(), self.pos.x()),
                self.size.y(),
                b.size.z(),
            ]
        };
        // +y
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                b.pos.x(),
                b.y_end(),
                b.pos.z(),
            ),
            size: [
                b.size.x(),
                nonneg_sub!(self.y_end(), b.y_end()),
                b.size.z(),
            ]
        };
        // -y
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                b.pos.x(),
                self.pos.y(),
                b.pos.z(),
            ),
            size: [
                b.size.x(),
                nonneg_sub!(b.pos.y(), self.pos.y()),
                b.size.z(),
            ]
        };
        // bottom
        prism_subtraction_part! {
            out, color,
            pos: self.pos,
            size: [
                self.size.x(),
                self.size.y(),
                nonneg_sub!(b.pos.z(), self.pos.z())
            ]
        };
    }
    /// Render the prism into a list of faces
    pub fn render_faces<'c>(&'c self, out: &mut Vec<Face<'c>>) {
        let x1 = self.pos.x();
        let y1 = self.pos.y();
        let z1 = self.pos.z();
        let x2 = self.x_end();
        let y2 = self.y_end();
        let z2 = self.z_end();
        // top
        for x in x1..x2 {
            for y in y1..y2 {
                out.push(Face::top(&self.color, (x, y, z2 - 1)));
            }
        }
        // front
        for y in y1..y2 {
            for z in z1..z2 {
                out.push(Face::front(&self.color, (x2 - 1, y, z)));
            }
        }
        // side
        for x in x1..x2 {
            for z in z1..z2 {
                out.push(Face::side(&self.color, (x, y2 - 1, z)));
            }
        }
    }
}


/// Geometry in XY plane (position and size)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Geom2 {
    pub x: i32,
    pub y: i32,
    pub x_size: u32,
    pub y_size: u32,
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn render_one() {
        let color = "red".parse().unwrap();
        let prism = Prism::new(&color, (0, 0, 0), (1, 1, 1));
        let mut faces = Vec::new();
        prism.render_faces(&mut faces);
        assert_eq!(
            faces,
            vec![
                Face::top(&color, (0, 0, 0)),
                Face::front(&color, (0, 0, 0)),
                Face::side(&color, (0, 0, 0)),
            ]
        )
    }

    #[test]
    fn render_one_big() {
        let color = "red".parse().unwrap();
        let prism = Prism::new(&color, (0, 0, 0), (2, 2, 2));
        let mut faces = Vec::new();
        prism.render_faces(&mut faces);
        assert_eq!(
            faces,
            vec![
                Face::top(&color, (0, 0, 1)),
                Face::top(&color, (0, 1, 1)),
                Face::top(&color, (1, 0, 1)),
                Face::top(&color, (1, 1, 1)),
                Face::front(&color, (1, 0, 0)),
                Face::front(&color, (1, 0, 1)),
                Face::front(&color, (1, 1, 0)),
                Face::front(&color, (1, 1, 1)),
                Face::side(&color, (0, 1, 0)),
                Face::side(&color, (0, 1, 1)),
                Face::side(&color, (1, 1, 0)),
                Face::side(&color, (1, 1, 1)),
            ]
        )
    }
}
