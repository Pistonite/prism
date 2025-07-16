import { initLocaleWithI18next } from "@pistonite/pure-i18next";

import {
    loadSharedControlLanguage,
    namespace as sharedControlsNamespace,
} from "@pistonite/shared-controls";

export const SupportedLanguages = ["en", "zh"] as const;

export const initI18n = (): Promise<void> => {
    return initLocaleWithI18next({
        supported: SupportedLanguages,
        default: "en",
        persist: true,
        loader: {
            translation: async (language) => {
                const strings = await import(`./strings/${language}.yaml`);
                return strings.default as Record<string, string>;
            },
            [sharedControlsNamespace]: loadSharedControlLanguage,
        },
    });
};
