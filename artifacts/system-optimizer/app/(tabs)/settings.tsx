import { Feather } from "@expo/vector-icons";
import * as Application from "expo-application";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useColors } from "@/hooks/useColors";
import type { SupportedLocale } from "@/i18n";
import { useSettingsStore, type ThemePref } from "@/store/settingsStore";
import { usePermissionsStore } from "@/store/permissionsStore";
import { useRouter } from "expo-router";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

const THEME_OPTIONS: { value: ThemePref; key: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "auto", key: "settings.themeAuto", icon: "smartphone" },
  { value: "light", key: "settings.themeLight", icon: "sun" },
  { value: "dark", key: "settings.themeDark", icon: "moon" },
];

const LANG_OPTIONS: { value: SupportedLocale; key: string }[] = [
  { value: "ar", key: "settings.languageArabic" },
  { value: "en", key: "settings.languageEnglish" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const router = useRouter();
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const reopenOnboarding = usePermissionsStore((s) => s.reopenOnboarding);

  const topPad = Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

  const version =
    Application.nativeApplicationVersion ?? "1.0.0";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad,
        paddingHorizontal: 16,
        paddingBottom: bottomPad,
        gap: 16,
      }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("settings.title")}
        </Text>
      </View>

      <Card>
        <SectionHeader title={t("settings.language")} />
        <View style={styles.segGroup}>
          {LANG_OPTIONS.map((opt) => {
            const active = opt.value === locale;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setLocale(opt.value)}
                style={({ pressed }) => [
                  styles.segItem,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : pressed ? colors.muted : "transparent",
                    borderRadius: colors.radius - 4,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segLabel,
                    { color: active ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {t(opt.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <SectionHeader title={t("settings.theme")} />
        <View style={styles.themeCol}>
          {THEME_OPTIONS.map((opt) => {
            const active = opt.value === theme;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setTheme(opt.value)}
                style={({ pressed }) => [
                  styles.themeRow,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: pressed ? colors.muted : "transparent",
                    borderRadius: colors.radius - 4,
                  },
                ]}
              >
                <Feather
                  name={opt.icon}
                  size={18}
                  color={active ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[styles.themeLabel, { color: colors.foreground }]}
                >
                  {t(opt.key)}
                </Text>
                {active ? (
                  <Feather name="check" size={18} color={colors.primary} />
                ) : (
                  <View style={{ width: 18 }} />
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <SectionHeader title={t("onboarding.title")} />
        <Button
          label={t("onboarding.continue")}
          icon="shield"
          variant="secondary"
          fullWidth
          onPress={() => {
            reopenOnboarding();
            router.replace("/onboarding");
          }}
        />
      </Card>

      <Card>
        <SectionHeader title={t("settings.privacyTitle")} />
        <Text
          style={[
            styles.body,
            { color: colors.mutedForeground },
          ]}
        >
          {t("settings.privacyBody")}
        </Text>
      </Card>

      <Card>
        <SectionHeader title={t("settings.about")} />
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>
            {t("settings.version")}
          </Text>
          <Text
            style={[styles.aboutValue, { color: colors.foreground }]}
          >
            {version}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, gap: 4 },
  title: { fontSize: 28, fontWeight: "700", fontFamily: "Cairo_700Bold" },
  segGroup: { flexDirection: "row", gap: 8 },
  segItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  segLabel: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  themeCol: { gap: 8 },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themeLabel: { flex: 1, fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  body: { fontSize: 13, fontFamily: "Cairo_400Regular", lineHeight: 20 },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aboutLabel: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  aboutValue: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },
});
