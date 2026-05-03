import { Feather } from "@expo/vector-icons";
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

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useColors } from "@/hooks/useColors";
import { runShortcut, SYSTEM_SHORTCUTS } from "@/services/AppManagerService";
import { useSettingsStore } from "@/store/settingsStore";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

export default function AppsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);

  const topPad = Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

  const isAndroid = Platform.OS === "android";

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
          {t("apps.title")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {t("apps.description")}
        </Text>
      </View>

      <Card>
        <EmptyState
          icon="lock"
          title={t("apps.cannotListApps")}
          description={t("apps.cannotListAppsHint")}
        />
      </Card>

      <Card>
        <SectionHeader title={t("apps.deepLinksTitle")} />
        {isAndroid ? (
          <View style={styles.actionsCol}>
            {SYSTEM_SHORTCUTS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => void runShortcut(s)}
                style={({ pressed }) => [
                  styles.actionRow,
                  {
                    backgroundColor: pressed ? colors.muted : "transparent",
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                  },
                ]}
              >
                <View
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: colors.secondary,
                      borderRadius: colors.radius - 6,
                    },
                  ]}
                >
                  <Feather
                    name={s.icon as keyof typeof Feather.glyphMap}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[styles.actionLabel, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {t(s.titleKey)}
                </Text>
                <Feather
                  name="chevron-left"
                  size={18}
                  color={colors.mutedForeground}
                  style={{
                    transform: [{ scaleX: locale === "ar" ? 1 : -1 }],
                  }}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text
            style={[
              styles.notSupported,
              { color: colors.mutedForeground },
            ]}
          >
            {t("apps.notSupported")}
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, gap: 4 },
  title: { fontSize: 28, fontWeight: "700", fontFamily: "Cairo_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Cairo_400Regular", lineHeight: 20 },
  actionsCol: { gap: 8 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  notSupported: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    paddingVertical: 16,
  },
});
