/// Low-level or shared math utils
mod math;

/// Runtime shape management
mod shape;

/// Polygon rendering
mod render;

/// Script runtime
mod runtime;

pub use render::{polygons_from_layers, Svg};
pub use runtime::{execute_script, ScriptResult};
