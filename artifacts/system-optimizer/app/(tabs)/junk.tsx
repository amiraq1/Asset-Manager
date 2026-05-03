import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useColors } from "@/hooks/useColors";
import { useJunkScan } from "@/hooks/useJunkScan";
import { useSettingsStore } from "@/store/settingsStore";
import type { JunkCategory } from "@/types";
import { formatBytes, formatNumber, formatRelativeTime } from "@/utils/format";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

const CATEGORIES: JunkCategory[] = ["cache", "temp", "log", "other"];

export default function JunkScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);
  const { lastScan, scan, clean, scanning, cleaning, error } = useJunkScan();

  // Auto-run an initial scan if none persisted
  useEffect(() => {
    if (!lastScan && !scanning) {
      void scan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topPad = Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

  const total = lastScan?.totalBytes ?? 0;
  const itemCount = lastScan?.itemCount ?? 0;

  const handleCleanAll = () => {
    if (!lastScan || lastScan.itemCount === 0) return;
    Alert.alert(t("cache.confirmTitle"), t("cache.confirmBody"), [
      { text: t("cache.cancel"), style: "cancel" },
      {
        text: t("cache.confirm"),
        style: "destructive",
        onPress: async () => {
          const result = await clean();
          if (result) {
            Alert.alert(
              t("cache.clearedTitle"),
              t("cache.clearedBody", {
                size: formatBytes(result.deletedBytes, locale),
              }),
            );
          }
        },
      },
    ]);
  };

  const handleCleanCategory = (cat: JunkCategory) => {
    Alert.alert(t("cache.confirmTitle"), t("cache.confirmBody"), [
      { text: t("cache.cancel"), style: "cancel" },
      {
        text: t("cache.confirm"),
        style: "destructive",
        onPress: async () => {
          const result = await clean(cat);
          if (result) {
            Alert.alert(
              t("cache.clearedTitle"),
              t("cache.clearedBody", {
                size: formatBytes(result.deletedBytes, locale),
              }),
            );
          }
        },
      },
    ]);
  };

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
          {t("junk.title")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {t("junk.description")}
        </Text>
      </View>

      <Card style={styles.summaryCard}>
        <Text style={[styles.summarySize, { color: colors.foreground }]}>
          {formatBytes(total, locale)}
        </Text>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
          {t("junk.found")}{" "}
          {itemCount === 1
            ? t("junk.items_one")
            : t("junk.items_other", { count: formatNumber(itemCount, locale) })}
        </Text>
        {lastScan ? (
          <Text style={[styles.lastScan, { color: colors.mutedForeground }]}>
            {t("junk.lastScan", {
              when: formatRelativeTime(lastScan.scannedAt, locale),
            })}
          </Text>
        ) : null}
        <View style={styles.summaryActions}>
          <Button
            label={scanning ? t("junk.scanning") : lastScan ? t("junk.rescan") : t("junk.startScan")}
            icon="refresh-ccw"
            variant="secondary"
            onPress={() => void scan()}
            loading={scanning}
            fullWidth
          />
          <Button
            label={t("junk.cleanAll")}
            icon="trash-2"
            variant="primary"
            onPress={handleCleanAll}
            loading={cleaning}
            disabled={!lastScan || lastScan.itemCount === 0}
            fullWidth
          />
        </View>
      </Card>

      {lastScan && lastScan.itemCount > 0 ? (
        <Card>
          <SectionHeader title={t("junk.totalSize")} />
          <View style={styles.catCol}>
            {CATEGORIES.map((cat) => {
              const summary = lastScan.byCategory[cat];
              if (summary.count === 0) return null;
              const ratio = total > 0 ? summary.bytes / total : 0;
              return (
                <View key={cat} style={styles.catRow}>
                  <View style={styles.catHeader}>
                    <Text
                      style={[styles.catName, { color: colors.foreground }]}
                    >
                      {t(`junk.categories.${cat}`)}
                    </Text>
                    <Text
                      style={[styles.catSize, { color: colors.mutedForeground }]}
                    >
                      {formatBytes(summary.bytes, locale)}
                    </Text>
                  </View>
                  <ProgressBar progress={ratio} />
                  <View style={styles.catFooter}>
                    <Text
                      style={[styles.catCount, { color: colors.mutedForeground }]}
                    >
                      {summary.count === 1
                        ? t("junk.items_one")
                        : t("junk.items_other", {
                            count: formatNumber(summary.count, locale),
                          })}
                    </Text>
                    <Button
                      label={t("junk.cleanCategory")}
                      icon="trash"
                      variant="ghost"
                      onPress={() => handleCleanCategory(cat)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      ) : !scanning ? (
        <Card>
          <EmptyState
            icon="check-circle"
            title={t("junk.noResults")}
            description={t("junk.noResultsHint")}
          />
        </Card>
      ) : null}

      <Card>
        <View style={styles.noteRow}>
          <Feather name="info" size={18} color={colors.warning} />
          <View style={styles.noteText}>
            <Text style={[styles.noteTitle, { color: colors.foreground }]}>
              {t("junk.notesTitle")}
            </Text>
            <Text style={[styles.noteBody, { color: colors.mutedForeground }]}>
              {t("junk.notesBody")}
            </Text>
          </View>
        </View>
      </Card>

      {error ? (
        <Card>
          <Text style={{ color: colors.danger, fontFamily: "Cairo_600SemiBold" }}>
            {t("common.error")}: {error.message}
          </Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, gap: 4 },
  title: { fontSize: 28, fontWeight: "700", fontFamily: "Cairo_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Cairo_400Regular", lineHeight: 20 },
  summaryCard: { alignItems: "center", gap: 8 },
  summarySize: {
    fontSize: 40,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  summaryLabel: { fontSize: 14, fontFamily: "Cairo_400Regular" },
  lastScan: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  summaryActions: { gap: 10, width: "100%", marginTop: 12 },
  catCol: { gap: 16 },
  catRow: { gap: 8 },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catName: { fontSize: 15, fontFamily: "Cairo_600SemiBold" },
  catSize: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  catFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catCount: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  noteRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  noteText: { flex: 1, gap: 4 },
  noteTitle: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  noteBody: { fontSize: 12, fontFamily: "Cairo_400Regular", lineHeight: 18 },
});
