# Prism

![Build Badge](https://img.shields.io/github/check-runs/Pistonite/prism/main)
![License Badge](https://img.shields.io/github/license/Pistonite/prism)
![Issue Badge](https://img.shields.io/github/issues/Pistonite/prism)

Hex Grid Drawing Tool. https://prism.pistonite.dev

The shapes are defined using TypeScript, which is transpiled with SWC
and executed using a custom runtime built with the BOA JS engine to
create the 3D shape data. The data is then rendered onto a 2D hex grid
and turned into an optimized SVG.

The web app allows for quick prototyping of a design. However, it is hard
to keep track of the source code after the design is made. Therefore,
prism is also a CLI tool to help with just that!

```
cargo install prism-cli --git https://github.com/Pistonite/prism
```

The CLI tool has the same functionality as the web app, but exposed as CLI.
For example, to render `shape.ts` to an SVG:
```
prism shape.ts > shape.svg
```

The CLI tool can also render to PNG:
```
prism shape.ts --png shape.png
```

You can also import multiple files or specifying additional command to run directly
from the CLI. (note the `-c` command is not transpiled)
```
# suppose the TS files define a function `main` to be called with a color
prism util.ts common.ts -c "main('red')"
```

Moreover, the CLI tool supports `import "script";` statements in TypeScript.
The path is resolved as a local path and the full file path
must be given (i.e. `script.ts` instead of `script`). ESM and node_modules
are not supported - you shouldn't need them anyway

Lastly, you can emit the `.d.ts` file for local development by calling
without an input
```
prism > prism.d.ts
```

This is the minimal `tsconfig.json` to get LSP working:
```json
{
    "compilerOptions": {
        "lib": ["esnext"]
    },
}
```
