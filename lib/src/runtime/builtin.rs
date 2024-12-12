use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, RwLock};

use boa_engine::object::builtins::JsArray;
use boa_engine::{Context, JsArgs, JsError, JsResult, JsValue};
use csscolorparser::{Color, ParseColorError};

use crate::math::{Vec3, AtomicF64};
use crate::render::{Layer, Canvas, Face, self};
use crate::shape::ShapeVec;

/// Builtin bindings for the rendering script engine
pub struct Builtin {
    /// Unit length of the shape
    unit: Arc<AtomicF64>,
    /// The canvas for rendering
    canvas: Arc<RwLock<Canvas>>,
    /// Object ID counter for debugging
    obj_id: Arc<AtomicU64>,
    /// Ids logged by debug calls
    logs: Arc<RwLock<Vec<String>>>,
    /// Shapes in the scene
    shapes: ShapeVec,
    /// Rendered faces
    faces: Arc<RwLock<Vec<Face>>>,
}
const DEFAULT_SHADER_X: Color = Color {
    r: 0.0,
    g: 0.0,
    b: 0.0,
    a: 0.15,
};

const DEFAULT_SHADER_Y: Color = Color {
    r: 0.0,
    g: 0.0,
    b: 0.0,
    a: 0.4,
};

const DEFAULT_SHADER_Z: Color = Color {
    r: 0.0,
    g: 0.0,
    b: 0.0,
    a: 0.0,
};

impl Default for Builtin {
    fn default() -> Self {
        let shader = (DEFAULT_SHADER_X, DEFAULT_SHADER_Y, DEFAULT_SHADER_Z).into();
        Self {
            unit: Arc::new(AtomicF64::new(20.)),
            canvas: Arc::new(RwLock::new(Canvas::new(shader))),
            obj_id: Arc::new(AtomicU64::new(1)),
            logs: Arc::new(RwLock::new(Vec::new())),
            shapes: ShapeVec::default(),
            faces: Arc::new(RwLock::new(Vec::new())),
        }
    }
}

impl Builtin {
    /// Render everything rendered so far into layers
    ///
    /// This is a destructive operation. Shapes rendered into
    /// layers will become 2D and no longer interact
    /// with the 3D space properly
    pub fn render_layers(&self) -> Vec<Layer> {
        {
            let mut faces = self.faces.write().unwrap();
            render::sort_faces(&mut faces);
        }
        {
            let faces = self.faces.read().unwrap();
            let mut canvas = self.canvas.write().unwrap();
            for face in faces.iter() {
                canvas.render_face(face);
            }
        }
        {
            let canvas = self.canvas.read().unwrap();
            canvas.render_layers()
        }
    }

    pub fn get_logs(&self) -> Vec<String> {
        self.logs.read().unwrap().clone()
    }

    pub fn get_unit(&self) -> f64 {
        self.unit.load(Ordering::SeqCst)
    }
}

/// Define a builtin function in the JS global scope
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
        let attribute = ::boa_engine::property::Attribute::default();
        let function = ::boa_engine::object::FunctionObjectBuilder::new($context.realm(), function)
            .name(name.clone())
            .length($arg_len)
            .constructor(false)
            .build();
        $context.register_global_property(name, function, attribute)
    }}
}

macro_rules! arg_string {
    ($args:ident, $ctx:ident, $index:literal) => {
        $args.get_or_undefined($index).to_string($ctx).map(|s| s.to_std_string_lossy())
    };
}

macro_rules! arg_i32 {
    ($args:ident, $ctx:ident, $index:literal) => {
        $args.get_or_undefined($index).to_i32($ctx)
    };
}

macro_rules! arg_u32 {
    ($args:ident, $ctx:ident, $index:literal) => {
        $args.get_or_undefined($index).to_u32($ctx)
    };
}

macro_rules! arg_shape {
    ($args:ident, $shapes:ident, $ctx:ident, $index:literal) => {
        $args.get_or_undefined($index).to_u32($ctx)
            .and_then(|idx| {
                $shapes.get(idx as usize)
                    .ok_or_else(|| Error::InvalidShapeHandle(idx).to_js_error())
            })
    };
}

macro_rules! arg_axis {
    ($args:ident, $ctx:ident, $index:literal) => {
        $args.get_or_undefined($index).to_u32($ctx)
            .and_then(|idx| {
                $crate::math::Axis::from_u32(idx)
                    .ok_or_else(|| Error::InvalidAxisEnum(idx).to_js_error())
            })
    };
}

impl Builtin {

    /// Bind the builtin functions to the JS engine
    pub fn bind_to_engine(&self, context: &mut Context) -> JsResult<()> {
        {
            let logs = Arc::clone(&self.logs);
            define_builtin!(context, "log", 0, |args, ctx| {
                let value = arg_string!(args, ctx, 0)?;
                let mut logs = logs.write().map_err(|e| JsError::from_rust(&e))?;
                logs.push(value);

                Ok(JsValue::undefined())
            })?;
        }
        {
            let unit = Arc::clone(&self.unit);
            define_builtin!(context, "set_unit", 1, |args, ctx| {
                let value = args.get_or_undefined(0).to_f32(ctx)?;
                unit.store(value as f64, Ordering::SeqCst);
                Ok(JsValue::undefined())
            })?;
        }
        {
            let canvas = Arc::clone(&self.canvas);
            define_builtin!(context, "set_shader", 3, |args, ctx| {
                let x = arg_string!(args, ctx, 0)?;
                let y = arg_string!(args, ctx, 1)?;
                let z = arg_string!(args, ctx, 2)?;

                let x = if x.is_empty() {
                    DEFAULT_SHADER_X
                } else {
                    parse_color(&x)?
                };

                let y = if y.is_empty() {
                    DEFAULT_SHADER_Y
                } else {
                    parse_color(&y)?
                };

                let z = if z.is_empty() {
                    DEFAULT_SHADER_Z
                } else {
                    parse_color(&z)?
                };

                let mut write = canvas.write().map_err(|e| JsError::from_rust(&e))?;
                write.set_shader(Vec3(x, y, z));
                Ok(JsValue::undefined())
            })?;
        }
        {
            let obj_id = Arc::clone(&self.obj_id);
            let debug_logs = Arc::clone(&self.logs);
            define_builtin!(context, "debug", 0, |_args, _ctx| {
                let id = obj_id.load(Ordering::SeqCst);
                let mut logs = debug_logs.write().map_err(|e| JsError::from_rust(&e))?;
                logs.push(format!("debug: next object id is {}", id));
                Ok(JsValue::undefined())
            })?;
        }
        {
            let obj_id = Arc::clone(&self.obj_id);
            define_builtin!(context, "nextid", 0, |_args, _ctx| {
                let id = obj_id.fetch_add(1, Ordering::SeqCst);
                Ok(id.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_size", 1, |args, ctx| {
                let shape = arg_shape!(args, shapes, ctx, 0)?;
                let size = shape.size();
                let value = JsArray::from_iter([size.x(), size.y(), size.z()].into_iter().map(JsValue::from), ctx);
                Ok(value.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_min", 2, |args, ctx| {
                let shape = arg_shape!(args, shapes, ctx, 0)?;
                let axis = arg_axis!(args, ctx, 1)?;
                let min = shape.min(axis)
                    .ok_or_else(|| Error::MinOfEmptyShape.to_js_error())?;
                Ok(min.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_max", 2, |args, ctx| {
                let shape = arg_shape!(args, shapes, ctx, 0)?;
                let axis = arg_axis!(args, ctx, 1)?;
                let min = shape.max(axis)
                    .ok_or_else(|| Error::MaxOfEmptyShape.to_js_error())?;
                Ok(min.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_at_point", 4, |args, ctx| {
                let shape = arg_shape!(args, shapes, ctx, 0)?;
                let point = (
                    arg_i32!(args, ctx, 1)?,
                    arg_i32!(args, ctx, 2)?,
                    arg_i32!(args, ctx, 3)?,
                );
                Ok(shape.with_min(point).idx.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_at_axis_off", 3, |args, ctx| {
                let shape = arg_shape!(args, shapes, ctx, 0)?;
                let axis = arg_axis!(args, ctx, 1)?;
                let offset = arg_i32!(args, ctx, 2)?;
                Ok(shape.with_axis_off(axis, offset).idx.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_translate", 4, |args, ctx| {
                let shape = arg_shape!(args, shapes, ctx, 0)?;
                let offset = (
                    arg_i32!(args, ctx, 1)?,
                    arg_i32!(args, ctx, 2)?,
                    arg_i32!(args, ctx, 3)?,
                );
                Ok(shape.translate(offset).idx.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_translate_axis_off", 3, |args, ctx| {
                let shape = arg_shape!(args, shapes, ctx, 0)?;
                let axis = arg_axis!(args, ctx, 1)?;
                let offset = arg_i32!(args, ctx, 2)?;
                Ok(shape.translate_axis(axis, offset).idx.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_union", 2, |args, ctx| {
                let a = arg_shape!(args, shapes, ctx, 0)?;
                let b = arg_shape!(args, shapes, ctx, 1)?;
                Ok(a.union(&b).idx.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_intersection", 2, |args, ctx| {
                let a = arg_shape!(args, shapes, ctx, 0)?;
                let b = arg_shape!(args, shapes, ctx, 1)?;
                Ok(a.intersection(&b).idx.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_difference", 2, |args, ctx| {
                let a = arg_shape!(args, shapes, ctx, 0)?;
                let b = arg_shape!(args, shapes, ctx, 1)?;
                Ok(a.difference(&b).idx.into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            define_builtin!(context, "shape_from_prism", 6, |args, ctx| {
                let pos = (
                    arg_i32!(args, ctx, 0)?,
                    arg_i32!(args, ctx, 1)?,
                    arg_i32!(args, ctx, 2)?,
                );
                let size = (
                    arg_u32!(args, ctx, 3)?,
                    arg_u32!(args, ctx, 4)?,
                    arg_u32!(args, ctx, 5)?,
                );
                Ok(shapes.add_prism(pos, size).into())
            })?;
        }
        {
            let shapes = self.shapes.clone();
            let faces = Arc::clone(&self.faces);
            define_builtin!(context, "render", 2, |args, ctx| {
                let shape = arg_shape!(args, shapes, ctx, 0)?;
                let color = parse_color(&arg_string!(args, ctx, 1)?)?;
                let new_faces = shape.render(color);
                let mut write = faces.write().map_err(|e| JsError::from_rust(&e))?;
                write.extend(new_faces);

                Ok(JsValue::undefined())
            })?;
        }

        Ok(())
    }
}

fn parse_color(s: &str) -> Result<Color, JsError> {
    s.parse().map_err(|e| Error::InvalidColor(e).to_js_error())
}

/// Error thrown to the JS side if something happens
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("native: invalid shape handle: {0}")]
    InvalidShapeHandle(u32),
    #[error("native: invalid axis enum: {0}")]
    InvalidAxisEnum(u32),
    #[error("native: cannot access min of a shape with 0 volume")]
    MinOfEmptyShape,
    #[error("native: cannot access max of a shape with 0 volume")]
    MaxOfEmptyShape,
    #[error("native: invalid color: {0}")]
    InvalidColor(ParseColorError),
}

impl Error {
    pub fn to_js_error(self) -> JsError {
        JsError::from_rust(self)
    }
}
