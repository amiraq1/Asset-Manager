import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
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
import {
  clearAppCache,
  getAppCacheSize,
  getDocumentDirSize,
} from "@/services/CacheService";
import { runShortcut, SYSTEM_SHORTCUTS } from "@/services/AppManagerService";
import { useSettingsStore } from "@/store/settingsStore";
import { formatBytes, formatNumber } from "@/utils/format";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

export default function CacheScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const qc = useQueryClient();

  const [clearing, setClearing] = useState(false);

  const appCache = useQuery({
    queryKey: ["appCacheSize"],
    queryFn: getAppCacheSize,
    staleTime: 1000 * 30,
  });

  const docDir = useQuery({
    queryKey: ["documentDirSize"],
    queryFn: getDocumentDirSize,
    staleTime: 1000 * 30,
  });

  const handleClear = () => {
    Alert.alert(t("cache.confirmTitle"), t("cache.confirmBody"), [
      { text: t("cache.cancel"), style: "cancel" },
      {
        text: t("cache.confirm"),
        style: "destructive",
        onPress: async () => {
          setClearing(true);
          try {
            const r = await clearAppCache();
            await qc.invalidateQueries({ queryKey: ["appCacheSize"] });
            Alert.alert(
              t("cache.clearedTitle"),
              t("cache.clearedBody", {
                size: formatBytes(r.bytesFreed, locale),
              }),
            );
          } catch (err) {
            Alert.alert(
              t("common.error"),
              err instanceof Error ? err.message : String(err),
            );
          } finally {
            setClearing(false);
          }
        },
      },
    ]);
  };

  const topPad = Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

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
          {t("cache.title")}
        </Text>
      </View>

      <Card>
        <SectionHeader
          title={t("cache.appCache")}
          subtitle={t("cache.appCacheDesc")}
        />
        <Text style={[styles.bigSize, { color: colors.foreground }]}>
          {formatBytes(appCache.data?.bytes ?? 0, locale)}
        </Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>
          {formatNumber(appCache.data?.fileCount ?? 0, locale)}
        </Text>
        <Button
          label={clearing ? t("cache.clearing") : t("cache.clear")}
          icon="trash-2"
          onPress={handleClear}
          loading={clearing}
          disabled={(appCache.data?.bytes ?? 0) === 0}
          fullWidth
          style={{ marginTop: 12 }}
        />
      </Card>

      <Card>
        <SectionHeader
          title={t("cache.documentCache")}
          subtitle={t("cache.documentCacheDesc")}
        />
        <Text style={[styles.bigSize, { color: colors.foreground }]}>
          {formatBytes(docDir.data?.bytes ?? 0, locale)}
        </Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>
          {formatNumber(docDir.data?.fileCount ?? 0, locale)}
        </Text>
      </Card>

      <Card>
        <SectionHeader title={t("cache.systemActions")} />
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
                  { backgroundColor: colors.secondary, borderRadius: colors.radius - 6 },
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
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, gap: 4 },
  title: { fontSize: 28, fontWeight: "700", fontFamily: "Cairo_700Bold" },
  bigSize: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
    marginTop: 4,
  },
  helper: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
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
});
