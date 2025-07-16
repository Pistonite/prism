/// Low-level or shared math utils
mod math;

/// Runtime shape management
mod shape;

/// Polygon rendering
mod render;

/// Script runtime
mod runtime;

pub use render::{Svg, polygons_from_layers};
pub use runtime::{ScriptResult, execute_script};

pub fn lib_d_ts() -> &'static str {
    include_str!("runtime/ts/index.d.ts")
}
