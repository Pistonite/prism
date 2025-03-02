use std::io::Read as _;
use std::process::ExitCode;

use clap::Parser;
use prism_lib::{Svg, transpile};

mod png;

#[derive(Clone, Debug, Parser)]
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
}

fn main() -> ExitCode {
    let args = Cli::parse();

    if args.files.is_empty() {
        println!("{}", prism_lib::lib_d_ts());
        return ExitCode::SUCCESS;
    }

    let mut transpiled_script = match transpile::ts_files_to_js(&args.files) {
        Ok(script) => script,
        Err(e) => {
            eprintln!("Failed to transpile the script: {e}");
            return ExitCode::FAILURE;
        }
    };
    if let Some(command) = &args.command {
        transpiled_script.push('\n');
        if command.trim() == "-" {
            let mut input = String::new();
            if std::io::stdin().read_to_string(&mut input).is_err() {
                eprintln!("Failed to read from stdin");
                return ExitCode::FAILURE;
            }
            transpiled_script.push_str(&input);
        } else {
            transpiled_script.push_str(command);
        }
    }

    if args.transpile_only {
        println!("{}", transpiled_script);
        return ExitCode::SUCCESS;
    }

    let result = prism_lib::execute_script(&transpiled_script);
    let polygons = prism_lib::polygons_from_layers(result.layers);
    let svg = Svg::from_polygons(&polygons, result.unit, !args.no_square);

    for message in result.messages {
        eprintln!("{}", message);
    }

    if result.has_js_error {
        eprintln!();
        eprintln!("The script has thrown an error!");

        if !args.ignore_error {
            eprintln!("Pass in --ignore-error to print the SVG output anyway");
            return ExitCode::FAILURE;
        }
    }

    match args.png {
        Some(path) => {
            if let Err(e) = png::save_svg_to_png(&svg, path) {
                eprintln!("Failed to save the PNG: {}", e);
                return ExitCode::FAILURE;
            }
        }
        None => {
            println!("{}", svg.content);
        }
    }

    ExitCode::SUCCESS
}
