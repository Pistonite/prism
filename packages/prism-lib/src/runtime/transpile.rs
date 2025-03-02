use std::collections::BTreeSet;
use std::path::Path;

use swc::config::IsModule;
use swc::Compiler;
use swc_common::errors::Handler;
use swc_common::source_map::SourceMap;
use swc_common::sync::Lrc;
use swc_common::{FileName, FilePathMapping, Mark, GLOBALS};
use swc_ecma_ast::{EsVersion, ModuleDecl, ModuleItem, Pass, Program};
use swc_ecma_parser::Syntax;

/// Import muiltple TS files and transform them into JS,
pub fn ts_files_to_js(files: &[impl AsRef<Path>]) -> Result<String, String> {
    let mut ts_source = String::new();
    for file in files {
        let file = match file.as_ref().canonicalize() {
            Ok(file) => file,
            Err(e) => return Err(format!("failed to find TypeScript file: {e}")),
        };
        ts_source.push_str(&format!("import \"{}\";\n", file.display()));
    }
    let virtual_file = Path::new("./virtual");
    to_js_internal(&ts_source, Some(&virtual_file), true)
}

/// Load a TypeScript source file and transform it into JS,
/// resolving import script statements (`import "..."`)
pub fn ts_file_to_js(file: impl AsRef<Path>) -> Result<String, String> {
    let file = file.as_ref();
    let ts_source = match std::fs::read_to_string(file) {
        Ok(ts_source) => ts_source,
        Err(e) => return Err(format!("failed to read TypeScript file: {e}")),
    };
    to_js_internal(&ts_source, Some(file), false)
}

/// Transpile TypeScript source code to JavaScript, without resolving import statements
pub fn standalone_to_js(source: &str) -> Result<String, String> {
    to_js_internal(source, None, false)
}

/// Transpile TypeScript source code to JavaScript
///
/// import script statements can be resolved if file path is given
fn to_js_internal(ts_source: &str, file: Option<&Path>, virtual_file: bool) -> Result<String, String> {
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
        Ok::<_, String>(program)
    })?;

    match compiler.print(&program, Default::default()) {
        Ok(js) => Ok(js.code),
        Err(e) => Err(format!("failed to print JavaScript source: {e}")),
    }
}

/// Load a TS source
fn load_program(
    source_map: Lrc<SourceMap>,
    compiler: &Compiler,
    ts_source: &str,
    file: Option<&Path>,
    imported: &mut BTreeSet<String>,
) -> Result<Program, String> {
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
    let mut program = match program {
        Ok(program) => program,
        Err(e) => return Err(format!("failed to parse TypeScript source: {e}")),
    };
    if let Some(file_directory) = file.and_then(|f| f.parent()) {
        if let Program::Module(module) = &mut program {
            // resolve imports
            for item in std::mem::take(&mut module.body) {
                if let ModuleItem::ModuleDecl(ModuleDecl::Import(import)) = &item {
                    // only process import "...";
                    if !import.type_only && import.specifiers.is_empty() {
                        let import_src = import.src.value.to_string();
                        let path = file_directory.join(import_src);
                        let path = match path.canonicalize() {
                            Ok(path) => path,
                            Err(e) => return Err(format!("failed to resolve import path: {e}")),
                        };
                        if imported.insert(path.to_string_lossy().to_string()) {
                            let ts_source = match std::fs::read_to_string(&path) {
                                Ok(ts_source) => ts_source,
                                Err(e) => return Err(format!("failed to read import file: {e}")),
                            };

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
                        continue;
                    }
                }
                module.body.push(item);
            }
        }
    }

    Ok(program)
}
