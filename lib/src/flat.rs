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
}
impl Prism {
    pub fn new(color: &Color, pos: impl Into<Vec3<i32>>, size: impl Into<Vec3<u32>>) -> Self {
        Self {
            color: color.clone(),
            shape: Geom3::new(pos, size),
        }
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
                out.push(Face::top(&self.color, (x, y, z2-1)));
            }
        }
        // front
        for y in y1..y2 {
            for z in z1..z2 {
                out.push(Face::front(&self.color, (x2-1, y, z)));
            }
        }
        // side
        for x in x1..x2 {
            for z in z1..z2 {
                out.push(Face::side(&self.color, (x, y2-1, z)));
            }
        }
    }
}

/// Geometry in 3D space (position and size)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Geom3 {
    pub size: Vec3<u32>,
    pub pos: Vec3<i32>,
}

impl Geom3 {
    pub fn new(pos: impl Into<Vec3<i32>>, size: impl Into<Vec3<u32>>) -> Self {
        Self { pos: pos.into(), size: size.into().into() }
    }

    /// Returns the intersection of this prism with another prism
    ///
    /// If the prisms do not intersect, A 0-volume prism is returned.
    pub fn intersection(&self, other: &Self) -> Self {
        let pos = Vec3::from((
                self.pos.x().max(other.pos.x()),
                self.pos.y().max(other.pos.y()),
                self.pos.z().max(other.pos.z()),
            ));
        Self::new(
            pos,
            (
                nonneg!(self.x_end().min(other.x_end()) - pos.x()),
                nonneg!(self.y_end().min(other.y_end()) - pos.y()),
                nonneg!(self.z_end().min(other.z_end()) - pos.z()),
            ),
        )
    }

    /// The end of the prism in the x direction
    #[inline]
    pub fn x_end(&self) -> i32 {
        self.pos.x() + self.size.x() as i32
    }

    /// The end of the prism in the y direction
    #[inline]
    pub fn y_end(&self) -> i32 {
        self.pos.y() + self.size.y() as i32
    }

    /// The end of the prism in the z direction
    #[inline]
    pub fn z_end(&self) -> i32 {
        self.pos.z() + self.size.z() as i32
    }

    /// Checks if the prism has positive volume
    #[inline]
    pub fn has_positive_volume(&self) -> bool {
        self.size.x() > 0 && self.size.y() > 0 && self.size.z() > 0
    }
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
        assert_eq!(faces, vec![
            Face::top(&color, (0, 0, 0)),
            Face::front(&color, (0, 0, 0)),
            Face::side(&color, (0, 0, 0)),
        ])
    }

    #[test]
    fn render_one_big() {
        let color = "red".parse().unwrap();
        let prism = Prism::new(&color, (0, 0, 0), (2, 2, 2));
        let mut faces = Vec::new();
        prism.render_faces(&mut faces);
        assert_eq!(faces, vec![
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
        ])
    }
}
