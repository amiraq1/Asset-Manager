import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useSettingsStore } from "@/store/settingsStore";

/**
 * Returns the design tokens for the active color scheme, taking the
 * user's persisted theme preference (`auto` | `light` | `dark`) into
 * account. Falls back to the system scheme when set to `auto`.
 */
export function useColors() {
  const systemScheme = useColorScheme();
  const themePref = useSettingsStore((s) => s.theme);

  const effective =
    themePref === "auto" ? systemScheme : themePref;

  const palette =
    effective === "dark" && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;

  return { ...palette, radius: colors.radius };
}
