import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useToast } from "@/components/ui/Toast";
import { useColors } from "@/hooks/useColors";
import { runShortcut, SYSTEM_SHORTCUTS } from "@/services/AppManagerService";
import {
  clearAppCache,
  forceStopApp,
  suspendApp,
  unsuspendApp,
  enableApp,
  isValidPackageName,
  NativeModuleUnavailableError,
} from "@/services/RootShell";
import { useSettingsStore } from "@/store/settingsStore";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

type RootAction = "forceStop" | "clearCache" | "suspendApp" | "unsuspendApp" | "enableApp";

export default function AppsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const toast = useToast();
  const locale = useSettingsStore((s) => s.locale);

  const [pkg, setPkg] = useState("");
  const [pending, setPending] = useState<RootAction | null>(null);

  const topPad = Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

  const isAndroid = Platform.OS === "android";

  const runRootAction = async (action: RootAction) => {
    const pkgTrim = pkg.trim();
    if (!isValidPackageName(pkgTrim)) {
      toast.show(t("rootShell.invalidPackage"), "warning");
      return;
    }
    setPending(action);
    try {
      const fn =
        action === "forceStop"
          ? forceStopApp
          : action === "clearCache"
            ? clearAppCache
            : action === "suspendApp"
              ? suspendApp
              : action === "unsuspendApp"
                ? unsuspendApp
                : enableApp;
      const ok = await fn(pkgTrim);
      toast.show(
        t(ok ? "rootShell.success" : "rootShell.failed", { pkg: pkgTrim }),
        ok ? "success" : "error",
      );
    } catch (err) {
      if (err instanceof NativeModuleUnavailableError) {
        toast.show(t("rootShell.nativeRequired"), "warning");
      } else {
        toast.show(
          t("rootShell.failed", { pkg: pkgTrim }),
          "error",
        );
      }
    } finally {
      setPending(null);
    }
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
      keyboardShouldPersistTaps="handled"
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
        <SectionHeader
          title={t("rootShell.sectionTitle")}
          subtitle={t("rootShell.sectionDescription")}
        />
        <Text
          style={[styles.inputLabel, { color: colors.mutedForeground }]}
        >
          {t("rootShell.packageLabel")}
        </Text>
        <TextInput
          value={pkg}
          onChangeText={setPkg}
          placeholder={t("rootShell.packagePlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType={Platform.OS === "ios" ? "url" : "default"}
          textAlign={locale === "ar" ? "right" : "left"}
          accessibilityLabel={t("rootShell.packageLabel")}
          accessibilityHint={t("rootShell.packagePlaceholder")}
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.muted,
              borderRadius: colors.radius - 6,
            },
          ]}
        />
        <View style={styles.actionsCol}>
          <View style={styles.actionsRow}>
            <View style={styles.actionItem}>
              <Button
                label={t("rootShell.forceStop")}
                icon="stop-circle"
                variant="danger"
                fullWidth
                loading={pending === "forceStop"}
                disabled={pending !== null}
                onPress={() => void runRootAction("forceStop")}
              />
            </View>
            <View style={styles.actionItem}>
              <Button
                label={t("rootShell.clearCache")}
                icon="trash-2"
                variant="secondary"
                fullWidth
                loading={pending === "clearCache"}
                disabled={pending !== null}
                onPress={() => void runRootAction("clearCache")}
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.actionItem}>
              <Button
                label={t("rootShell.suspend")}
                icon="pause-circle"
                variant="secondary"
                fullWidth
                loading={pending === "suspendApp"}
                disabled={pending !== null}
                onPress={() => void runRootAction("suspendApp")}
              />
            </View>
            <View style={styles.actionItem}>
              <Button
                label={t("rootShell.unsuspend")}
                icon="play-circle"
                variant="secondary"
                fullWidth
                loading={pending === "unsuspendApp"}
                disabled={pending !== null}
                onPress={() => void runRootAction("unsuspendApp")}
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.actionItem}>
              <Button
                label={t("rootShell.enable")}
                icon="check-circle"
                variant="secondary"
                fullWidth
                loading={pending === "enableApp"}
                disabled={pending !== null}
                onPress={() => void runRootAction("enableApp")}
              />
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <SectionHeader title={t("apps.deepLinksTitle")} />
        {isAndroid ? (
          <View style={styles.actionsCol}>
            {SYSTEM_SHORTCUTS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => void runShortcut(s)}
                accessibilityRole="button"
                accessibilityLabel={t(s.titleKey)}
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
  inputLabel: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    marginBottom: 12,
  },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionItem: { flex: 1 },
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
