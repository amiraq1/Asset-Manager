import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
  SlideInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { useColors } from "@/hooks/useColors";
import { getRamUsage } from "@/services/DeviceStats";
import {
  GameInfo,
  getGamesList,
  launchGameInDeepMode,
} from "@/services/GamingModeManager";

export default function GamingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [ramUsed, setRamUsed] = useState(0);
  const [lockdownActive, setLockdownActive] = useState(false);
  const [lockdownStep, setLockdownStep] = useState(0);
  const [freedRam, setFreedRam] = useState(0);
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);

  const LOCKDOWN_STEPS = [
    "Initiating Lockdown Protocol...",
    "Freezing Background Processes...",
    "Clearing System Cache...",
    "Allocating Maximum Resources...",
    "Lockdown Complete. Launching...",
  ];

  useEffect(() => {
    async function init() {
      const [list, ram] = await Promise.all([getGamesList(), getRamUsage()]);
      setGames(list);
      setRamUsed(ram.usedRatio);
      setLoading(false);
    }
    init();
  }, []);

  const handleLaunch = async (game: GameInfo) => {
    setSelectedGame(game);
    setLockdownActive(true);
    setLockdownStep(0);

    // Sequence animation
    for (let i = 1; i < LOCKDOWN_STEPS.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setLockdownStep(i);
    }

    const freed = await launchGameInDeepMode(game.packageName);
    setFreedRam(freed);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLockdownActive(false);
    // In a real app, we would use IntentLauncher to open the actual game pkg
  };

  const gamingPrimary = "#ef4444"; // Red-500 (Aggressive)
  const gamingAccent = "#8b5cf6"; // Violet-500

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={gamingPrimary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={games}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: 100,
          gap: 20,
        }}
        ListHeaderComponent={() => (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View style={styles.titleRow}>
              <Feather name="crosshair" size={28} color={gamingPrimary} />
              <Text style={[styles.title, { color: colors.foreground }]}>Deep Gaming Mode</Text>
            </View>
            
            <Card style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>SYSTEM STATUS</Text>
                  <Text style={[styles.statusValue, { color: gamingPrimary }]}>LOCKDOWN READY</Text>
                </View>
                <View style={styles.ramBadge}>
                  <Text style={styles.ramText}>{Math.round(ramUsed * 100)}% RAM Used</Text>
                </View>
              </View>
              <View style={styles.glowBar} />
            </Card>

            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>INSTALLED GAMES</Text>
          </Animated.View>
        )}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(100 * index)} layout={Layout.springify()}>
            <Pressable onPress={() => handleLaunch(item)}>
              {({ pressed }) => (
                <Card
                  style={[
                    styles.gameCard,
                    { borderColor: pressed ? gamingPrimary : colors.border },
                    pressed && styles.pressedCard,
                  ]}
                >
                  <View style={[styles.gameIcon, { backgroundColor: colors.muted }]}>
                    <Feather name="play" size={20} color={gamingPrimary} />
                  </View>
                  <View style={styles.gameInfo}>
                    <Text style={[styles.gameLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.gameSub, { color: colors.mutedForeground }]}>{item.lastPlayed}</Text>
                  </View>
                  <Feather name="zap" size={18} color={gamingAccent} />
                </Card>
              )}
            </Pressable>
          </Animated.View>
        )}
        keyExtractor={(item) => item.packageName}
      />

      {/* Lockdown Modal */}
      <Modal visible={lockdownActive} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInUp.duration(600)} style={styles.modalContent}>
            <View style={styles.lockdownIconWrapper}>
              <Feather name="shield" size={64} color={gamingPrimary} />
              <Animated.View entering={FadeIn} style={styles.scanLine} />
            </View>
            
            <Text style={styles.lockdownTitle}>SYSTEM LOCKDOWN</Text>
            
            <View style={styles.stepsContainer}>
              {LOCKDOWN_STEPS.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[
                    styles.stepDot, 
                    { backgroundColor: i < lockdownStep ? "#22c55e" : i === lockdownStep ? gamingPrimary : "#3f3f46" }
                  ]} />
                  <Text style={[
                    styles.stepText,
                    { color: i === lockdownStep ? "#fff" : "#71717a", opacity: i <= lockdownStep ? 1 : 0.4 }
                  ]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>

            {freedRam > 0 && (
              <Animated.View entering={FadeIn} style={styles.freedBadge}>
                <Text style={styles.freedText}>+{freedRam}MB RAM FREED</Text>
              </Animated.View>
            )}

            <ActivityIndicator color={gamingPrimary} style={{ marginTop: 30 }} />
          </Animated.View>
        </View>
      </Modal>
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
  header: {
    gap: 20,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
  },
  statusCard: {
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
    padding: 16,
    borderWidth: 1,
    borderColor: "#ef444440",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusInfo: {
    gap: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 1,
  },
  statusValue: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
  },
  ramBadge: {
    backgroundColor: "#ef444420",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  ramText: {
    color: "#ef4444",
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
  },
  glowBar: {
    height: 2,
    backgroundColor: "#ef4444",
    marginTop: 12,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 1,
    marginTop: 10,
  },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 16,
    backgroundColor: "#262626",
  },
  pressedCard: {
    backgroundColor: "#ef444410",
  },
  gameIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gameInfo: {
    flex: 1,
    gap: 2,
  },
  gameLabel: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
  },
  gameSub: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    alignItems: "center",
  },
  lockdownIconWrapper: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  scanLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "#ef4444",
    top: "50%",
    shadowColor: "#ef4444",
    shadowRadius: 10,
    elevation: 5,
  },
  lockdownTitle: {
    color: "#ef4444",
    fontSize: 28,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 2,
    marginBottom: 40,
  },
  stepsContainer: {
    width: "100%",
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  freedBadge: {
    marginTop: 30,
    backgroundColor: "#22c55e",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  freedText: {
    color: "#fff",
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },
});
