use csscolorparser::Color;
use derivative::Derivative;

use crate::math::{Entry, Grid2, Vec3, VecMap, VecMapEntry};
use crate::poly::Layer;

/// A unit face with a position, color and a direction
///
/// Each face can be put onto a 2D grid, when faces of different
/// positions are rendered into the same location on the grid,
/// the face with higher `layer()` should be rendered on top
/// (i.e. lower layer should be covered completely).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Face<'c> {
    pub color: &'c Color, // using reference since faces are created in bulk
    /// Position of the unit cube that has this face
    pub pos: Vec3<i32>,
    /// Direction of the face on the unit cube
    pub dir: FaceDir,
}

pub fn sort_faces(faces: &mut [Face]) {
    faces.sort_by_key(|face| std::cmp::Reverse(face.layer()));
}

impl<'c> Face<'c> {
    /// Create a front face
    pub fn front(color: &'c Color, pos: impl Into<Vec3<i32>>) -> Self {
        Self {
            color,
            pos: pos.into(),
            dir: FaceDir::Front,
        }
    }
    /// Create a top face
    pub fn top(color: &'c Color, pos: impl Into<Vec3<i32>>) -> Self {
        Self {
            color,
            pos: pos.into(),
            dir: FaceDir::Top,
        }
    }
    /// Create a side face
    pub fn side(color: &'c Color, pos: impl Into<Vec3<i32>>) -> Self {
        Self {
            color,
            pos: pos.into(),
            dir: FaceDir::Side,
        }
    }
    /// Get the rendering layer of the face
    ///
    /// Higher layer are rendered on top of lower layers
    /// in the 2D grid.
    pub fn layer(&self) -> i32 {
        // To make sense of the *2, consider moving
        // a face in +X direction by 1, then move it
        // in +Y direction by 1. This is equivalent to
        // moving it in +Z direction by 1. So
        // every movement in +Z direction is effectively moving
        // through 2 layers
        self.pos.x() + self.pos.y() + self.pos.z() * 2
    }

    /// Get the UV coordinates of the face in the grid
    ///
    /// Each face occupies 2 slots in the grid. The returned
    /// values are (u1, v1, u2, v2)
    pub fn get_uvs(&self) -> (i32, i32, i32, i32) {
        let ux = -self.pos.x();
        let uy = self.pos.y();
        let uz = 0;
        let vx = self.pos.x();
        let vy = self.pos.y();
        let vz = -2 * self.pos.z();

        let u = ux + uy + uz;
        let v = vx + vy + vz;
        match self.dir {
            FaceDir::Top => (u, v, u + 1, v),
            FaceDir::Front => (u, v + 1, u, v + 2),
            FaceDir::Side => (u + 1, v + 1, u + 1, v + 2),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum FaceDir {
    /// The positive X direction
    Front,
    /// The positive Y direction
    Side,
    /// The positive Z direction
    Top,
}

/// Grid for rendering faces
#[derive(Debug, Clone, Derivative)]
#[derivative(Default(bound = "", new = "true"))]
pub struct Canvas<'c> {
    /// Direction of the face at each grid position
    grid: Grid2<CanvasPoint<'c>>,
}

impl<'c> Canvas<'c> {
    /// Convert the rendered data into layers by color
    pub fn into_layers(self, shader: Vec3<Color>) -> Vec<Layer> {
        let mut builder = LayerBuilder::new(shader);
        for ((u, v), point) in self.grid {
            builder.render(u, v, point);
        }
        builder.build()
    }

    /// Render one face onto the canvas
    pub fn render_face(&mut self, face: &Face<'c>) {
        let (u1, v1, u2, v2) = face.get_uvs();
        self.render_face_at(face, u1, v1);
        self.render_face_at(face, u2, v2);
    }

    fn render_face_at(&mut self, face: &Face<'c>, u: i32, v: i32) {
        match self.grid.entry(u, v) {
            Entry::Occupied(mut point) => {
                // if the grid already has a face above it,try
                // to compose the color
                point.get_mut().add_color(face.color);
            }
            Entry::Vacant(point) => {
                point.insert(CanvasPoint::new(face.dir, face.color));
            }
        };
    }
}
/// Render faces into 2D colors
struct LayerBuilder {
    opaque: VecMap<Layer>,
    alpha: VecMap<Layer>,
    shade: Vec3<Layer>,
}

impl LayerBuilder {
    pub fn new(shader: Vec3<Color>) -> Self {
        let shade = (
            Layer::new(&shader.x_ref().into()),
            Layer::new(&shader.y_ref().into()),
            Layer::new(&shader.z_ref().into()),
        );
        Self {
            opaque: Default::default(),
            alpha: Default::default(),
            shade: shade.into(),
        }
    }
    pub fn render(&mut self, u: i32, v: i32, point: CanvasPoint) {
        if point.opaque_color.a == 1.0 {
            let color = point.opaque_color.into();
            self.opaque.get_mut(&color).set(u, v, ());
        }
        if point.alpha_blend.a > 0.0 {
            let color = point.alpha_blend.into();
            self.alpha.get_mut(&color).set(u, v, ());
        }
        match point.face {
            FaceDir::Front => {
                if !self.shade.x_ref().color.is_transparent() {
                    self.shade.x_mut().grid.set(u, v, ());
                }
            }
            FaceDir::Side => {
                if !self.shade.y_ref().color.is_transparent() {
                    self.shade.y_mut().grid.set(u, v, ());
                }
            }
            FaceDir::Top => {
                if !self.shade.z_ref().color.is_transparent() {
                    self.shade.z_mut().grid.set(u, v, ());
                }
            }
        };
    }
    pub fn build(self) -> Vec<Layer> {
        // The output will be smaller if we compose (blend) all layers.
        // However, there might be gaps between polygons at shape edges.
        // So, we separate the opaque, alpha, and shader layers to prevent
        // that. All alpha layers are blended together to keep the output small.
        let mut layers: Vec<_> = self.opaque.into();
        layers.reserve(self.alpha.len() + 3);
        layers.extend(self.alpha);

        let (shade_x, shade_y, shade_z) = self.shade.into();
        if !shade_x.grid.is_empty() {
            layers.push(shade_x);
        }
        if !shade_y.grid.is_empty() {
            layers.push(shade_y);
        }
        if !shade_z.grid.is_empty() {
            layers.push(shade_z);
        }
        layers
    }
}

#[derive(Debug, Clone)]
pub struct CanvasPoint<'c> {
    /// Direction of the face at this point, used to apply shading
    pub face: FaceDir,
    /// Opaque color at the bottom of the layer
    pub opaque_color: &'c Color,
    /// Colors at the point, in order of above -> below
    pub alpha_blend: Color,
}

const TRANSPARENT: Color = Color {
    r: 0.,
    g: 0.,
    b: 0.,
    a: 0.,
};

impl<'c> CanvasPoint<'c> {
    pub fn new(face: FaceDir, color: &'c Color) -> Self {
        if color.a < 1.0 {
            Self {
                face,
                opaque_color: &TRANSPARENT,
                alpha_blend: color.clone(),
            }
        } else {
            Self {
                face,
                opaque_color: color,
                alpha_blend: TRANSPARENT,
            }
        }
    }
    pub fn add_color(&mut self, color: &'c Color) {
        // if self already has a base opaque color,
        // anything added below will be invisible
        if self.opaque_color.a >= 1.0 {
            return;
        }
        if color.a < 1.0 {
            // blend with current color (self on top of color)
            self.alpha_blend = blend(&self.alpha_blend, color);
        } else {
            self.opaque_color = color;
        }
    }
}

/// Blend two colors user the over operator (a over b)
fn blend(a: &Color, b: &Color) -> Color {
    if a.a == 0.0 {
        return b.clone();
    }
    let a_part = a.a;
    let b_part = b.a * (1.0 - a_part);
    let alpha = a_part + b_part;
    let r = blend_component(a_part, b_part, alpha, a.r, b.r);
    let g = blend_component(a_part, b_part, alpha, a.g, b.g);
    let b = blend_component(a_part, b_part, alpha, a.b, b.b);
    Color { r, g, b, a: alpha }
}

fn blend_component(a_part: f32, b_part: f32, alpha: f32, color_a: f32, color_b: f32) -> f32 {
    let ca_part = color_a * a_part;
    let cb_part = color_b * b_part;
    (ca_part + cb_part) / alpha
}
