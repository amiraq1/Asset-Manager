import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { SupportedLocale } from "@/i18n";

export type ThemePref = "auto" | "light" | "dark";

interface SettingsState {
  locale: SupportedLocale;
  theme: ThemePref;
  hydrated: boolean;
  setLocale: (locale: SupportedLocale) => void;
  setTheme: (theme: ThemePref) => void;
  markHydrated: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: "ar",
      theme: "auto",
      hydrated: false,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "system-optimizer.settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ locale: s.locale, theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
