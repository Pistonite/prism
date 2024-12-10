
use std::sync::{atomic::AtomicU64, RwLock};

use csscolorparser::Color;

use crate::{math::AtomicF64, shape::ShapeVec};
/// Builtin bindings for the rendering script engine
pub struct Builtin {
    /// Unit length of the shape
    unit: AtomicF64,
    /// Shader colors
    shader: RwLock<[Color; 3]>,
    /// Object ID counter for debugging
    obj_id: AtomicU64,
    /// Ids logged by debug calls
    debug_logs: RwLock<Vec<String>>,
    /// Shapes in the scene
    shapes: ShapeVec,
}

