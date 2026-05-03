import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LiveTerminal } from "@/components/ui/LiveTerminal";
import { useColors } from "@/hooks/useColors";
import { commandLogger } from "@/services/CommandLogger";

export default function TerminalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [autoScroll, setAutoScroll] = useState(true);

  const handleClear = () => {
    commandLogger.clear();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>System Activity Log</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Real-time shell command execution
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => setAutoScroll(!autoScroll)}
            style={[
              styles.actionButton,
              { backgroundColor: autoScroll ? colors.primary + "20" : colors.muted },
            ]}
          >
            <Feather
              name={autoScroll ? "anchor" : "unlock"}
              size={16}
              color={autoScroll ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClear}
            style={[styles.actionButton, { backgroundColor: colors.muted }]}
          >
            <Feather name="trash-2" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.terminalContainer}>
        <LiveTerminal autoScroll={autoScroll} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  terminalContainer: {
    flex: 1,
    padding: 10,
    paddingBottom: 90, // Room for tab bar
  },
});
