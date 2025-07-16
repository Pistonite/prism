use prism_lib::Svg;
use serde::{Deserialize, Serialize};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(tag = "type", content = "data", rename_all = "camelCase")]
pub enum PrismOutput {
    TranspileError,
    Output {
        /// If the script has thrown an error
        has_error: bool,
        /// The resulting SVG content and metadata
        svg: Svg,
        /// The debug and error messages
        messages: Vec<String>,
    },
}

#[wasm_bindgen]
pub fn run_prism_script(script: String, force_square: bool) -> PrismOutput {
    let transpiled_script = match prism_transpile::standalone_to_js(&script) {
        Ok(script) => script,
        Err(_) => return PrismOutput::TranspileError,
    };
    let result = prism_lib::execute_script(&transpiled_script);
    let polygons = prism_lib::polygons_from_layers(result.layers);
    let svg = Svg::from_polygons(&polygons, result.unit, force_square);

    PrismOutput::Output {
        has_error: result.has_js_error,
        svg,
        messages: result.messages,
    }
}
