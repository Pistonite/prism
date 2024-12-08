import {
    convertToSupportedLocale,
    detectLocale,
    initLocale,
} from "@pistonite/pure/pref";
import i18next, { type BackendModule } from "i18next";
import { initReactI18next } from "react-i18next";

const backend: BackendModule = {
    type: "backend",
    init: () => {
        // nothing to init
    },
    read: async (language: string, namespace: string) => {
        if (namespace !== "translation") {
            return undefined;
        }

        const locale = convertToSupportedLocale(language) || "en";
        const strings = await import(`./strings/${locale}.yaml`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return strings.default;
    },
};

export const SupportedLanguages = ["en", "zh"] as const;

export const initI18n = async () => {
    initLocale({
        supported: SupportedLanguages,
        default: "en",
        persist: true,
    });
    await i18next.use(detectLocale).use(backend).use(initReactI18next).init();
};
