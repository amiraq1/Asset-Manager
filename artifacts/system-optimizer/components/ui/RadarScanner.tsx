import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { useColors } from "@/hooks/useColors";


interface Props {
  size?: number;
  active: boolean;
  label?: string;
}

/**
 * A circular radar visual — three pulsing rings with a sweeping wedge.
 * Pure RN Animated + react-native-svg, no extra deps.
 */
export function RadarScanner({ size = 180, active, label }: Props) {
  const colors = useColors();
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      sweep.stopAnimation();
      pulse.stopAnimation();
      return;
    }
    const sweepLoop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    sweepLoop.start();
    pulseLoop.start();
    return () => {
      sweepLoop.stop();
      pulseLoop.stop();
    };
  }, [active, sweep, pulse]);

  const rotate = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.05],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.6, 0.25, 0],
  });

  const r = size / 2;
  const wedgeRadius = r - 6;
  // 60° wedge starting at 12 o'clock (rotated by the animated transform)
  const angle = (60 * Math.PI) / 180;
  const x = r + wedgeRadius * Math.sin(angle);
  const y = r - wedgeRadius * Math.cos(angle);
  const wedgePath = `M ${r} ${r} L ${r} ${r - wedgeRadius} A ${wedgeRadius} ${wedgeRadius} 0 0 1 ${x} ${y} Z`;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={r}
          cy={r}
          r={r - 2}
          stroke={colors.border}
          strokeWidth={1}
          fill="none"
        />
        <Circle
          cx={r}
          cy={r}
          r={(r - 2) * 0.66}
          stroke={colors.border}
          strokeWidth={1}
          fill="none"
        />
        <Circle
          cx={r}
          cy={r}
          r={(r - 2) * 0.33}
          stroke={colors.border}
          strokeWidth={1}
          fill="none"
        />
      </Svg>

      {/* Pulsing ring */}
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: "center",
              justifyContent: "center",
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        >
          <View
            style={{
              width: size - 8,
              height: size - 8,
              borderRadius: (size - 8) / 2,
              borderWidth: 2,
              borderColor: colors.primary,
            }}
          />
        </Animated.View>
      ) : null}

      {/* Sweeping wedge */}
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center" },
            { transform: [{ rotate }] },
          ]}
        >
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="wedge" x1="50%" y1="0%" x2="50%" y2="100%">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.55" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Path d={wedgePath} fill="url(#wedge)" />
          </Svg>
        </Animated.View>
      ) : null}

      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.label, { color: colors.foreground }]}>
          {label}
        </Text>
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
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
