import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Easing,
  Modal,
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
import {
  forceDropCaches,
  NativeModuleUnavailableError,
} from "@/services/RootShell";
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
  const [kernelModalOpen, setKernelModalOpen] = useState(false);
  const [kernelExecuting, setKernelExecuting] = useState(false);

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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

  const handleKernelDrop = async () => {
    setKernelExecuting(true);
    // Hold the dramatic UI state for ~1.4s before hitting the bridge
    // so the user perceives the gravity of the operation.
    await new Promise((r) => setTimeout(r, 1400));
    try {
      const ok = await forceDropCaches();
      toast.show(
        ok ? t("boost.kernelSuccess") : t("boost.kernelFailed"),
        ok ? "success" : "error",
      );
    } catch (err) {
      if (err instanceof NativeModuleUnavailableError) {
        toast.show(err.message, "warning");
      } else {
        toast.show(t("boost.kernelFailed"), "error");
      }
    } finally {
      setKernelExecuting(false);
      setKernelModalOpen(false);
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

        <DangerZone
          onPress={() => setKernelModalOpen(true)}
          disabled={boosting || kernelExecuting}
        />
      </ScrollView>

      <KernelConfirmModal
        visible={kernelModalOpen}
        executing={kernelExecuting}
        onCancel={() => {
          if (!kernelExecuting) setKernelModalOpen(false);
        }}
        onExecute={() => void handleKernelDrop()}
      />

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
        accessibilityRole="checkbox"
        accessibilityLabel={`${app.appName}, ${app.ramMb} MB`}
        accessibilityState={{ checked: selected, disabled }}
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

function DangerZone({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const DANGER = colors.destructive;

  return (
    <View style={dz.wrap}>
      <View style={dz.headerRow}>
        <View style={[dz.headerStripe, { backgroundColor: DANGER }]} />
        <Text style={[dz.headerLabel, { color: DANGER }]}>
          {t("boost.dangerZone")}
        </Text>
        <View style={[dz.headerStripe, { backgroundColor: DANGER }]} />
      </View>
      <Text style={[dz.hint, { color: colors.mutedForeground }]}>
        {t("boost.dangerZoneHint")}
      </Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          dz.btn,
          {
            backgroundColor: DANGER,
            borderColor: DANGER,
            borderRadius: colors.radius,
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={dz.btnIconBubble}>
          <Feather name="alert-triangle" size={22} color="#FFFFFF" />
        </View>
        <View style={dz.btnTextCol}>
          <Text style={dz.btnTitle}>{t("boost.kernelDrop")}</Text>
          <Text style={dz.btnSubtitle}>
            {t("boost.kernelDropSubtitle")}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function KernelConfirmModal({
  visible,
  executing,
  onCancel,
  onExecute,
}: {
  visible: boolean;
  executing: boolean;
  onCancel: () => void;
  onExecute: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const DANGER = colors.destructive;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!executing) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 450,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 450,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [executing, pulse]);

  const borderWidth = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 4],
  });
  const borderOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  // Force a dark, dramatic surface regardless of theme.
  const SURFACE = "#0B0B0F";
  const SURFACE_BORDER = "#1F1F26";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={mdl.backdrop}>
        <Animated.View
          style={[
            mdl.card,
            {
              backgroundColor: SURFACE,
              borderColor: executing ? DANGER : SURFACE_BORDER,
              borderWidth: executing ? borderWidth : 1,
              opacity: executing ? borderOpacity : 1,
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={[mdl.iconBubble, { backgroundColor: DANGER + "22" }]}>
            <Feather name="alert-triangle" size={28} color={DANGER} />
          </View>
          <Text style={[mdl.title, { color: DANGER }]}>
            {t("boost.confirmTitle")}
          </Text>
          <Text style={[mdl.body, { color: "#D4D4DC" }]}>
            {t("boost.confirmBody")}
          </Text>

          {executing ? (
            <View style={mdl.executingRow}>
              <Feather name="zap" size={14} color={DANGER} />
              <Text style={[mdl.executingText, { color: DANGER }]}>
                {t("boost.executing")}
              </Text>
            </View>
          ) : (
            <View style={mdl.actions}>
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [
                  mdl.actionBtn,
                  mdl.cancelBtn,
                  {
                    borderColor: "#3A3A45",
                    backgroundColor: pressed ? "#1A1A22" : "transparent",
                    borderRadius: colors.radius - 4,
                  },
                ]}
              >
                <Text style={[mdl.actionLabel, { color: "#A0A0AE" }]}>
                  {t("boost.cancel")}
                </Text>
              </Pressable>
              <Pressable
                onPress={onExecute}
                style={({ pressed }) => [
                  mdl.actionBtn,
                  mdl.executeBtn,
                  {
                    backgroundColor: DANGER,
                    borderRadius: colors.radius - 4,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="zap" size={16} color="#FFFFFF" />
                <Text style={[mdl.actionLabel, { color: "#FFFFFF" }]}>
                  {t("boost.execute")}
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
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

const dz = StyleSheet.create({
  wrap: { gap: 10, paddingTop: 8 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  headerStripe: { flex: 1, height: 1, opacity: 0.5 },
  headerLabel: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  hint: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    minHeight: 72,
  },
  btnIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTextCol: { flex: 1, gap: 2 },
  btnTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    color: "#FFFFFF",
  },
  btnSubtitle: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: "rgba(255,255,255,0.85)",
  },
});

const mdl = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
  },
  cancelBtn: { borderWidth: 1 },
  executeBtn: {},
  actionLabel: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 0.8,
  },
  executingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
  },
  executingText: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 0.8,
  },
});
