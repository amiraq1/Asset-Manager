import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAvatar } from "@/components/ui/AppAvatar";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { useColors } from "@/hooks/useColors";
import { boostRam, getRunningApps, type RunningApp } from "@/services/TaskManager";
import { useSettingsStore } from "@/store/settingsStore";
import { formatNumber } from "@/utils/format";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

export default function BoostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const toast = useToast();
  const locale = useSettingsStore((s) => s.locale);

  const [apps, setApps] = useState<RunningApp[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [boosting, setBoosting] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const list = await getRunningApps();
      setApps(list);
      // Pre-select everything so the primary action is one tap.
      setSelected(new Set(list.map((a) => a.packageName)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = (pkg: string) => {
    if (boosting) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  };

  const totalSelectedMb = useMemo(
    () =>
      apps
        .filter((a) => selected.has(a.packageName))
        .reduce((s, a) => s + a.ramMb, 0),
    [apps, selected],
  );

  const handleBoost = async () => {
    if (boosting) return;
    const targets = apps.filter((a) => selected.has(a.packageName));
    if (targets.length === 0) {
      toast.show(t("boost.nothingSelected"), "info");
      return;
    }
    setBoosting(true);

    // Sequential fade-out: mark each target as "removing" with a small
    // stagger so the user sees them disappear one after another.
    for (let i = 0; i < targets.length; i += 1) {
      const pkg = targets[i].packageName;
      setRemoving((prev) => {
        const next = new Set(prev);
        next.add(pkg);
        return next;
      });
      // small delay between each so the eye perceives the cascade
      // 120ms feels snappy but visible
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 120));
    }

    try {
      const result = await boostRam(targets.map((a) => a.packageName));
      // Drop the boosted apps from the list now that animation is done.
      setApps((prev) =>
        prev.filter((a) => !result.stoppedPackages.includes(a.packageName)),
      );
      setSelected((prev) => {
        const next = new Set(prev);
        for (const p of result.stoppedPackages) next.delete(p);
        return next;
      });
      setRemoving(new Set());

      if (result.freedMb > 0) {
        toast.show(
          t("boost.boostedToast", {
            mb: formatNumber(result.freedMb, locale),
          }),
          "success",
        );
      } else {
        toast.show(t("boost.nothingFreed"), "info");
      }
      if (result.failedPackages.length > 0) {
        toast.show(
          t("boost.someFailed", {
            count: result.failedPackages.length,
          }),
          "warning",
        );
      }
    } finally {
      setBoosting(false);
    }
  };

  const topPad = Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

  const totalRamMb = apps.reduce((s, a) => s + a.ramMb, 0);
  const isFallback = apps.length > 0 && apps[0].isFallback;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 16,
          paddingBottom: bottomPad + 120,
          gap: 16,
        }}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t("boost.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t("boost.subtitle")}
          </Text>
        </View>

        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: colors.foreground }]}>
            {formatNumber(totalRamMb, locale)}
            <Text
              style={[styles.summaryUnit, { color: colors.mutedForeground }]}
            >
              {" "}MB
            </Text>
          </Text>
          <Text
            style={[styles.summaryLabel, { color: colors.mutedForeground }]}
          >
            {t("boost.summaryLabel", { count: apps.length })}
          </Text>
          {isFallback ? (
            <Text style={[styles.fallbackNote, { color: colors.warning }]}>
              {t("boost.fallbackNotice")}
            </Text>
          ) : null}
        </Card>

        {loading ? (
          <Card>
            <Text
              style={[styles.loading, { color: colors.mutedForeground }]}
            >
              {t("common.loading")}
            </Text>
          </Card>
        ) : apps.length === 0 ? (
          <Card>
            <Text
              style={[styles.loading, { color: colors.mutedForeground }]}
            >
              {t("boost.allClean")}
            </Text>
          </Card>
        ) : (
          <Card padded={false}>
            {apps.map((app, idx) => (
              <AppRow
                key={app.packageName}
                app={app}
                selected={selected.has(app.packageName)}
                onToggle={() => toggle(app.packageName)}
                removing={removing.has(app.packageName)}
                isLast={idx === apps.length - 1}
                disabled={boosting}
              />
            ))}
          </Card>
        )}
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
            {t("boost.selectedSize", {
              mb: formatNumber(totalSelectedMb, locale),
            })}
          </Text>
          <Text style={[styles.footerCount, { color: colors.foreground }]}>
            {t("boost.selectedCount", {
              count: formatNumber(selected.size, locale),
            })}
          </Text>
        </View>
        <BoostButton
          loading={boosting}
          disabled={selected.size === 0 || boosting}
          onPress={() => void handleBoost()}
          label={
            boosting ? t("boost.boosting") : t("boost.boostNow")
          }
        />
      </View>
    </View>
  );
}

function AppRow({
  app,
  selected,
  onToggle,
  removing,
  isLast,
  disabled,
}: {
  app: RunningApp;
  selected: boolean;
  onToggle: () => void;
  removing: boolean;
  isLast: boolean;
  disabled: boolean;
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (removing) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 60,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [removing, opacity, translateX]);

  return (
    <Animated.View
      style={[
        styles.row,
        {
          borderBottomColor: colors.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          opacity,
          transform: [{ translateX }],
        },
      ]}
    >
      <Pressable
        style={styles.rowInner}
        onPress={onToggle}
        disabled={disabled}
      >
        <Checkbox
          state={selected ? "checked" : "unchecked"}
          onPress={onToggle}
          disabled={disabled}
          size={20}
        />
        <AppAvatar name={app.appName} packageName={app.packageName} />
        <View style={styles.rowText}>
          <Text
            style={[styles.appName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {app.appName}
          </Text>
          <Text
            style={[styles.appPkg, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {app.packageName}
          </Text>
        </View>
        <View style={styles.ramCol}>
          <Text
            style={[styles.ramValue, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {app.ramMb} MB
          </Text>
          <Feather name="cpu" size={11} color={colors.mutedForeground} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function BoostButton({
  loading,
  disabled,
  onPress,
  label,
}: {
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (disabled || loading) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [disabled, loading, pulse]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.boostBtn,
        {
          backgroundColor: colors.primary,
          borderRadius: colors.radius,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.boostIconWrap}>
        {!disabled && !loading ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.boostPulse,
              {
                backgroundColor: colors.primaryForeground,
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
        ) : null}
        <View
          style={[
            styles.boostIconBubble,
            { backgroundColor: colors.primaryForeground + "22" },
          ]}
        >
          <Feather
            name={loading ? "loader" : "zap"}
            size={22}
            color={colors.primaryForeground}
          />
        </View>
      </View>
      <Text
        style={[styles.boostLabel, { color: colors.primaryForeground }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, gap: 4 },
  title: { fontSize: 28, fontWeight: "700", fontFamily: "Cairo_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Cairo_400Regular", lineHeight: 20 },
  summaryCard: { alignItems: "center", gap: 4 },
  summaryNumber: { fontSize: 44, fontFamily: "Cairo_700Bold" },
  summaryUnit: { fontSize: 18, fontFamily: "Cairo_600SemiBold" },
  summaryLabel: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  fallbackNote: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 12,
    lineHeight: 16,
  },
  loading: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    paddingVertical: 24,
  },
  row: {
    paddingHorizontal: 16,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  rowText: { flex: 1, gap: 2 },
  appName: { fontSize: 14, fontFamily: "Cairo_700Bold" },
  appPkg: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  ramCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  ramValue: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  footerHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  footerCount: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 56,
  },
  boostIconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  boostIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  boostPulse: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 999,
  },
  boostLabel: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
  },
});
