use csscolorparser::Color;

use crate::math::{Entry, Grid2, Vec3, VecMap};
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

/// Sort the face by rendering order. Faces that should be
/// rendered on top should be at the front of the list.
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
#[derive(Debug, Clone)]
pub struct Canvas<'c> {
    /// The base shader in the config
    ///
    /// The shaders are used here to shade the alpha-composited faces,
    /// then passed to the next step to shade opaque and top-most alpha faces
    shader: Vec3<Color>,
    /// Direction of the face at each grid position
    grid: Grid2<CanvasPoint<'c>>,
}

impl<'c> Canvas<'c> {
    pub fn new(shader: Vec3<Color>) -> Self {
        Self {
            shader,
            grid: Grid2::new(),
        }
    }
    /// Convert the rendered data into layers by color
    pub fn into_layers(self) -> Vec<Layer> {
        let mut builder = LayerBuilder::new(self.shader);
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
                point
                    .get_mut()
                    .add_color(face.dir, face.color, &self.shader);
            }
            Entry::Vacant(point) => {
                point.insert(CanvasPoint::new(face.dir, face.color));
            }
        };
    }
}
/// Render faces into 2D colors
#[derive(Debug)]
struct LayerBuilder {
    /// The original shader colors
    shader: Vec3<Color>,
    /// The opaque color layers
    opaque: VecMap<Layer>,
    /// Shaders for the opaque layers
    opaque_shaders: VecMap<Layer>,
    /// The alpha-blended color layers, above the opaque layers
    alpha: VecMap<Layer>,
    /// The alpha-blended shader layers
    alpha_shaders: VecMap<Layer>,
}

impl LayerBuilder {
    pub fn new(shader: Vec3<Color>) -> Self {
        Self {
            shader,
            opaque: VecMap::new(),
            opaque_shaders: VecMap::new(),
            alpha: VecMap::new(),
            alpha_shaders: VecMap::new(),
        }
    }
    /// Render the point into color layers
    ///
    /// Each (u, v) point should only be rendered once
    pub fn render(&mut self, u: i32, v: i32, point: CanvasPoint) {
        // the shader need to be composed with the base color's alpha
        // for example, in the extreme case,
        // if the base color is transparent, then the shader should
        // also not be applied
        if point.opaque_color.a == 1.0 {
            let color = point.opaque_color.into();
            self.opaque.get_mut(&color).set(u, v, ());

            // set opaque shader
            let shader_color = match point.opaque_face {
                FaceDir::Front => self.shader.x_ref(),
                FaceDir::Side => self.shader.y_ref(),
                FaceDir::Top => self.shader.z_ref(),
            };
            if shader_color.a > 0.0 {
                let color = shader_color.into();
                self.opaque_shaders.get_mut(&color).set(u, v, ());
            }
        }
        if point.top_alpha > 0.0 {
            let color = point.alpha_color.into();
            self.alpha.get_mut(&color).set(u, v, ());

            // set alpha shader
            let shader_color = match point.alpha_face {
                FaceDir::Front => self.shader.x_ref(),
                FaceDir::Side => self.shader.y_ref(),
                FaceDir::Top => self.shader.z_ref(),
            };

            // if the shader is transparent, we don't need to apply
            if shader_color.a > 0.0 {
                let mut color = shader_color.clone();
                color.a *= point.top_alpha;
                let color = color.into();
                self.alpha_shaders.get_mut(&color).set(u, v, ());
            }
        }
    }
    pub fn build(self) -> Vec<Layer> {
        // The output will be smaller if we compose (blend) all layers.
        // However, there might be gaps between polygons at shape edges.
        // So, we separate the opaque, alpha, and shader layers to prevent
        // that. All alpha layers are blended together to keep the output small.
        self.opaque
            .into_iter()
            .chain(self.opaque_shaders)
            .chain(self.alpha)
            .chain(self.alpha_shaders)
            .collect()
    }
}

#[derive(Debug, Clone)]
pub struct CanvasPoint<'c> {
    /// Direction of the face at this point on the opaque color.
    ///
    /// This is used to apply shading to the opaque layer
    pub opaque_face: FaceDir,
    /// Direction of the top most alpha face at this point.
    ///
    /// This is used to apply shading to the alpha layer
    pub alpha_face: FaceDir,
    /// Opaque color at the bottom of the layer
    pub opaque_color: &'c Color,
    /// The alpha-blended color
    ///
    /// This includes the color of the top-most alpha face,
    /// blended with all the alpha faces AND their shader colors
    /// below it
    pub alpha_color: Color,

    /// The top-most alpha value. Used to blend with the alpha shader when
    /// making layers.
    ///
    /// Since the alpha color is already blended, we have to track this
    /// separately to be accurate
    pub top_alpha: f32,
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
                opaque_face: face,
                alpha_face: face,
                opaque_color: &TRANSPARENT,
                alpha_color: color.clone(),
                top_alpha: color.a,
            }
        } else {
            Self {
                opaque_face: face,
                alpha_face: face,
                opaque_color: color,
                alpha_color: TRANSPARENT,
                top_alpha: 0.0,
            }
        }
    }
    pub fn add_color(&mut self, face: FaceDir, color: &'c Color, shader: &Vec3<Color>) {
        // if self already has a base opaque color,
        // anything added below will be invisible
        if self.opaque_color.a >= 1.0 {
            return;
        }
        if color.a < 1.0 {
            if color.a <= 0.0 {
                // transparent color, skip
                return;
            }
            // blend with current color (self over shade over color)
            let shader_color = match face {
                FaceDir::Front => shader.x_ref(),
                FaceDir::Side => shader.y_ref(),
                FaceDir::Top => shader.z_ref(),
            };
            if shader_color.a > 0.0 {
                // compose the shader's alpha value with the color's alpha value
                let mut shader_color = shader_color.clone();
                shader_color.a *= color.a;
                // then, blend with color
                let temp = blend(&shader_color, color);
                // finally blend with the current alpha color
                self.alpha_color = blend(&self.alpha_color, &temp);
            } else {
                // shader is transparent, no shading needed
                self.alpha_color = blend(&self.alpha_color, color);
            }
        } else {
            self.opaque_color = color;
            self.opaque_face = face;
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
