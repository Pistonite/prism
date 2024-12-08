use prism_lib::{Prism, Svg};
use serde::{Deserialize, Serialize};
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Tsify)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "snake_case")]
pub enum SvgResult {
    Val(Svg),
    Err {
        message: String,
        line: usize,
        column: usize,
        index: usize,
    },
}

#[wasm_bindgen]
pub fn make_svg(script: String, force_square: bool) -> SvgResult {
    let prism = match Prism::from_yaml(&script) {
        Ok(prism) => prism,
        Err(err) => {
            match err.location() {
                Some(loc) => {
                    return SvgResult::Err {
                        message: err.to_string(),
                        line: loc.line(),
                        column: loc.column(),
                        index: loc.index(),
                    };
                }
                None => {
                    return SvgResult::Err {
                        message: err.to_string(),
                        line: 0,
                        column: 0,
                        index: 0,
                    };
                }
            }
        }
    };

    let polygons = prism.render();
    match polygons {
        Ok(polygons) => {
            let svg = Svg::from_polygons(&polygons, prism.get_unit(), force_square);
            SvgResult::Val(svg)
        }
        Err(err) => {
            SvgResult::Err {
                message: err,
                line: 0,
                column: 0,
                index: 0,
            }
        }
    }
}
