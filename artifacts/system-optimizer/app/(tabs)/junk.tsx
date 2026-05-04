import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
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
import { Checkbox, type CheckboxState } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { RadarScanner } from "@/components/ui/RadarScanner";
import { useToast } from "@/components/ui/Toast";
import { useColors } from "@/hooks/useColors";
import { cleanJunk, scanJunkFiles } from "@/services/JunkScanner";
import { useScanStore } from "@/store/scanStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { JunkCategory, JunkItem, JunkScanResult } from "@/types";
import {
  formatBytes,
  formatNumber,
  formatRelativeTime,
} from "@/utils/format";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

const CATEGORY_ICONS: Record<JunkCategory, keyof typeof Feather.glyphMap> = {
  cache: "database",
  temp: "file",
  log: "file-text",
  other: "folder",
  obsoleteApk: "package",
  emptyFolder: "folder-minus",
  systemDeep: "lock",
};

const CATEGORY_ORDER: JunkCategory[] = [
  "cache",
  "temp",
  "log",
  "obsoleteApk",
  "emptyFolder",
  "other",
  "systemDeep",
];

function groupByCategory(items: JunkItem[]): Map<JunkCategory, JunkItem[]> {
  const map = new Map<JunkCategory, JunkItem[]>();
  for (const it of items) {
    const arr = map.get(it.category) ?? [];
    arr.push(it);
    map.set(it.category, arr);
  }
  return map;
}

export default function JunkScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const toast = useToast();
  const locale = useSettingsStore((s) => s.locale);

  const lastScan = useScanStore((s) => s.lastScan);
  const setLastScan = useScanStore((s) => s.setLastScan);

  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<JunkCategory>>(
    () => new Set(["cache"]),
  );

  const runScan = async () => {
    setScanning(true);
    try {
      const result: JunkScanResult = await scanJunkFiles();
      setLastScan(result);
      // Pre-select everything that is JS-deletable.
      setSelected(
        new Set(
          result.items.filter((i) => !i.requiresNative).map((i) => i.uri),
        ),
      );
    } finally {
      setScanning(false);
    }
  };

  // Auto scan on first mount.
  useEffect(() => {
    void runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(
    () => groupByCategory(lastScan?.items ?? []),
    [lastScan],
  );

  const itemsById = useMemo(() => {
    const m = new Map<string, JunkItem>();
    for (const it of lastScan?.items ?? []) m.set(it.uri, it);
    return m;
  }, [lastScan]);

  const selectedItems = useMemo(
    () =>
      Array.from(selected)
        .map((uri) => itemsById.get(uri))
        .filter((x): x is JunkItem => Boolean(x)),
    [selected, itemsById],
  );

  const totalSelectedBytes = selectedItems.reduce(
    (s, it) => s + it.sizeBytes,
    0,
  );

  const toggleItem = (uri: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  };

  const categoryState = (cat: JunkCategory): CheckboxState => {
    const items = grouped.get(cat) ?? [];
    if (items.length === 0) return "unchecked";
    const sel = items.filter((i) => selected.has(i.uri)).length;
    if (sel === 0) return "unchecked";
    if (sel === items.length) return "checked";
    return "indeterminate";
  };

  const toggleCategory = (cat: JunkCategory) => {
    const items = grouped.get(cat) ?? [];
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((i) => next.has(i.uri));
      if (allSelected) for (const i of items) next.delete(i.uri);
      else for (const i of items) next.add(i.uri);
      return next;
    });
  };

  const toggleExpanded = (cat: JunkCategory) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectAll = () => {
    if (!lastScan) return;
    setSelected(new Set(lastScan.items.map((i) => i.uri)));
  };
  const deselectAll = () => setSelected(new Set());

  const handleClean = async () => {
    if (selectedItems.length === 0) {
      toast.show(t("junkDeep.nothingSelected"), "info");
      return;
    }
    setCleaning(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await cleanJunk(selectedItems);
      if (result.deletedBytes > 0 || result.cleaned > 0) {
        toast.show(
          t("junkDeep.cleanedToast", {
            size: formatBytes(result.deletedBytes, locale),
            count: result.cleaned,
          }),
          "success",
        );
      } else if (result.pendingNative === 0) {
        toast.show(t("junkDeep.cleanedNothing"), "info");
      }
      if (result.pendingNative > 0) {
        toast.show(
          t("junkDeep.pendingNativeToast", { count: result.pendingNative }),
          "warning",
        );
      }
      // Re-scan to refresh sizes & remove cleared items.
      await runScan();
    } finally {
      setCleaning(false);
    }
  };

  const topPad = Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

  // Show radar overlay during the initial scan
  if (scanning && !lastScan) {
    return (
      <View
        style={[
          styles.scanWrap,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("junk.title")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {t("junk.description")}
        </Text>
        <View style={styles.radarBlock}>
          <RadarScanner
            active
            size={220}
            label={t("junkDeep.radarLabel")}
          />
        </View>
      </View>
    );
  }

  const totalBytes = lastScan?.totalBytes ?? 0;
  const itemCount = lastScan?.itemCount ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 16,
          paddingBottom: bottomPad + 88,
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
            {formatBytes(totalBytes, locale)}
          </Text>
          <Text
            style={[styles.summaryLabel, { color: colors.mutedForeground }]}
          >
            {t("junk.found")}{" "}
            {itemCount === 1
              ? t("junk.items_one")
              : t("junk.items_other", {
                  count: formatNumber(itemCount, locale),
                })}
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
              label={
                scanning
                  ? t("junk.scanning")
                  : lastScan
                    ? t("junk.rescan")
                    : t("junk.startScan")
              }
              icon="refresh-ccw"
              variant="secondary"
              onPress={() => void runScan()}
              loading={scanning}
              fullWidth
            />
          </View>
          <View style={styles.bulkRow}>
            <Pressable onPress={selectAll} accessibilityRole="button" accessibilityLabel={t("junkDeep.selectAll")}>
              <Text style={[styles.bulkLink, { color: colors.primary }]}>
                {t("junkDeep.selectAll")}
              </Text>
            </Pressable>
            <Pressable onPress={deselectAll} accessibilityRole="button" accessibilityLabel={t("junkDeep.deselectAll")}>
              <Text style={[styles.bulkLink, { color: colors.mutedForeground }]}>
                {t("junkDeep.deselectAll")}
              </Text>
            </Pressable>
          </View>
        </Card>

        {lastScan && lastScan.itemCount > 0 ? (
          CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
            const items = grouped.get(cat) ?? [];
            const summary = items.reduce(
              (s, it) => ({
                count: s.count + 1,
                bytes: s.bytes + it.sizeBytes,
              }),
              { count: 0, bytes: 0 },
            );
            const isOpen = expanded.has(cat);
            const state = categoryState(cat);
            return (
              <Card key={cat}>
                <View style={styles.catHeader}>
                  <Checkbox
                    state={state}
                    onPress={() => toggleCategory(cat)}
                  />
                  <Pressable
                    onPress={() => toggleExpanded(cat)}
                    style={styles.catHeaderText}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(`junkDeep.categories.${cat}`)}, ${formatBytes(summary.bytes, locale)}`}
                    accessibilityState={{ expanded: isOpen }}
                  >
                    <View
                      style={[
                        styles.catIcon,
                        {
                          backgroundColor: colors.secondary,
                          borderRadius: colors.radius - 6,
                        },
                      ]}
                    >
                      <Feather
                        name={CATEGORY_ICONS[cat]}
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.catTextCol}>
                      <Text
                        style={[
                          styles.catName,
                          { color: colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {t(`junkDeep.categories.${cat}`)}
                      </Text>
                      <Text
                        style={[
                          styles.catMeta,
                          { color: colors.mutedForeground },
                        ]}
                        numberOfLines={1}
                      >
                        {formatBytes(summary.bytes, locale)} ·{" "}
                        {t("junkDeep.selectedCount", {
                          count: formatNumber(summary.count, locale),
                        })}
                      </Text>
                    </View>
                    <Feather
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>

                {isOpen ? (
                  <View style={styles.itemList}>
                    {items.map((it) => (
                      <View key={it.uri} style={styles.itemRow}>
                        <Checkbox
                          state={
                            selected.has(it.uri) ? "checked" : "unchecked"
                          }
                          onPress={() => toggleItem(it.uri)}
                          disabled={it.requiresNative && it.sizeBytes === 0}
                          size={20}
                        />
                        <View style={styles.itemTextCol}>
                          <Text
                            style={[
                              styles.itemName,
                              { color: colors.foreground },
                            ]}
                            numberOfLines={1}
                          >
                            {it.name}
                          </Text>
                          <Text
                            style={[
                              styles.itemMeta,
                              { color: colors.mutedForeground },
                            ]}
                            numberOfLines={1}
                          >
                            {it.sizeBytes > 0
                              ? formatBytes(it.sizeBytes, locale)
                              : "—"}
                          </Text>
                          {it.requiresNative ? (
                            <View
                              style={[
                                styles.badge,
                                {
                                  backgroundColor: colors.warning + "22",
                                  borderRadius: 999,
                                },
                              ]}
                            >
                              <Feather
                                name="lock"
                                size={10}
                                color={colors.warning}
                              />
                              <Text
                                style={[
                                  styles.badgeText,
                                  { color: colors.warning },
                                ]}
                              >
                                {t("junkDeep.requiresNativeBadge")}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          })
        ) : !scanning ? (
          <Card>
            <EmptyState
              icon="check-circle"
              title={t("junk.noResults")}
              description={t("junk.noResultsHint")}
            />
          </Card>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad,
          },
        ]}
      >
        <View style={styles.footerHead}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>
            {t("junkDeep.totalSelected", {
              size: formatBytes(totalSelectedBytes, locale),
            })}
          </Text>
          <Text style={[styles.footerCount, { color: colors.foreground }]}>
            {t("junkDeep.selectedCount", {
              count: formatNumber(selectedItems.length, locale),
            })}
          </Text>
        </View>
        <Button
          label={t("junkDeep.cleanSelected")}
          icon="trash-2"
          variant="primary"
          onPress={() => void handleClean()}
          loading={cleaning}
          disabled={selectedItems.length === 0 || cleaning}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scanWrap: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  radarBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  header: { paddingHorizontal: 4, gap: 4 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    lineHeight: 20,
    textAlign: "center",
  },
  summaryCard: { alignItems: "center", gap: 6 },
  summarySize: {
    fontSize: 40,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  summaryLabel: { fontSize: 14, fontFamily: "Cairo_400Regular" },
  lastScan: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  summaryActions: { width: "100%", marginTop: 12 },
  bulkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  bulkLink: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  catHeaderText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  catIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  catTextCol: { flex: 1, gap: 2 },
  catName: { fontSize: 15, fontFamily: "Cairo_700Bold" },
  catMeta: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  itemList: {
    marginTop: 12,
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(127,127,127,0.18)",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemTextCol: { flex: 1, gap: 2 },
  itemName: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  itemMeta: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  badgeText: { fontSize: 10, fontFamily: "Cairo_600SemiBold" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  footerHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  footerCount: { fontSize: 13, fontFamily: "Cairo_700Bold" },
});
