import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CommandLogger,
  type LogEntry,
  type LogSource,
  type LogStatus,
} from "@/services/CommandLogger";

const MONO = Platform.select({
  ios: "Courier",
  android: "monospace",
  default: "ui-monospace, SFMono-Regular, Menlo, monospace",
});

// Forced dark terminal palette — independent of the user's app theme.
const TERM = {
  bg: "#050505",
  surface: "#0B0B0B",
  border: "#1A1A1A",
  dim: "#5C6370",
  white: "#E6E6E6",
  cyan: "#22D3EE",
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#FACC15",
  prompt: "#A0A0AE",
};

const SOURCE_COLORS: Record<LogSource, string> = {
  ROOT: TERM.cyan,
  SHIZUKU: "#A78BFA",
  SYSTEM: TERM.dim,
};

const STATUS_COLORS: Record<LogStatus, string> = {
  pending: TERM.yellow,
  success: TERM.green,
  error: TERM.red,
};

const STATUS_GLYPH: Record<LogStatus, string> = {
  pending: "…",
  success: "✓",
  error: "✗",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function TerminalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const logs = useSyncExternalStore(
    CommandLogger.subscribe,
    CommandLogger.getLogs,
    CommandLogger.getLogs,
  );

  const listRef = useRef<FlatList<LogEntry>>(null);

  // Auto-scroll to bottom whenever a new log arrives.
  useEffect(() => {
    if (logs.length === 0) return;
    // Defer to the next frame so the new row is laid out first.
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(id);
  }, [logs.length]);

  const topPad = Platform.OS === "web" ? 16 : insets.top + 8;
  const bottomPad = Platform.OS === "web" ? 16 : insets.bottom + 8;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" backgroundColor={TERM.bg} />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={22} color={TERM.white} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Feather name="terminal" size={16} color={TERM.green} />
          <Text style={styles.headerTitle}>{t("terminal.title")}</Text>
        </View>
        <Pressable
          onPress={() => CommandLogger.clearLogs()}
          style={({ pressed }) => [
            styles.iconBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          hitSlop={8}
        >
          <Feather name="trash-2" size={18} color={TERM.dim} />
        </Pressable>
      </View>

      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: TERM.green }]} />
        <Text style={styles.statusText}>
          {t("terminal.connected", { count: logs.length })}
        </Text>
      </View>

      <View style={[styles.terminal, { marginBottom: bottomPad }]}>
        {logs.length === 0 ? (
          <EmptyTerminal label={t("terminal.empty")} />
        ) : (
          <FlatList
            ref={listRef}
            data={logs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <LogRow entry={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
            initialNumToRender={50}
            removeClippedSubviews={false}
          />
        )}
      </View>
    </View>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const blink = useBlink(entry.status === "pending");
  const statusColor = STATUS_COLORS[entry.status];
  return (
    <View style={styles.row}>
      <Text style={[styles.line, { color: TERM.white }]} selectable>
        <Text style={{ color: TERM.dim }}>[{formatTime(entry.timestamp)}] </Text>
        <Text style={{ color: SOURCE_COLORS[entry.source] }}>
          [{entry.source}]
        </Text>
        <Text> {entry.command} </Text>
        <Animated.Text
          style={{
            color: statusColor,
            opacity: entry.status === "pending" ? blink : 1,
          }}
        >
          {STATUS_GLYPH[entry.status]}
        </Animated.Text>
      </Text>
    </View>
  );
}

function EmptyTerminal({ label }: { label: string }) {
  const blink = useBlink(true);
  return (
    <View style={styles.empty}>
      <Text style={[styles.line, { color: TERM.dim }]}>
        {label}{" "}
        <Animated.Text style={{ color: TERM.green, opacity: blink }}>
          _
        </Animated.Text>
      </Text>
    </View>
  );
}

function useBlink(active: boolean): Animated.Value {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      v.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 0.15,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  return v;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TERM.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TERM.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: TERM.white,
    fontSize: 14,
    fontFamily: MONO,
    letterSpacing: 0.5,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: TERM.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TERM.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: {
    color: TERM.dim,
    fontSize: 11,
    fontFamily: MONO,
  },
  terminal: {
    flex: 1,
    backgroundColor: TERM.bg,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  row: {
    paddingVertical: 1,
  },
  line: {
    fontFamily: MONO,
    fontSize: 12,
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    padding: 14,
  },
});
