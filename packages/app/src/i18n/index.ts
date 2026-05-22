import { initLocale } from "@pistonite/celera";
import Strings from "./strings.yaml";

export const SupportedLanguages = ["en", "zh"] as const;

export const initI18n = (): Promise<void> => {
    return initLocale({
        supported: SupportedLanguages,
        default: "en",
        persist: true,
        loader: async (language) => Strings[language],
    });
};
