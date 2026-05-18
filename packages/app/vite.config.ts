import intwc from "@pistonite/intwc/vite-plugin";
import { configure } from 'mono-dev/app-build-config';

export default configure({
    plugins: [
        intwc({ languages: ["typescript"], translations: ["zh-cn"] })
    ],
});
