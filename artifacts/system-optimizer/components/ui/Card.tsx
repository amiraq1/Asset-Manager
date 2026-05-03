import React, { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
}

export function Card({
  children,
  style,
  padded = true,
}: PropsWithChildren<Props>) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          padding: padded ? 16 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
