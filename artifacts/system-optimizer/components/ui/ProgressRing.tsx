import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

interface Props {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
  color?: string;
}

export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 14,
  centerLabel,
  centerSub,
  color,
}: Props) {
  const colors = useColors();
  const tint = color ?? colors.primary;
  const safe = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safe);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tint}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {centerLabel ? (
          <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
            {centerLabel}
          </Text>
        ) : null}
        {centerSub ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {centerSub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  sub: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Cairo_400Regular",
  },
});
