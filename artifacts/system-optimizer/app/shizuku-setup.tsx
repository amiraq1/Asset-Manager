import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useColors } from "@/hooks/useColors";
import {
  checkShizukuStatus,
  NativeModuleUnavailableError,
  openDeveloperOptions,
  openWifiSettings,
} from "@/services/SystemSettings";

export default function ShizukuSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const [activeStep, setActiveStep] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Fake dev mode flag to toggle shizuku locally
  const isDev = __DEV__;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPolling && !isRunning) {
      interval = setInterval(async () => {
        try {
          const res = await checkShizukuStatus();
          if (res.isRunning) {
            setIsRunning(true);
            setIsPolling(false);
          }
        } catch (err) {
          if (err instanceof NativeModuleUnavailableError) {
            // Ignore in dev mode, wait for debug button click
          } else {
            console.error(err);
          }
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPolling, isRunning]);

  const handleAction = async (action: () => Promise<any>, nextStep: number) => {
    try {
      await action();
    } catch (err) {
      if (err instanceof NativeModuleUnavailableError) {
        toast.show("Native module not available in Dev Mode. Proceeding...", "warning");
      }
    }
    setActiveStep(nextStep);
    if (nextStep === 3) {
      setIsPolling(true);
    }
  };

  const handleOpenWifi = () => handleAction(openWifiSettings, 2);
  const handleOpenDev = () => handleAction(openDeveloperOptions, 3);

  // The AHA moment styling
  const containerBg = isRunning ? "#0A1F12" : colors.background;
  const primaryColor = isRunning ? "#22C55E" : colors.primary;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: containerBg }]}
      layout={Layout.springify()}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: isRunning ? "#166534" : colors.muted },
              ]}
            >
              <Feather
                name={isRunning ? "shield" : "terminal"}
                size={36}
                color={primaryColor}
              />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {isRunning ? "Restrictions Bypassed!" : "Nabd Engine Setup"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {isRunning
                ? "Nabd Engine is now running at full power. You have full system access."
                : "Follow these steps to unlock deep system permissions using Shizuku."}
            </Text>
          </View>
        </Animated.View>

        {!isRunning ? (
          <View style={styles.stepper}>
            {/* Step 1 */}
            <Animated.View entering={FadeInUp.delay(100).duration(500)}>
              <Card style={[styles.card, activeStep === 1 && { borderColor: primaryColor }]}>
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepBadge,
                      { backgroundColor: activeStep >= 1 ? primaryColor : colors.muted },
                    ]}
                  >
                    <Text style={[styles.stepText, { color: activeStep >= 1 ? "#fff" : colors.mutedForeground }]}>1</Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>Network Prep</Text>
                </View>
                <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                  Ensure you are connected to a Wi-Fi network. Wireless debugging requires an active Wi-Fi connection.
                </Text>
                {activeStep === 1 && (
                  <Button
                    label="Open Wi-Fi Settings"
                    icon="wifi"
                    onPress={handleOpenWifi}
                    style={{ marginTop: 16 }}
                  />
                )}
              </Card>
            </Animated.View>

            {/* Step 2 */}
            <Animated.View entering={FadeInUp.delay(200).duration(500)}>
              <Card style={[styles.card, activeStep === 2 && { borderColor: primaryColor }, activeStep < 2 && { opacity: 0.5 }]}>
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepBadge,
                      { backgroundColor: activeStep >= 2 ? primaryColor : colors.muted },
                    ]}
                  >
                    <Text style={[styles.stepText, { color: activeStep >= 2 ? "#fff" : colors.mutedForeground }]}>2</Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>Developer Mode</Text>
                </View>
                <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                  Enable Developer Options and turn on Wireless Debugging in your system settings.
                </Text>
                {activeStep === 2 && (
                  <Button
                    label="Open Developer Options"
                    icon="settings"
                    onPress={handleOpenDev}
                    style={{ marginTop: 16 }}
                  />
                )}
              </Card>
            </Animated.View>

            {/* Step 3 */}
            <Animated.View entering={FadeInUp.delay(300).duration(500)}>
              <Card style={[styles.card, activeStep === 3 && { borderColor: primaryColor }, activeStep < 3 && { opacity: 0.5 }]}>
                <View style={styles.stepHeader}>
                  <View
                    style={[
                      styles.stepBadge,
                      { backgroundColor: activeStep >= 3 ? primaryColor : colors.muted },
                    ]}
                  >
                    <Text style={[styles.stepText, { color: activeStep >= 3 ? "#fff" : colors.mutedForeground }]}>3</Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>Pairing</Text>
                </View>
                <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                  Pair the Nabd Engine with your system using the pairing code. Waiting for Shizuku...
                </Text>
                {activeStep === 3 && (
                  <View style={styles.pollingContainer}>
                    <Feather name="loader" size={20} color={primaryColor} />
                    <Text style={[styles.pollingText, { color: primaryColor }]}>Polling for connection...</Text>
                  </View>
                )}
                {activeStep === 3 && isDev && (
                  <Button
                    label="[Debug] Simulate Success"
                    variant="secondary"
                    onPress={() => {
                      setIsRunning(true);
                      setIsPolling(false);
                    }}
                    style={{ marginTop: 16 }}
                  />
                )}
              </Card>
            </Animated.View>
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(800).delay(200)} style={styles.successContainer}>
            <View style={styles.successIconWrap}>
              <Feather name="check-circle" size={64} color="#22C55E" />
            </View>
            <Button
              label="Enter Dashboard"
              icon="arrow-right"
              onPress={() => router.replace("/(tabs)/")}
              style={{ width: "100%", backgroundColor: "#22C55E" }}
            />
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  stepper: {
    gap: 16,
  },
  card: {
    padding: 20,
    borderWidth: 1,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },
  stepTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
  },
  stepDesc: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    lineHeight: 20,
    paddingLeft: 40,
  },
  pollingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginLeft: 40,
  },
  pollingText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  successContainer: {
    alignItems: "center",
    marginTop: 40,
    gap: 30,
  },
  successIconWrap: {
    marginBottom: 20,
  },
});
