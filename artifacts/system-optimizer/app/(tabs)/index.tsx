import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatTile } from "@/components/ui/StatTile";
import { useBatteryInfo, useDeviceInfo } from "@/hooks/useDeviceInfo";
import { useStorageInfo } from "@/hooks/useStorageInfo";
import { useColors } from "@/hooks/useColors";
import { useSettingsStore } from "@/store/settingsStore";
import { formatBytes, formatPercent } from "@/utils/format";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);

  const storage = useStorageInfo();
  const device = useDeviceInfo();
  const battery = useBatteryInfo();

  const onRefresh = useCallback(() => {
    void storage.refetch();
    void device.refetch();
  }, [storage, device]);

  const topPad =
    Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

  const used = storage.data?.usedBytes ?? 0;
  const total = storage.data?.totalBytes ?? 0;
  const free = storage.data?.freeBytes ?? 0;
  const percent = storage.data?.usedPercent ?? 0;

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
          refreshing={storage.isFetching || device.isFetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("dashboard.title")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {t("dashboard.subtitle")}
        </Text>
      </View>

      <Card style={styles.storageCard}>
        <SectionHeader title={t("dashboard.storage")} />
        <View style={styles.ringRow}>
          <ProgressRing
            progress={percent}
            centerLabel={formatPercent(percent, locale)}
            centerSub={t("dashboard.storage")}
            color={
              percent > 0.9
                ? colors.danger
                : percent > 0.75
                  ? colors.warning
                  : colors.primary
            }
          />
        </View>
        <Text style={[styles.storageDetail, { color: colors.mutedForeground }]}>
          {t("dashboard.storageUsed", {
            used: formatBytes(used, locale),
            total: formatBytes(total, locale),
          })}
        </Text>
      </Card>

      <View style={styles.tilesRow}>
        <StatTile
          icon="hard-drive"
          label={t("dashboard.storage")}
          value={formatBytes(free, locale)}
          helper={t("common.notAvailable") && undefined}
          accentColor={colors.accent}
        />
        <StatTile
          icon="cpu"
          label={t("dashboard.ram")}
          value={
            device.data?.totalMemoryBytes
              ? formatBytes(device.data.totalMemoryBytes, locale)
              : t("common.notAvailable")
          }
          accentColor={colors.primary}
        />
      </View>

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
        <View style={styles.actionsCol}>
          <Button
            label={t("dashboard.scanNow")}
            icon="search"
            onPress={() => router.push("/junk")}
            fullWidth
          />
          <Button
            label={t("dashboard.cleanCache")}
            icon="trash-2"
            variant="secondary"
            onPress={() => router.push("/cache")}
            fullWidth
          />
          <Button
            label={t("dashboard.manageApps")}
            icon="grid"
            variant="secondary"
            onPress={() => router.push("/apps")}
            fullWidth
          />
        </View>
      </Card>

      {device.data ? (
        <Card>
          <SectionHeader title={t("dashboard.deviceInfo")} />
          <View style={styles.infoCol}>
            <InfoRow label={t("dashboard.deviceInfo")} value={
              [device.data.brand, device.data.modelName]
                .filter(Boolean)
                .join(" ")
                || t("common.notAvailable")
            } />
            <InfoRow
              label="OS"
              value={
                device.data.osName && device.data.osVersion
                  ? `${device.data.osName} ${device.data.osVersion}`
                  : t("common.notAvailable")
              }
            />
            <InfoRow
              label={t("dashboard.ramTotal")}
              value={
                device.data.totalMemoryBytes
                  ? formatBytes(device.data.totalMemoryBytes, locale)
                  : t("common.notAvailable")
              }
            />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.infoValue, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, gap: 4 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
  },
  storageCard: { alignItems: "center", gap: 16 },
  ringRow: { paddingVertical: 8 },
  storageDetail: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
  },
  tilesRow: { flexDirection: "row", gap: 12 },
  actionsCol: { gap: 10 },
  infoCol: { gap: 10 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    flexShrink: 1,
    textAlign: "right",
  },
});
