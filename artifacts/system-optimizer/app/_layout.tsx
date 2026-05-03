import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from "@expo-google-fonts/cairo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { reloadAppAsync } from "expo";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { I18nManager, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nextProvider } from "react-i18next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import i18n, { initI18n, isRTL } from "@/i18n";
import { useSettingsStore } from "@/store/settingsStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const locale = useSettingsStore((s) => s.locale);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const [i18nReady, setI18nReady] = useState(false);

  // Wait for store rehydration before initializing i18n with the
  // persisted locale, so we never flip languages mid-render.
  useEffect(() => {
    if (!hydrated) return;
    let mounted = true;
    initI18n(locale).then(() => {
      if (mounted) setI18nReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [hydrated, locale]);

  // Apply RTL once i18n is ready and only when the direction actually
  // needs to change. Includes web (sets document direction).
  useEffect(() => {
    if (!i18nReady) return;
    const shouldBeRTL = isRTL(locale);
    if (Platform.OS === "web") {
      if (typeof document !== "undefined") {
        document.documentElement.dir = shouldBeRTL ? "rtl" : "ltr";
      }
      return;
    }
    if (I18nManager.isRTL !== shouldBeRTL) {
      try {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        void reloadAppAsync();
      } catch {
        // Swallow — direction will take effect on the next launch.
      }
    }
  }, [i18nReady, locale]);

  // Hide splash only once fonts and i18n are both ready (or fonts
  // failed) so the user never sees an untranslated frame.
  useEffect(() => {
    if ((fontsLoaded || fontError) && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, i18nReady]);

  if ((!fontsLoaded && !fontError) || !i18nReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <ToastProvider>
                  <RootLayoutNav />
                </ToastProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </I18nextProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
