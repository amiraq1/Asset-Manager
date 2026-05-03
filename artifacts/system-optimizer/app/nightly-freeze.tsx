import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useColors } from "@/hooks/useColors";
import { getInstalledApps, InstalledApp } from "@/services/DeviceStats";
import {
  getFreezeSettings,
  NightlyFreezeConfig,
  saveFreezeSettings,
} from "@/services/NightlyFreezeManager";
import { NativeModuleUnavailableError } from "@/services/RootShell";

export default function NightlyFreezeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<NightlyFreezeConfig>({
    isEnabled: false,
    startTime: "23:00",
    endTime: "07:00",
    selectedApps: [],
  });

  const [apps, setApps] = useState<InstalledApp[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [loadedConfig, installedApps] = await Promise.all([
          getFreezeSettings(),
          getInstalledApps(),
        ]);
        setConfig(loadedConfig);
        setApps(installedApps);
      } catch (err) {
        toast.show("Failed to load settings.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleApp = (pkg: string) => {
    setConfig((prev) => {
      const isSelected = prev.selectedApps.includes(pkg);
      const newApps = isSelected
        ? prev.selectedApps.filter((p) => p !== pkg)
        : [...prev.selectedApps, pkg];
      return { ...prev, selectedApps: newApps };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFreezeSettings(config);
      toast.show("Nightly schedule applied!", "success");
    } catch (err) {
      if (err instanceof NativeModuleUnavailableError) {
        toast.show("Native module missing: Simulated saving schedule.", "warning");
      } else {
        toast.show("Failed to apply schedule.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // Deep night theme overrides
  const nightBg = "#0b0c16"; // Deep dark purple/blue
  const nightCardBg = "#151828";
  const nightPrimary = "#8b5cf6"; // Violet-500

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: nightBg }]}>
        <ActivityIndicator color={nightPrimary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: nightBg }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
          gap: 20,
        }}
      >
        {/* Hero Section */}
        <Animated.View entering={FadeInDown.duration(500)}>
          <Card style={{ backgroundColor: nightCardBg, borderColor: nightPrimary + "40" }}>
            <View style={styles.heroRow}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Nightly Freeze</Text>
                <Text style={styles.heroSubtitle}>
                  Automatically freeze heavy apps while you sleep to save 100% battery.
                </Text>
              </View>
              <Switch
                value={config.isEnabled}
                onValueChange={(val) => setConfig((prev) => ({ ...prev, isEnabled: val }))}
                trackColor={{ false: colors.muted, true: nightPrimary }}
                thumbColor={"#fff"}
              />
            </View>
            <View style={styles.heroIconWrapper}>
              <Feather name="moon" size={48} color={config.isEnabled ? nightPrimary : colors.muted} />
            </View>
          </Card>
        </Animated.View>

        {config.isEnabled && (
          <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)}>
            {/* Time Scheduler */}
            <Card style={{ backgroundColor: nightCardBg, borderColor: "transparent", marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>Sleep Schedule</Text>
              <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Sleep Time</Text>
                  <View style={styles.timeInput}>
                    <Feather name="clock" size={16} color={nightPrimary} />
                    <Text style={styles.timeText}>{config.startTime}</Text>
                  </View>
                </View>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Wake Time</Text>
                  <View style={styles.timeInput}>
                    <Feather name="sun" size={16} color="#f59e0b" />
                    <Text style={styles.timeText}>{config.endTime}</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* App Selection List */}
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Target Apps</Text>
              <Text style={styles.appCount}>
                {config.selectedApps.length} selected
              </Text>
            </View>

            <Card style={{ backgroundColor: nightCardBg, borderColor: "transparent", padding: 0, overflow: "hidden" }}>
              {apps.map((app, index) => {
                const isSelected = config.selectedApps.includes(app.packageName);
                return (
                  <Pressable
                    key={app.packageName}
                    onPress={() => toggleApp(app.packageName)}
                    style={[
                      styles.appRow,
                      index < apps.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border + "40" },
                      isSelected && { backgroundColor: nightPrimary + "15" },
                    ]}
                  >
                    <View style={[styles.checkbox, isSelected && { backgroundColor: nightPrimary, borderColor: nightPrimary }]}>
                      {isSelected && <Feather name="check" size={14} color="#fff" />}
                    </View>
                    <View style={styles.appInfo}>
                      <Text style={styles.appName} numberOfLines={1}>{app.label}</Text>
                      <Text style={styles.appPkg} numberOfLines={1}>{app.packageName}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </Animated.View>
        )}
      </ScrollView>

      {/* Save Action */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 20, backgroundColor: nightBg }]}>
        <Button
          label="Apply Nightly Schedule"
          icon="check"
          onPress={handleSave}
          loading={saving}
          style={{ backgroundColor: nightPrimary }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: "#a1a1aa", // zinc-400
    lineHeight: 20,
  },
  heroIconWrapper: {
    alignItems: "center",
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: "row",
    gap: 16,
  },
  timeBlock: {
    flex: 1,
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#a1a1aa",
  },
  timeInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b0c16", // darker inset
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#27272a", // zinc-800
  },
  timeText: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  appCount: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: "#8b5cf6",
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#52525b", // zinc-600
    alignItems: "center",
    justifyContent: "center",
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: "#e4e4e7", // zinc-200
  },
  appPkg: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "#71717a", // zinc-500
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#ffffff10",
  },
});
