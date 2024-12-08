import { Button } from "@fluentui/react-components";
import {
    WeatherMoon20Regular,
    WeatherSunny20Regular,
} from "@fluentui/react-icons";
import { setDark } from "@pistonite/pure/pref";
import { useDark } from "@pistonite/pure-react";

export const ChangeDark: React.FC = () => {
    const dark = useDark();
    return (
        <Button
            appearance="subtle"
            icon={dark ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
            onClick={() => setDark(!dark)}
        />
    );
};
