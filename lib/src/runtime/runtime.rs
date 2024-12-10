
use std::{collections::BTreeSet, sync::{atomic::{AtomicU64, Ordering}, Arc, RwLock}};

use boa_engine::{class::Class, js_string, object::FunctionObjectBuilder,
    property::Attribute, 
    vm::RuntimeLimits, Context, 
    Finalize, 
    JsArgs, JsData, JsResult, JsValue, NativeFunction, Source, Trace};


pub struct Runtime {
    context: Context,
    unit: Arc<AtomicF64>,
    // shader: Vec<String>,
    // next_id: u64,
    //
    // shapes: Vec<Shape>,
}


macro_rules! define_builtin {
    ($context:ident, $name:literal, $arg_len:literal, | $args:ident, $ctx:ident | $block:block) => {{
        let name = ::boa_engine::js_string!(concat!("__builtin_", $name));
        let function = {
            let func = move |_: &::boa_engine::JsValue, $args: &[::boa_engine::JsValue], $ctx: &mut ::boa_engine::Context| 
                -> ::boa_engine::JsResult<::boa_engine::JsValue> { $block };
            unsafe {
                ::boa_engine::NativeFunction::from_closure(func)
            }
        };
        let attribute = Attribute::default();
        let function = FunctionObjectBuilder::new($context.realm(), function)
            .name(name.clone())
            .length($arg_len)
            .constructor(false)
            .build();
        $context.register_global_property(name, function, attribute);
    }}
}


impl Runtime {
    pub fn new() -> Self {
        let mut limits = RuntimeLimits::default();
        limits.set_loop_iteration_limit(2048);
        limits.set_recursion_limit(2048);
        limits.set_stack_size_limit(20480);

        let mut context = Context::default();
        context.set_runtime_limits(limits);

        let unit = Arc::new(AtomicF64::new(1.0));

        {
            let unit = Arc::clone(&unit);
            define_builtin!(context, "set_unit", 1, |args, ctx| {
                let value = args.get_or_undefined(0).to_f32(ctx)?;
                unit.store(value as f64, Ordering::SeqCst);
                Ok(JsValue::undefined())
            });
        }



        // let builtin_unit_fn = {
        //     let unit = Arc::clone(&unit);
        //     let func = move |_: &JsValue, args: &[JsValue], ctx: &mut Context| -> JsResult<JsValue> {
        //         let value = args.get_or_undefined(0).to_f32(ctx)?;
        //         unit.store(value as f64, Ordering::SeqCst);
        //         Ok(JsValue::undefined())
        //     };
        //     unsafe {
        //         NativeFunction::from_closure(func)
        //     }
        // };
        // let name = js_string!("__builtin_set_unit");
        // let function = FunctionObjectBuilder::new(context.realm(), builtin_unit_fn)
        //     .name(name.clone())
        //     .length(1)
        //     .constructor(false)
        //     .build();
        // context.register_global_property(name, function, attribute);

        Self {
            context,
            unit,
        }
    }
}


/// Runtime Point type
#[derive(Debug, Trace, Finalize, JsData)]
pub enum Shape {
    Prism {
        pos: (i32, i32, i32),
        size: (u32, u32, u32),
    },
    Empty,
    Arbitrary(BTreeSet<(i32, i32, i32)>),
    Translated(Box<Shape>, (i32, i32, i32)),
}

#[derive(Debug, Trace, Finalize, JsData)]
pub struct ShapeHandle {
    idx: usize,
}

impl Class for ShapeHandle {
    const NAME: &'static str = "_Shape";
    const LENGTH: usize = 1;

    fn init(class: &mut boa_engine::class::ClassBuilder<'_>) -> JsResult<()> {
        class.method("withX", 1, NativeFunction::from)
    }

    fn data_constructor(
        _new_target: &JsValue,
        args: &[JsValue],
        context: &mut Context,
    ) -> JsResult<Self> {
        let idx = args.get_or_undefined(0).to_u32(context)?;
        Ok(Self { idx: idx as usize })
    }
}

fn main() -> JsResult<()> {
    let mut limits = RuntimeLimits::default();
    limits.set_loop_iteration_limit(2048);
    limits.set_recursion_limit(2048);
    limits.set_stack_size_limit(20480);

    let mut context = Context::default();
    context.set_runtime_limits(limits);


    
     let js_code = r#"
      let two = 1 + 1;
      let definitely_not_four = two + "2";

      throw new Error("what")

      definitely_not_four
  "#;

  // Instantiate the execution context
  let mut context = Context::default();

  // Parse the source code
  let result = context.eval(Source::from_bytes(js_code));

  println!("{:?}", result);
    if let Err(error) = result {
        println!("{}", error);
    }

  Ok(())
}
