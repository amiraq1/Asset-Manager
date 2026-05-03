import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { useColors } from "@/hooks/useColors";

interface Props {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  helper?: string;
  accentColor?: string;
}

export function StatTile({ icon, label, value, helper, accentColor }: Props) {
  const colors = useColors();
  const tint = accentColor ?? colors.primary;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: tint + "22", borderRadius: colors.radius - 4 },
          ]}
        >
          <Feather name={icon} size={20} color={tint} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.value, { color: colors.foreground }]} numberOfLines={1}>
            {value}
          </Text>
          {helper ? (
            <Text style={[styles.helper, { color: colors.mutedForeground }]} numberOfLines={1}>
              {helper}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
    marginTop: 2,
  },
  helper: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Cairo_400Regular",
  },
});
