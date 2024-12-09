import {
    Menu,
    MenuButton,
    MenuItemRadio,
    MenuList,
    MenuPopover,
    MenuTrigger,
} from "@fluentui/react-components";
import { Globe20Regular } from "@fluentui/react-icons";
import { getLocale, getLocalizedLanguageName } from "@pistonite/pure/pref";
import { useState } from "react";
import i18next from "i18next";

import { SupportedLanguages } from "data/i18n.ts";

export const ChangeLanguage: React.FC = () => {
    const [locale, setLocale] = useState(getLocale);
    return (
        <Menu
            checkedValues={{ locale: [locale] }}
            onCheckedValueChange={async (_, { checkedItems }) => {
                setLocale(checkedItems[0]);
                await i18next.changeLanguage(checkedItems[0]);
            }}
        >
            <MenuTrigger disableButtonEnhancement>
                <MenuButton appearance="subtle" icon={<Globe20Regular />} />
            </MenuTrigger>
            <MenuPopover>
                <MenuList>
                    {SupportedLanguages.map((lang) => (
                        <MenuItemRadio key={lang} name="locale" value={lang}>
                            {getLocalizedLanguageName(lang)}
                        </MenuItemRadio>
                    ))}
                </MenuList>
            </MenuPopover>
        </Menu>
    );
};
