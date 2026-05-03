import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export type CheckboxState = "checked" | "unchecked" | "indeterminate";

interface Props {
  state: CheckboxState;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
}

export function Checkbox({ state, onPress, size = 22, disabled }: Props) {
  const colors = useColors();
  const checked = state !== "unchecked";
  const fill = disabled
    ? colors.muted
    : checked
      ? colors.primary
      : "transparent";
  const border = disabled
    ? colors.border
    : checked
      ? colors.primary
      : colors.border;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.box,
        {
          width: size,
          height: size,
          borderColor: border,
          backgroundColor: fill,
          borderRadius: 6,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {state === "checked" ? (
        <Feather
          name="check"
          size={Math.round(size * 0.7)}
          color={colors.primaryForeground}
        />
      ) : state === "indeterminate" ? (
        <View
          style={{
            width: Math.round(size * 0.55),
            height: 2,
            backgroundColor: colors.primaryForeground,
          }}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
