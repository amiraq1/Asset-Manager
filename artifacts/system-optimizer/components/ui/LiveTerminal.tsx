import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { commandLogger, SystemLog } from "@/services/CommandLogger";

interface LiveTerminalProps {
  autoScroll?: boolean;
}

export function LiveTerminal({ autoScroll = true }: LiveTerminalProps) {
  const colors = useColors();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const scrollRef = useRef<FlatList>(null);

  useEffect(() => {
    return commandLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
  }, []);

  const getLogColor = (log: SystemLog) => {
    if (log.status === "error") return "#ef4444"; // Red
    if (log.status === "success") return "#22c55e"; // Green
    return "#71717a"; // Gray/Zinc-500
  };

  const monoFont = Platform.select({
    ios: "Courier",
    android: "monospace",
    default: "monospace",
  });

  const renderItem = ({ item: log }: { item: SystemLog }) => (
    <View style={styles.logLine}>
      <Text style={[styles.timestamp, { fontFamily: monoFont }]}>
        [{log.timestamp}]
      </Text>
      <Text
        style={[
          styles.logText,
          { color: getLogColor(log), fontFamily: monoFont },
        ]}
      >
        {log.command}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {logs.length === 0 ? (
        <View style={styles.content}>
          <Text style={[styles.logText, { color: "#3f3f46", fontFamily: monoFont }]}>
            [SYSTEM] Waiting for activity...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={scrollRef}
          data={logs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => {
            if (autoScroll && logs.length > 0) {
              scrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
          onLayout={() => {
            if (autoScroll && logs.length > 0) {
              scrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
          initialNumToRender={30}
          maxToRenderPerBatch={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 12,
  },
  logLine: {
    flexDirection: "row",
    marginBottom: 4,
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#52525b", // Zinc-600
  },
  logText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});
