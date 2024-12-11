use boa_engine::vm::RuntimeLimits;
use boa_engine::{Context, Source};

use crate::poly::Layer;

use super::builtin::Builtin;

pub struct Runtime {
    context: Context,
    binding: Builtin,
}

impl Runtime {
    /// Create a fresh runtime for executing rendering script
    pub fn new() -> Self {
        let mut limits = RuntimeLimits::default();
        limits.set_loop_iteration_limit(2048);
        limits.set_recursion_limit(2048);
        limits.set_stack_size_limit(20480);

        let mut context = Context::default();
        context.set_runtime_limits(limits);

        context.eval(Source::from_bytes(include_str!("ts/index.js"))).unwrap();

        let binding = Builtin::default();
        binding.bind_to_engine(&mut context);

        Self {
            context,
            binding,
        }
    }

    pub fn execute(mut self, source: &str) -> RunResult {
        match self.context.eval(Source::from_bytes(source)) {
            Ok(_) => {
                let layers = self.binding.render_layers();
                let mut messages = self.binding.get_logs();
                messages.push("render ok".to_string());
                RunResult { layers, messages }
            },
            Err(e) => {
                let layers = self.binding.render_layers();
                let mut messages = self.binding.get_logs();
                messages.push(format!("runtime error: {}", e));
                RunResult {
                    layers,
                    messages,
                }
            }
        }
    }
}

pub struct RunResult {
    /// The rendering result
    pub layers: Vec<Layer>,
    /// The debug and error messages
    pub messages: Vec<String>,
}
