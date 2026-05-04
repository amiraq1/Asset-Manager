import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatTile } from "@/components/ui/StatTile";
import { useToast } from "@/components/ui/Toast";
import { useBatteryInfo, useDeviceInfo } from "@/hooks/useDeviceInfo";
import { useColors } from "@/hooks/useColors";
import {
  getRamUsage,
  getStorageStats,
  runQuickOptimize,
} from "@/services/DeviceStats";
import { useSettingsStore } from "@/store/settingsStore";
import { formatBytes, formatPercent } from "@/utils/format";

import { useIsFocused } from "@react-navigation/native";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const locale = useSettingsStore((s) => s.locale);
  const isFocused = useIsFocused();

  const ram = useQuery({
    queryKey: ["ramUsage"],
    queryFn: getRamUsage,
    refetchInterval: isFocused ? 8000 : false,
  });
  const storage = useQuery({
    queryKey: ["storageStats"],
    queryFn: getStorageStats,
    refetchInterval: isFocused ? 30000 : false,
  });
  const device = useDeviceInfo();
  const battery = useBatteryInfo();

  const [optimizing, setOptimizing] = useState(false);

  const onRefresh = useCallback(() => {
    void ram.refetch();
    void storage.refetch();
    void device.refetch();
  }, [ram, storage, device]);

  const handleOptimize = useCallback(async () => {
    if (optimizing) return;
    setOptimizing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await runQuickOptimize();
      void ram.refetch();
      void storage.refetch();
      if (result.bytesFreed > 0) {
        toast.show(
          t("optimizer.optimizeDone", {
            freed: formatBytes(result.bytesFreed, locale),
            count: result.itemsCleaned,
          }),
          "success",
        );
      } else {
        toast.show(t("optimizer.optimizeNothing"), "info");
      }
    } catch {
      toast.show(t("optimizer.optimizeFailed"), "error");
    } finally {
      setOptimizing(false);
    }
  }, [optimizing, ram, storage, toast, t, locale]);

  const topPad =
    Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

  const ramRatio = ram.data?.usedRatio ?? 0;
  const storageRatio = storage.data?.usedRatio ?? 0;
  const ramIsEstimate = ram.data?.source === "estimate";

  const ringColor = (ratio: number) =>
    ratio > 0.9
      ? colors.danger
      : ratio > 0.75
        ? colors.warning
        : colors.primary;

  const batteryStateLabel = (() => {
    switch (battery.info.state) {
      case "charging":
        return t("dashboard.batteryCharging");
      case "full":
        return t("dashboard.batteryFull");
      case "unplugged":
        return t("dashboard.batteryUnplugged");
      default:
        return t("dashboard.batteryUnknown");
    }
  })();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad,
        paddingHorizontal: 16,
        paddingBottom: bottomPad,
        gap: 16,
      }}
      refreshControl={
        <RefreshControl
          refreshing={ram.isFetching || storage.isFetching || device.isFetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("dashboard.title")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {t("dashboard.subtitle")}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel={t("dashboard.settings", { defaultValue: "Settings" })}
            style={({ pressed }) => [
              styles.headerIconButton,
              { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Feather name="settings" size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* Hero metrics: animated RAM + Storage rings side-by-side */}
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <MetricRing
            label={t("optimizer.ramUsed")}
            icon="cpu"
            ratio={ramRatio}
            centerLabel={formatPercent(ramRatio, locale)}
            color={ringColor(ramRatio)}
            footerPrimary={
              ram.data?.totalBytes
                ? `${formatBytes(ram.data.usedBytes, locale)} / ${formatBytes(ram.data.totalBytes, locale)}`
                : t("common.notAvailable")
            }
            footerSecondary={
              ramIsEstimate ? t("optimizer.estimatedNotice") : undefined
            }
          />
          <MetricRing
            label={t("optimizer.storageUsed")}
            icon="hard-drive"
            ratio={storageRatio}
            centerLabel={formatPercent(storageRatio, locale)}
            color={ringColor(storageRatio)}
            footerPrimary={
              storage.data?.totalBytes
                ? `${formatBytes(storage.data.usedBytes, locale)} / ${formatBytes(storage.data.totalBytes, locale)}`
                : t("common.notAvailable")
            }
            footerSecondary={
              storage.data
                ? `${formatBytes(storage.data.freeBytes, locale)} ${t("optimizer.free")}`
                : undefined
            }
          />
        </View>
      </Card>

      {/* Hero Quick-Optimize button */}
      <QuickOptimizeButton
        loading={optimizing}
        onPress={() => void handleOptimize()}
      />

      <View style={styles.tilesRow}>
        <StatTile
          icon={
            battery.info.state === "charging" ? "battery-charging" : "battery"
          }
          label={t("dashboard.battery")}
          value={formatPercent(battery.info.level, locale)}
          helper={
            battery.info.lowPowerMode
              ? t("dashboard.lowPowerMode")
              : batteryStateLabel
          }
          accentColor={
            battery.info.level < 0.2 ? colors.danger : colors.success
          }
        />
        <StatTile
          icon="smartphone"
          label={t("dashboard.deviceInfo")}
          value={
            device.data?.modelName ?? device.data?.brand ?? t("common.notAvailable")
          }
          helper={
            device.data?.osName && device.data?.osVersion
              ? `${device.data.osName} ${device.data.osVersion}`
              : undefined
          }
          accentColor={colors.accent}
        />
      </View>

      <Card>
        <SectionHeader title={t("dashboard.quickActions")} />
        <View style={styles.quickGrid}>
          <QuickAction
            icon="search"
            label={t("dashboard.scanNow")}
            onPress={() => router.push("/junk")}
          />
          <QuickAction
            icon="zap"
            label={t("tabs.boost")}
            onPress={() => router.push("/boost")}
          />
          <QuickAction
            icon="grid"
            label={t("dashboard.manageApps")}
            onPress={() => router.push("/apps")}
          />
          <QuickAction
            icon="message-square"
            label={t("tabs.copilot")}
            onPress={() => router.push("/copilot")}
          />
          <QuickAction
            icon="terminal"
            label={t("tabs.terminal")}
            onPress={() => router.push("/terminal")}
          />
          <QuickAction
            icon="crosshair"
            label="Deep Gaming"
            onPress={() => router.push("/gaming")}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

function MetricRing({
  label,
  icon,
  ratio,
  centerLabel,
  color,
  footerPrimary,
  footerSecondary,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  ratio: number;
  centerLabel: string;
  color: string;
  footerPrimary: string;
  footerSecondary?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={styles.metricCol}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`${label} ${centerLabel}, ${footerPrimary}${footerSecondary ? `, ${footerSecondary}` : ""}`}
    >
      <View style={styles.metricHeader} importantForAccessibility="no-hide-descendants">
        <Feather name={icon} size={14} color={colors.mutedForeground} />
        <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <ProgressRing
        progress={ratio}
        size={130}
        strokeWidth={11}
        centerLabel={centerLabel}
        color={color}
      />
      <Text
        style={[styles.metricFooter, { color: colors.foreground }]}
        numberOfLines={1}
        importantForAccessibility="no"
      >
        {footerPrimary}
      </Text>
      {footerSecondary ? (
        <Text
          style={[styles.metricNote, { color: colors.mutedForeground }]}
          numberOfLines={3}
          importantForAccessibility="no"
        >
          {footerSecondary}
        </Text>
      ) : null}
    </View>
  );
}

function QuickOptimizeButton({
  loading,
  onPress,
}: {
  loading: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={loading ? t("optimizer.optimizing") : t("optimizer.quickOptimize")}
      accessibilityState={{ disabled: loading, busy: loading }}
      style={({ pressed }) => [
        styles.optimizeBtn,
        {
          backgroundColor: colors.primary,
          borderRadius: colors.radius,
          opacity: loading ? 0.85 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.optimizeIconBubble,
          { backgroundColor: colors.primaryForeground + "22" },
        ]}
      >
        <Feather
          name={loading ? "loader" : "zap"}
          size={22}
          color={colors.primaryForeground}
        />
      </View>
      <View style={styles.optimizeTextCol}>
        <Text
          style={[styles.optimizeLabel, { color: colors.primaryForeground }]}
          numberOfLines={1}
        >
          {loading ? t("optimizer.optimizing") : t("optimizer.quickOptimize")}
        </Text>
        <Text
          style={[
            styles.optimizeHint,
            { color: colors.primaryForeground, opacity: 0.85 },
          ]}
          numberOfLines={1}
        >
          {t("dashboard.subtitle")}
        </Text>
      </View>
    </Pressable>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: pressed ? colors.muted : colors.secondary,
          borderColor: colors.border,
          borderRadius: colors.radius - 4,
        },
      ]}
    >
      <View
        style={[
          styles.quickActionIcon,
          {
            backgroundColor: colors.background,
            borderRadius: colors.radius - 6,
          },
        ]}
      >
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <Text
        style={[styles.quickActionLabel, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, gap: 4 },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
  },
  heroCard: { paddingVertical: 16 },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    gap: 8,
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
  },
  metricFooter: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "center",
    marginTop: 2,
  },
  metricNote: {
    fontSize: 10,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    paddingHorizontal: 6,
    lineHeight: 14,
  },
  optimizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    minHeight: 76,
  },
  optimizeIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  optimizeTextCol: { flex: 1, gap: 2 },
  optimizeLabel: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
  },
  optimizeHint: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
  },
  tilesRow: { flexDirection: "row", gap: 12 },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickAction: {
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
  },
});
