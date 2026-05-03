import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
  color?: string;
  /** Disable the entrance animation (useful for tests). */
  animated?: boolean;
}

export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 14,
  centerLabel,
  centerSub,
  color,
  animated = true,
}: Props) {
  const colors = useColors();
  const tint = color ?? colors.primary;
  const safe = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const anim = useRef(new Animated.Value(animated ? 0 : safe)).current;

  useEffect(() => {
    if (!animated) {
      anim.setValue(safe);
      return;
    }
    Animated.timing(anim, {
      toValue: safe,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [safe, animated, anim]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

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
        <AnimatedCircle
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
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Cairo_700Bold",
  },
  sub: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "center",
    paddingHorizontal: 6,
  },
});
