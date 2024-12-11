/// Low-level or shared math utils
mod math;

/// Runtime shape management
mod shape;

/// Polygon rendering
mod render;

/// Script runtime
mod runtime;

pub use runtime::{execute_script, ScriptResult};
pub use render::{Svg, polygons_from_layers};

