use std::collections::BTreeSet;
use std::path::Path;

use cu::pre::*;

use swc::Compiler;
use swc::config::IsModule;
use swc_common::errors::Handler;
use swc_common::source_map::SourceMap;
use swc_common::sync::Lrc;
use swc_common::{FileName, FilePathMapping, GLOBALS, Mark};
use swc_ecma_ast::{EsVersion, Pass, Program};
use swc_ecma_parser::Syntax;

#[cfg(feature = "native")]
use swc_ecma_ast::{ModuleDecl, ModuleItem};

/// Import muiltple TS files and transform them into JS,
#[cfg(feature = "native")]
pub fn ts_files_to_js(files: &[impl AsRef<Path>]) -> cu::Result<String> {
    use std::fmt::Write as _;

    let mut ts_source = String::new();
    for file in files {
        let file = file.as_ref().normalize()?.into_utf8()?;
        let _ = write!(ts_source, "\nimport \"{file}\";");
    }
    let virtual_file = Path::new("./virtual");
    to_js_internal(&ts_source, Some(virtual_file), true)
}

/// Load a TypeScript source file and transform it into JS,
/// resolving import script statements (`import "..."`)
#[inline(always)]
#[cfg(feature = "native")]
pub fn ts_file_to_js(file: impl AsRef<Path>) -> cu::Result<String> {
    ts_file_to_js_impl(file.as_ref())
}
#[cfg(feature = "native")]
fn ts_file_to_js_impl(file: &Path) -> cu::Result<String> {
    let ts_source = cu::check!(cu::fs::read_string(file), "failed to read TypeScript file")?;
    to_js_internal(&ts_source, Some(file), false)
}

/// Transpile TypeScript source code to JavaScript, without resolving import statements
pub fn standalone_to_js(source: &str) -> cu::Result<String> {
    to_js_internal(source, None, false)
}

/// Transpile TypeScript source code to JavaScript
///
/// import script statements can be resolved if file path is given
fn to_js_internal(ts_source: &str, file: Option<&Path>, virtual_file: bool) -> cu::Result<String> {
    let mut imported = BTreeSet::new();
    if let Some(file) = file {
        if !virtual_file {
            if let Ok(file) = file.canonicalize() {
                imported.insert(file.to_string_lossy().to_string());
            }
        }
    }
    let source_map = Lrc::new(SourceMap::new(FilePathMapping::empty()));
    let compiler = Compiler::new(source_map.clone());

    let program = GLOBALS.set(&Default::default(), || {
        let mut program = load_program(source_map, &compiler, ts_source, file, &mut imported)?;
        let mut transformer = swc_ecma_transforms_typescript::strip(Mark::new(), Mark::new());
        transformer.process(&mut program);
        cu::Ok(program)
    })?;

    let js = cu::check!(
        compiler.print(&program, Default::default()),
        "failed to print JavaScript source"
    )?;
    Ok(js.code)
}

/// Load a TS source
fn load_program(
    source_map: Lrc<SourceMap>,
    compiler: &Compiler,
    ts_source: &str,
    file: Option<&Path>,
    _imported: &mut BTreeSet<String>,
) -> cu::Result<Program> {
    let source = if let Some(file) = file {
        let file_path = file.to_path_buf();
        if !file_path.exists() {
            source_map.new_source_file(
                Lrc::new(FileName::Custom("virtual".to_string())),
                ts_source.to_string(),
            )
        } else {
            source_map.new_source_file(Lrc::new(FileName::Real(file_path)), ts_source.to_string())
        }
    } else {
        source_map.new_source_file(
            Lrc::new(FileName::Custom("input.ts".to_string())),
            ts_source.to_string(),
        )
    };

    let handler = if cfg!(feature = "wasm") {
        // ignore the output of the handler in WASM
        Handler::with_emitter_writer(Box::new(Vec::new()), Some(source_map.clone()))
    } else {
        Handler::with_emitter_writer(Box::new(std::io::stderr()), Some(source_map.clone()))
    };

    let program = compiler.parse_js(
        source,
        &handler,
        EsVersion::EsNext,
        Syntax::Typescript(Default::default()),
        IsModule::Unknown,
        Some(compiler.comments()),
    );

    let program = cu::check!(program, "failed to parse TypeScript source")?;

    #[cfg(feature = "native")]
    let program = {
        let mut program = program;
        let resolve_imports_result =
            resolve_imports(&source_map, compiler, &mut program, file, _imported);
        if let Err(e) = resolve_imports_result {
            match file {
                Some(path) => {
                    cu::rethrow!(e, "failed to resolve imports in file: '{}'", path.display());
                }
                None => {
                    cu::rethrow!(e, "failed to resolve imports in virtual file");
                }
            }
        }
        program
    };

    Ok(program)
}

#[cfg(feature = "native")]
fn resolve_imports(
    source_map: &Lrc<SourceMap>,
    compiler: &Compiler,
    program: &mut Program,
    file: Option<&Path>,
    imported: &mut BTreeSet<String>,
) -> cu::Result<()> {
    let Some(file_directory) = file.and_then(|f| f.parent()) else {
        // input is not a file, imports are not possible to be resolved
        return Ok(());
    };
    let Program::Module(module) = program else {
        // program must be a module to resolve imports
        return Ok(());
    };
    // resolve imports
    for item in std::mem::take(&mut module.body) {
        let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = &item else {
            module.body.push(item);
            continue;
        };
        // only process import "...";
        if import.type_only || !import.specifiers.is_empty() {
            module.body.push(item);
            continue;
        }
        let import_src = cu::check!(
            import.src.value.as_str(),
            "import source is not UTF-8: {}",
            import.src.value.to_string_lossy()
        )?;
        let path = file_directory.join(import_src);
        let path = cu::check!(path.normalize(), "failed to resolve import path")?;
        let path_str = path.as_utf8()?;
        if !imported.insert(path_str.to_string()) {
            // already imported this file - similar to the effect of #pragma once
            continue;
        }
        let ts_source = cu::check!(cu::fs::read_string(&path), "failed to read import file")?;

        let imported_program = load_program(
            source_map.clone(),
            compiler,
            &ts_source,
            Some(&path),
            imported,
        )?;
        match imported_program {
            Program::Module(imported_module) => {
                module.body.extend(imported_module.body);
            }
            Program::Script(imported_script) => {
                for stmt in imported_script.body {
                    module.body.push(ModuleItem::Stmt(stmt));
                }
            }
        }
    }

    Ok(())
}
