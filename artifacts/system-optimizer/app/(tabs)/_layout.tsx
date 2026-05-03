import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  hasAllRequired,
  usePermissionsStore,
} from "@/store/permissionsStore";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { t } = useTranslation();

  const onboardingCompleted = usePermissionsStore(
    (s) => s.onboardingCompleted,
  );
  const permissions = usePermissionsStore((s) => s.permissions);

  // Gate the main app behind the permissions onboarding flow.
  if (!onboardingCompleted || !hasAllRequired(permissions)) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Cairo_600SemiBold",
          fontSize: 11,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.card },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.dashboard"),
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="gaming"
        options={{
          title: t("tabs.gaming"),
          tabBarIcon: ({ color }) => (
            <Feather name="play-circle" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="junk"
        options={{
          title: t("tabs.junk"),
          tabBarIcon: ({ color }) => (
            <Feather name="trash-2" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="boost"
        options={{
          title: t("tabs.boost"),
          tabBarIcon: ({ color }) => (
            <Feather name="zap" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="agent"
        options={{
          title: t("tabs.agent"),
          tabBarIcon: ({ color }) => (
            <Feather name="cpu" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="apps"
        options={{
          title: t("tabs.apps"),
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={22} color={color} />
          ),
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen name="cache" options={{ href: null }} />
      <Tabs.Screen name="copilot" options={{ href: null }} />
      <Tabs.Screen name="terminal" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}