import { config } from "mono-dev/eslint";

export default config({
    ignores: ["dist", "src/PrismLib.ts"],
    tsconfigRootDir: import.meta.dirname,
});
