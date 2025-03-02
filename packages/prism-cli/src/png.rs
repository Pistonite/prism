// SVG2PNG based on https://github.com/glitch4347/svg2png/blob/master/src/main.rs

use std::path::Path;

use anyhow::bail;
use prism_lib::Svg;
use tiny_skia::Pixmap;
use usvg::{Options, Transform, Tree};

pub fn save_svg_to_png(svg: &Svg, path: impl AsRef<Path>) -> anyhow::Result<()> {
    let options = Options::default();
    let tree = Tree::from_str(&svg.content, &options)?;
    let Some(mut pixmap) = Pixmap::new(svg.width.ceil() as u32, svg.height.ceil() as u32) else {
        bail!("Failed to create pixmap");
    };
    resvg::render(&tree, Transform::identity(), &mut pixmap.as_mut());
    pixmap.save_png(path)?;

    Ok(())
}
