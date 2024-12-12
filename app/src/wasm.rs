use prism_lib::Svg;
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct PrismOutput {
    /// If the script has thrown an error
    has_error: bool,
    /// The resulting SVG content and metadata
    svg: Svg,
    /// The debug and error messages
    messages: Vec<String>,
}

#[wasm_bindgen]
pub fn run_prism_script(script: String, force_square: bool) -> PrismOutput {
    let result = prism_lib::execute_script(&script);
    let polygons = prism_lib::polygons_from_layers(result.layers);
    let svg = Svg::from_polygons(&polygons, result.unit, force_square);

    PrismOutput {
        has_error: result.has_js_error,
        svg,
        messages: result.messages,
    }
}
