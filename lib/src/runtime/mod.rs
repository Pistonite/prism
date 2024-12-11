

use boa_engine::vm::RuntimeLimits;
use boa_engine::{Context, JsResult, Source};

use crate::render::Layer;

mod builtin;
use builtin::Builtin;

/// Execute rendering script and return the result
pub fn execute_script(source: &str) -> ScriptResult {
    let mut limits = RuntimeLimits::default();
    limits.set_loop_iteration_limit(2048);
    limits.set_recursion_limit(2048);
    limits.set_stack_size_limit(20480);

    let mut context = Context::default();
    context.set_runtime_limits(limits);

let binding = Builtin::default();

    let (output_message, has_js_error) = match execute_internal(&mut context, &binding, source) {
            Ok(_) => {
            ("render ok".to_string(), false)
            },
            Err(e) => {
            (format!("runtime error: {}", e), true)
            }
    };

    let unit = binding.get_unit();
    let layers = binding.render_layers();
    let mut messages = binding.get_logs();
    messages.push(output_message);
    if layers.is_empty() {
        messages.push("no layers rendered".to_string());
    }
        ScriptResult { 
            unit,
            has_js_error,
            layers, 
            messages
        }
}

fn execute_internal(context: &mut Context, binding: &Builtin, source: &str) -> JsResult<()> {
    binding.bind_to_engine(context)?;
    context.eval(Source::from_bytes(include_str!("ts/index.js")))?;
    context.eval(Source::from_bytes(source))?;

    Ok(())
}

pub struct ScriptResult {
    /// Unit for rendering the SVG
    pub unit: f64,
    /// If the JS execution has thrown an error
    pub has_js_error: bool,
    /// The rendering result
    pub layers: Vec<Layer>,
    /// The debug and error messages
    pub messages: Vec<String>,
}
