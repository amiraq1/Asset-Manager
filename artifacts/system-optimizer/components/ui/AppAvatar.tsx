import React from "react";
import { StyleSheet, Text, View } from "react-native";

const PALETTE = [
  "#2563EB", "#7C3AED", "#DB2777", "#DC2626", "#EA580C",
  "#16A34A", "#0EA5E9", "#9333EA", "#0891B2", "#CA8A04",
  "#BE185D", "#0F766E",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface Props {
  name: string;
  packageName: string;
  size?: number;
}

/**
 * Placeholder app icon: a colored rounded square with the first letter
 * of the app name. Stable per package so the same app always gets the
 * same color across re-renders.
 */
export function AppAvatar({ name, packageName, size = 40 }: Props) {
  const color = PALETTE[hash(packageName) % PALETTE.length];
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: Math.round(size * 0.28),
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.45) }]}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
  letter: {
    color: "#FFFFFF",
    fontFamily: "Cairo_700Bold",
    fontWeight: "700",
  },
});
