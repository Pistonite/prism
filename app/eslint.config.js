import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";

function overrideRule(configs, overrides) {
    if (Array.isArray(configs)) {
        for (const config of configs) {
            overrideRule(config, overrides);
        }
    } else {
        if (configs.rules) {
            for (const rule in overrides) {
                if (configs.rules[rule]) {
                    configs.rules[rule] = overrides[rule];
                }
            }
        }
    }
    return configs;
}

const overrides = {
    // typescript has coverage already
    "@typescript-eslint/no-unused-vars": "off",
    // force type to be import as type
    "@typescript-eslint/consistent-type-imports": "warn",
    // too many false positives when required by contract
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-misused-promises": "off",
    // doesn't work with WASM type...
    "@typescript-eslint/no-unsafe-assignment": "off",
    // ?
    "@typescript-eslint/restrict-template-expressions": [
        "warn",
        {
            allowNumber: true
        }
    ],
    // we have TypeScript
    "react/prop-types": "off",
};

const config = tseslint.config(
    { ignores: ["dist", 
        "src/wasm/lib/*",
        "src/wasm/interfaces/*", "src/wasm/sides/*", "src/wasm/workex/*"] },
    {
        extends: [
            js.configs.recommended,
            ...tseslint.configs.strictTypeChecked,
        ],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            }
        },
        settings: {
            react: {
                version: "18",
            }
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
            react,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs["jsx-runtime"].rules,
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true },
            ],
        },
    },
);

export default overrideRule(config, overrides);
