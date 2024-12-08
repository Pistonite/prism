
use csscolorparser::Color;
use serde::{Deserialize, Serialize};

use crate::flat::Prism;
use crate::math::{nonneg, nonneg_sub, Vec3};

/// Prism configuration tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrismTree {
    /// Length of 1 unit in the output SVG
    #[serde(skip_serializing_if = "Option::is_none")]
    unit: Option<f64>,
    /// Color of the shades of the 3 sides
    #[serde(default)]
    shader: Vec3<Option<Color>>,
    /// Root color of the whole shape
    color: Color,
    /// Root position
    #[serde(default)]
    pos: Vec3<i32>,
    /// Prisms in the shape
    prism: Option<Vec<TreeNode>>,
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

impl PrismTree {
    pub fn from_yaml(yaml: &str) -> Result<Self, serde_yaml_ng::Error> {
        serde_yaml_ng::from_str(yaml)
    }


    /// Render the Tree into a flat list of non-intersecting 3D shapes
    pub fn render_prisms(&self) -> Vec<Prism> {
        let mut out = Vec::new();
        if let Some(tree) = &self.prism {
            for child in tree {
                child.render_into(self.pos, &self.color, &mut out);
            }
        }
        out
    }

    /// Get the shader color
    ///
    /// If the shader is not set, or if a component is not set,
    /// the default value is returned.
    /// The default colors are:
    /// - X: rgba(0, 0, 0, 0.15)
    /// - Y: rgba(0, 0, 0, 0.4)
    /// - Z: rgba(0, 0, 0, 0)
    pub fn get_shader(&self) -> Vec3<Color> {
        let shader_option = &self.shader;
        let x = shader_option.x_ref().as_ref().cloned().unwrap_or(DEFAULT_SHADER_X);
        let y = shader_option.y_ref().as_ref().cloned().unwrap_or(DEFAULT_SHADER_Y);
        let z = shader_option.z_ref().as_ref().cloned().unwrap_or(DEFAULT_SHADER_Z);
        Vec3(x, y, z)
    }

    pub fn get_unit(&self) -> f64 {
        self.unit.unwrap_or(20.)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeNode {
    /// Color of the shape as HTML color string
    ///
    /// None to inherit from parent
    color: Option<Color>,
    /// Whether to cut the prism
    ///
    /// Cut means the prism is subtracted from the parent
    #[serde(default)]
    cut: bool,
    /// Exclude the prism from output
    #[serde(default)]
    hidden: bool,
    /// Position of the prism relative to its parent
    pos: Vec3<i32>,
    /// Size or children of the prism
    #[serde(flatten)]
    tree: TreeType,
}

impl TreeNode {
    /// Render this tree into the given vector
    pub fn render_into(&self, offset: Vec3<i32>, parent_color: &Color,out: &mut Vec<Prism>)
    {
        if self.hidden {
            return;
        }
        let color = self.color.as_ref().unwrap_or(parent_color);
        let offset = self.pos + offset;
        match &self.tree {
            TreeType::Group(children) => {
                for child in children {
                    if child.cut {
                        // for cuts, it needs to be put into a separate buffer,
                        // so we can run the subtration 
                        let mut cut = Vec::new();
                        child.render_into(offset, color, &mut cut);
                        Prism::vec_subtract(out, &cut);
                    } else {
                        child.render_into(offset, color, out);
                    }
                }
            }
            TreeType::Size(size) => {
                if !size.all_positive() {
                    return;
                }
                out.push(Prism::new(color, offset, *size));
            }
        }
    }


}

macro_rules! prism_subtraction_part {
    ($out:ident, $color: ident, pos: $pos:expr, size: [$x_size:expr, $y_size:expr, $z_size:expr $(,)?]) => {{
        let size = ($x_size, $y_size, $z_size);
        if size.0 > 0 && size.1 > 0 && size.2 > 0 {
            $out.push(crate::flat::Prism::new($color, $pos, size))
        }
    }};
}

/// Tree-render utils
impl Prism {
    /// Subtract the geometries in the operands from the geometry in the vector
    pub fn vec_subtract(v: &mut Vec<Self>, operands: &[Self]) {
        if operands.is_empty() {
            return;
        }
        let original = std::mem::take(v);
        for orig in original {
            for op in operands {
                orig.subtract_into(op, v);
            }
        }
    }

    /// Subtract another prism from this prism
    /// 
    /// Output is a list of prisms that are the result of the subtraction.
    /// Only positive volume prisms are emitted. The results
    /// are pushed to the out vec.
    pub fn subtract_into(&self, operand: &Self, out: &mut Vec<Self>) {
        let b = self.intersection(operand);
        if !b.has_positive_volume() {
            // nothing to subtract
            out.push(self.clone());
            return;
        }
        let color = &self.color;
        // bottom
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                self.pos.x(),
                self.pos.y(),
                b.z_end(),
            ),
            size: [
                self.size.x(),
                self.size.y(),
                nonneg_sub!(self.z_end(), b.z_end()),
            ]
        };
        // +x
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                b.x_end(),
                self.pos.y(),
                b.pos.z(),
            ),
            size: [
                nonneg_sub!(self.x_end(), b.x_end()),
                self.size.y(),
                b.size.z(),
            ]
        };

            // -x
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                self.pos.x(),
                self.pos.y(),
                b.pos.z(),
            ),
            size: [
                nonneg_sub!(b.pos.x(), self.pos.x()),
                self.size.y(),
                b.size.z(),
            ]
        };
        // +y
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                b.pos.x(),
                b.y_end(),
                b.pos.z(),
            ),
            size: [
                b.size.x(),
                nonneg_sub!(self.y_end(), b.y_end()),
                b.size.z(),
            ]
        };
        // -y
        prism_subtraction_part! {
            out, color,
            pos: Vec3(
                b.pos.x(),
                self.pos.y(),
                b.pos.z(),
            ),
            size: [
                b.size.x(),
                nonneg_sub!(b.pos.y(), self.pos.y()),
                b.size.z(),
            ]
        };
        // top
        prism_subtraction_part! {
            out, color,
            pos: self.pos,
            size: [
                self.size.x(),
                self.size.y(),
                nonneg_sub!(b.pos.z(), self.pos.z())
            ]
        };
        
    }
}



/// Size or children of the prism
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum TreeType {
    Size(Vec3<u32>),
    #[serde(rename = "children")]
    Group(Vec<TreeNode>),
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn render_one() {
        let tree = PrismTree::from_yaml(r##"
color: "#ff0000"
prism:
  - pos: [0, 0, 0]
    size: [1, 1, 1]
        "##).unwrap();

        let prisms = tree.render_prisms();
        let color = "#ff0000".parse().unwrap();
        assert_eq!(prisms, 
        vec![Prism::new(
            &color
            , (0, 0, 0), (1, 1, 1))]);

    }

    #[test]
    fn render_one_big() {
        let tree = PrismTree::from_yaml(r##"
color: "#ff0000"
prism:
  - pos: [1, 2, 3]
    size: [10, 12, 13]
        "##).unwrap();

        let prisms = tree.render_prisms();
        let color = "#ff0000".parse().unwrap();
        assert_eq!(prisms, 
        vec![Prism::new(
            &color
            , (1, 2, 3), (10, 12, 13))]);

    }


}
