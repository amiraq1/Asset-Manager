import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
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
import { useColors } from "@/hooks/useColors";
import {
  isNativeBridgeAvailable,
  requestPermission,
  type DeepPermissionKey,
} from "@/services/DeepPermissions";
import {
  hasAllRequired,
  REQUIRED_PERMISSIONS,
  usePermissionsStore,
} from "@/store/permissionsStore";

interface PermissionDef {
  key: DeepPermissionKey;
  icon: keyof typeof Feather.glyphMap;
  required: boolean;
}

const PERMISSIONS: PermissionDef[] = [
  { key: "usageStats", icon: "bar-chart-2", required: true },
  { key: "manageStorage", icon: "hard-drive", required: true },
  { key: "accessibility", icon: "shield", required: false },
  { key: "root", icon: "terminal", required: false },
];

const WEB_TOP_INSET = 67;

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  const permissions = usePermissionsStore((s) => s.permissions);
  const setStatus = usePermissionsStore((s) => s.setStatus);
  const completeOnboarding = usePermissionsStore((s) => s.completeOnboarding);
  const onboardingCompleted = usePermissionsStore(
    (s) => s.onboardingCompleted,
  );

  const [pendingKey, setPendingKey] = useState<DeepPermissionKey | null>(null);

  if (onboardingCompleted) {
    return <Redirect href="/" />;
  }

  const handleRequest = async (key: DeepPermissionKey) => {
    if (pendingKey) return;
    setPendingKey(key);
    try {
      const granted = await requestPermission(key);
      setStatus(key, granted ? "granted" : "denied");
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          granted
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
      }
    } finally {
      setPendingKey(null);
    }
  };

  const handleContinue = () => {
    completeOnboarding();
    router.replace("/");
  };

  const allRequiredGranted = hasAllRequired(permissions);
  const grantedCount = Object.values(permissions).filter(
    (s) => s === "granted",
  ).length;
  const requiredGrantedCount = REQUIRED_PERMISSIONS.filter(
    (k) => permissions[k] === "granted",
  ).length;

  const topPad = Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 24;
  const bottomPad = insets.bottom + 24;

  const nativeAvailable = isNativeBridgeAvailable();

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
        <View style={styles.hero}>
          <View
            style={[
              styles.heroIcon,
              {
                backgroundColor: colors.primary + "22",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="shield" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t("onboarding.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t("onboarding.subtitle")}
          </Text>
          <Text
            style={[styles.progress, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {t("onboarding.progress", {
              granted: grantedCount,
              total: PERMISSIONS.length,
            })}
          </Text>
        </View>

        {!nativeAvailable ? (
          <Card>
            <View style={styles.devNote}>
              <Feather name="alert-triangle" size={18} color={colors.warning} />
              <Text
                style={[styles.devNoteText, { color: colors.mutedForeground }]}
              >
                {t("onboarding.devSimulation")}
              </Text>
            </View>
          </Card>
        ) : null}

        {PERMISSIONS.map((p) => {
          const status = permissions[p.key];
          const isGranted = status === "granted";
          const isPending = pendingKey === p.key;
          return (
            <Card key={p.key}>
              <View style={styles.permRow}>
                <View
                  style={[
                    styles.permIcon,
                    {
                      backgroundColor: isGranted
                        ? colors.success + "22"
                        : colors.secondary,
                      borderRadius: colors.radius - 4,
                    },
                  ]}
                >
                  <Feather
                    name={p.icon}
                    size={20}
                    color={isGranted ? colors.success : colors.primary}
                  />
                </View>
                <View style={styles.permText}>
                  <View style={styles.permHeader}>
                    <Text
                      style={[styles.permName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {t(`onboarding.permissions.${p.key}.name`)}
                    </Text>
                    {p.required ? (
                      <View
                        style={[
                          styles.requiredBadge,
                          {
                            backgroundColor: colors.danger + "22",
                            borderRadius: 999,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.requiredBadgeText,
                            { color: colors.danger },
                          ]}
                        >
                          {t("onboarding.required")}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.permWhy,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {t(`onboarding.permissions.${p.key}.why`)}
                  </Text>
                </View>
              </View>

              <View style={styles.permActions}>
                <PermissionToggle
                  granted={isGranted}
                  loading={isPending}
                  onPress={() => void handleRequest(p.key)}
                />
              </View>
            </Card>
          );
        })}

        <Card>
          <View style={styles.devNote}>
            <Feather name="info" size={18} color={colors.primary} />
            <Text
              style={[styles.devNoteText, { color: colors.mutedForeground }]}
            >
              {t("onboarding.requirementHint", {
                count: requiredGrantedCount,
                total: REQUIRED_PERMISSIONS.length,
              })}
            </Text>
          </View>
        </Card>
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
        <Button
          label={t("onboarding.continue")}
          icon="arrow-left"
          onPress={handleContinue}
          disabled={!allRequiredGranted}
          fullWidth
        />
      </View>
    </View>
  );
}

function PermissionToggle({
  granted,
  loading,
  onPress,
}: {
  granted: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.toggle,
        {
          borderColor: granted ? colors.success : colors.border,
          backgroundColor: granted
            ? colors.success
            : pressed
              ? colors.muted
              : "transparent",
          borderRadius: colors.radius - 6,
          opacity: loading ? 0.6 : 1,
        },
      ]}
    >
      <Feather
        name={granted ? "check" : loading ? "loader" : "plus"}
        size={16}
        color={granted ? colors.primaryForeground : colors.foreground}
      />
      <Text
        style={[
          styles.toggleLabel,
          { color: granted ? colors.primaryForeground : colors.foreground },
        ]}
      >
        {granted
          ? t("onboarding.granted")
          : loading
            ? t("onboarding.requesting")
            : t("onboarding.grant")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  heroIcon: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  progress: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    marginTop: 4,
  },
  devNote: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  devNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    lineHeight: 18,
  },
  permRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  permIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  permText: { flex: 1, gap: 4 },
  permHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  permName: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    flexShrink: 1,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontFamily: "Cairo_600SemiBold",
  },
  permWhy: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    lineHeight: 18,
  },
  permActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toggleLabel: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
