import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { MiniTerminal } from "@/components/MiniTerminal";
import { useColors } from "@/hooks/useColors";
import {
  executeTask,
  type AgentRun,
  type AgentStep,
  type StepType,
} from "@/services/AutonomousAgent";
import { useSettingsStore } from "@/store/settingsStore";

const WEB_TOP_INSET = 67;
const TAB_BAR_HEIGHT = 84;

const STEP_ICON: Record<StepType, keyof typeof Feather.glyphMap> = {
  vision: "maximize",
  thought: "cpu",
  action: "terminal",
  success: "check-circle",
};

const ACCENT = "#A855F7"; // electric neon purple — Autopilot signature
const DONE = "#22C55E";   // completed green
const FAIL = "#EF4444";   // error red

export default function AgentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const locale = useSettingsStore((s) => s.locale);

  const [prompt, setPrompt] = useState("");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [running, setRunning] = useState(false);

  const topPad = Platform.OS === "web" ? WEB_TOP_INSET + 16 : insets.top + 16;
  const bottomPad =
    Platform.OS === "web" ? TAB_BAR_HEIGHT + 24 : insets.bottom + TAB_BAR_HEIGHT + 8;

  const handleStart = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || running) return;
    setRunning(true);
    try {
      await executeTask(trimmed, (snapshot) => {
        setRun(snapshot);
      });
    } finally {
      setRunning(false);
    }
  };

  const sample = t("agent.samplePrompt");

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
        <View style={styles.headerRow}>
          <View style={[styles.headerIcon, { backgroundColor: ACCENT + "22" }]}>
            <Feather name="cpu" size={20} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("agent.title")}
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.mutedForeground }]}
            >
              {t("agent.subtitle")}
            </Text>
          </View>
        </View>
      </View>

      <Card>
        <Text
          style={[styles.inputLabel, { color: colors.mutedForeground }]}
        >
          {t("agent.inputLabel")}
        </Text>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder={sample}
          placeholderTextColor={colors.mutedForeground}
          editable={!running}
          multiline
          numberOfLines={3}
          textAlign={locale === "ar" ? "right" : "left"}
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
        <Pressable
          onPress={() => void handleStart()}
          disabled={running || prompt.trim().length === 0}
          style={({ pressed }) => [
            styles.startBtn,
            {
              backgroundColor: ACCENT,
              borderRadius: colors.radius,
              shadowColor: ACCENT,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.55,
              shadowRadius: 14,
              opacity:
                running || prompt.trim().length === 0
                  ? 0.5
                  : pressed
                    ? 0.85
                    : 1,
            },
          ]}
        >
          <Feather name={running ? "loader" : "zap"} size={18} color="#FFFFFF" />
          <Text style={styles.startLabel}>
            {running ? t("agent.running") : t("agent.start")}
          </Text>
        </Pressable>
      </Card>

      {run ? (
        <Card>
          <View style={styles.timelineHeader}>
            <Feather name="git-commit" size={14} color={colors.mutedForeground} />
            <Text
              style={[styles.timelineLabel, { color: colors.mutedForeground }]}
            >
              {t("agent.timelineLabel")}
            </Text>
            {run.complete ? (
              <View style={[styles.completePill, { backgroundColor: DONE + "22" }]}>
                <Feather name="check" size={11} color={DONE} />
                <Text style={[styles.completeText, { color: DONE }]}>
                  {t("agent.complete")}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.timeline}>
            {run.steps.map((step, idx) => (
              <StepRow
                key={step.id}
                step={step}
                isLast={idx === run.steps.length - 1}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <View style={{ gap: 6 }}>
        <Text
          style={[styles.miniLabel, { color: colors.mutedForeground }]}
        >
          {t("agent.miniTerminalLabel")}
        </Text>
        <MiniTerminal lines={3} emptyLabel={t("agent.miniTerminalEmpty")} />
      </View>
    </ScrollView>
  );
}

function StepRow({ step, isLast }: { step: AgentStep; isLast: boolean }) {
  const colors = useColors();
  const isActive = step.status === "active";
  const isDone = step.status === "completed";
  const isError = step.status === "error";
  const isPending = step.status === "pending";
  // 'success'-type steps are visually completed even at status 'completed' —
  // and stand out with a green-forward palette regardless.
  const isSuccessStep = step.type === "success";

  const accent = isError
    ? FAIL
    : isSuccessStep && (isDone || isActive)
      ? DONE
      : isDone
        ? DONE
        : isActive
          ? ACCENT
          : colors.border;

  // Pulse for active steps; vision steps get a faster, more urgent radar feel.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isActive) {
      pulse.setValue(0);
      return;
    }
    const dur = step.type === "vision" ? 700 : 1100;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: dur,
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
  }, [isActive, pulse, step.type]);

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  // 'success' type keeps its check-circle icon even when completed.
  const iconName: keyof typeof Feather.glyphMap = isError
    ? "x"
    : isDone && !isSuccessStep
      ? "check"
      : STEP_ICON[step.type];

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepGutter}>
        <View style={styles.stepNodeWrap}>
          {isActive ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.stepRing,
                {
                  borderColor: accent,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
          ) : null}
          <View
            style={[
              styles.stepNode,
              {
                borderColor: accent,
                backgroundColor: isDone
                  ? DONE + "22"
                  : isError
                    ? FAIL + "22"
                    : isActive
                      ? ACCENT + "22"
                      : colors.muted,
              },
            ]}
          >
            <Feather
              name={iconName}
              size={14}
              color={
                isDone
                  ? DONE
                  : isError
                    ? FAIL
                    : isActive
                      ? ACCENT
                      : colors.mutedForeground
              }
            />
          </View>
        </View>
        {isLast ? null : (
          <View
            style={[
              styles.stepConnector,
              {
                backgroundColor: isDone ? DONE + "55" : colors.border,
              },
            ]}
          />
        )}
      </View>
      <View style={styles.stepBody}>
        <Text
          style={[
            styles.stepType,
            {
              color: isActive ? accent : colors.mutedForeground,
              opacity: isPending ? 0.6 : 1,
            },
          ]}
        >
          {step.type.toUpperCase()}
        </Text>
        <Text
          style={[
            styles.stepText,
            {
              color: isPending ? colors.mutedForeground : colors.foreground,
              opacity: isPending ? 0.6 : 1,
              fontFamily:
                step.type === "action"
                  ? "Cairo_700Bold"
                  : "Cairo_600SemiBold",
            },
          ]}
        >
          {step.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 24, fontWeight: "700", fontFamily: "Cairo_700Bold" },
  subtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    lineHeight: 18,
    marginTop: 2,
  },
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
    minHeight: 80,
    marginBottom: 12,
    textAlignVertical: "top",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  startLabel: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#001018",
    letterSpacing: 0.4,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  timelineLabel: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    flex: 1,
  },
  completePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  completeText: {
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 0.6,
  },
  timeline: { gap: 0 },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
  },
  stepGutter: {
    width: 32,
    alignItems: "center",
  },
  stepNodeWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNode: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepRing: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  stepConnector: {
    flex: 1,
    width: 2,
    minHeight: 18,
  },
  stepBody: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 2,
  },
  stepType: {
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 1,
  },
  stepText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    lineHeight: 18,
  },
  miniLabel: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 4,
  },
});
