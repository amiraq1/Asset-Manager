import React, { useSyncExternalStore } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

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

const SOURCE_COLORS: Record<LogSource, string> = {
  ROOT: "#22D3EE",
  SHIZUKU: "#A78BFA",
  SYSTEM: "#5C6370",
};

const STATUS_COLORS: Record<LogStatus, string> = {
  pending: "#FACC15",
  success: "#22C55E",
  error: "#EF4444",
};

const STATUS_GLYPH: Record<LogStatus, string> = {
  pending: "…",
  success: "✓",
  error: "✗",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

interface Props {
  /** Number of most recent lines to display. Default 3. */
  lines?: number;
  /** Override the empty-state text. */
  emptyLabel?: string;
}

/**
 * Tiny read-only mirror of the Live Terminal — shows the last N
 * commands the bridges issued. Subscribes via `useSyncExternalStore`
 * so it updates instantly without re-mounting.
 */
export function MiniTerminal({ lines = 3, emptyLabel = "—" }: Props) {
  const logs = useSyncExternalStore(
    CommandLogger.subscribe,
    CommandLogger.getLogs,
    CommandLogger.getLogs,
  );
  const recent: LogEntry[] = logs.slice(-lines);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.headerText}>system.log · tail -n {lines}</Text>
      </View>
      <View style={styles.body}>
        {recent.length === 0 ? (
          <Text style={[styles.line, { color: "#5C6370" }]}>{emptyLabel}</Text>
        ) : (
          recent.map((entry) => (
            <Text key={entry.id} style={styles.line} numberOfLines={1}>
              <Text style={{ color: "#5C6370" }}>
                [{formatTime(entry.timestamp)}]{" "}
              </Text>
              <Text style={{ color: SOURCE_COLORS[entry.source] }}>
                [{entry.source}]
              </Text>
              <Text style={{ color: "#E6E6E6" }}> {entry.command} </Text>
              <Text style={{ color: STATUS_COLORS[entry.status] }}>
                {STATUS_GLYPH[entry.status]}
              </Text>
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#050505",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#1A1A1A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#0B0B0B",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1A1A1A",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  headerText: {
    color: "#5C6370",
    fontSize: 10,
    fontFamily: MONO,
  },
  body: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  line: {
    fontFamily: MONO,
    fontSize: 11,
    lineHeight: 16,
  },
});
