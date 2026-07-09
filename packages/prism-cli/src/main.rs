use std::io::Read as _;

use cu::pre::*;
use prism_lib::Svg;

mod png;

/// CLI for Prism, Isometric hex grid drawing tool using TypeScript
#[derive(Clone, Debug, clap::Parser, AsRef)]
#[clap(version)]
struct Cli {
    /// The prism scripts to import and run, omit to print the Prism lib's .d.ts
    ///
    /// `import` statements in the script will be bundled.
    files: Vec<String>,

    /// If given, the script to run after importing all the files
    ///
    /// Use `-` to read from stdin
    #[clap(long, short)]
    command: Option<String>,

    /// Only transpile and bundle the input, don't run the script
    ///
    /// The output is written to stdout
    #[clap(long, short)]
    transpile_only: bool,

    /// Don't force the output image to be square
    #[clap(long, conflicts_with = "transpile_only")]
    no_square: bool,

    /// Ignore errors during script execution
    #[clap(long, short, conflicts_with = "transpile_only")]
    ignore_error: bool,

    /// If provided, render the SVG as PNG and save to the given path
    #[clap(long, short, conflicts_with = "transpile_only")]
    png: Option<String>,

    #[clap(flatten)]
    #[as_ref]
    flags: cu::cli::Flags,
}

#[cu::cli]
fn main(args: Cli) -> cu::Result<()> {
    cu::lv::disable_print_time();

    if args.files.is_empty() {
        println!("{}", prism_lib::lib_d_ts());
        return Ok(());
    }

    let mut transpiled_script = cu::check!(
        prism_transpile::ts_files_to_js(&args.files),
        "failed to transpile the script"
    )?;
    if let Some(command) = &args.command {
        transpiled_script.push('\n');
        if command.trim() == "-" {
            let mut input = String::new();
            cu::check!(
                std::io::stdin().read_to_string(&mut input),
                "failed to read from stdin"
            )?;
            transpiled_script.push_str(&input);
        } else {
            transpiled_script.push_str(command);
        }
    }

    if args.transpile_only {
        println!("{transpiled_script}");
        return Ok(());
    }

    let result = prism_lib::execute_script(&transpiled_script);
    let polygons = prism_lib::polygons_from_layers(result.layers);
    let svg = Svg::from_polygons(&polygons, result.unit, !args.no_square);

    for message in result.messages {
        eprintln!(":: {message}");
    }

    if result.has_js_error {
        if !args.ignore_error {
            cu::hint!(
                "the script threw an error; pass in --ignore-error to print the SVG output anyway"
            );
            cu::bail!("script execution error");
        } else {
            eprintln!();
            eprintln!(":: the script has thrown an error!");
        }
    }

    match args.png {
        Some(path) => {
            cu::check!(png::save_svg_to_png(&svg, path), "failed to save the PNG")?;
        }
        None => {
            println!("{}", svg.content);
        }
    }

    Ok(())
}
