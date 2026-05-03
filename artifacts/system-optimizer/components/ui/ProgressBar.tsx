import React from "react";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  /** 0..1 */
  progress: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ progress, color, height = 8 }: Props) {
  const colors = useColors();
  const tint = color ?? colors.primary;
  const safe = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View
      style={[
        styles.track,
        { backgroundColor: colors.track, height, borderRadius: height / 2 },
      ]}
    >
      <View
        style={{
          width: `${safe * 100}%`,
          height,
          backgroundColor: tint,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
});
