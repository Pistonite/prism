import { initLocale } from "@pistonite/celera";

export const SupportedLanguages = ["en", "zh"] as const;

export const initI18n = (): Promise<void> => {
    return initLocale({
        supported: SupportedLanguages,
        default: "en",
        persist: true,
        loader: async (language) => {
            const strings = await import(`./strings/${language}.yaml`);
            return strings.default as Record<string, string>;
        },
    });
};
