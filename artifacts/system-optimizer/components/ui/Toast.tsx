import { Feather } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export type ToastVariant = "info" | "success" | "warning" | "error";

interface ToastPayload {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      idRef.current += 1;
      const id = idRef.current;
      setToast({ id, message, variant });
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      timerRef.current = setTimeout(() => {
        if (idRef.current === id) dismiss();
      }, 4200);
    },
    [opacity, dismiss],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView payload={toast} opacity={opacity} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({
  payload,
  opacity,
}: {
  payload: ToastPayload;
  opacity: Animated.Value;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tint =
    payload.variant === "error"
      ? colors.danger
      : payload.variant === "warning"
        ? colors.warning
        : payload.variant === "success"
          ? colors.success
          : colors.primary;
  const icon =
    payload.variant === "error"
      ? "alert-octagon"
      : payload.variant === "warning"
        ? "alert-triangle"
        : payload.variant === "success"
          ? "check-circle"
          : "info";

  const bottom = (Platform.OS === "web" ? 24 : insets.bottom + 16) + 88;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          bottom,
          opacity,
          transform: [
            {
              translateY: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors.card,
            borderColor: tint + "55",
            borderRadius: colors.radius - 4,
          },
        ]}
      >
        <Feather name={icon} size={18} color={tint} />
        <Text
          style={[styles.text, { color: colors.foreground }]}
          numberOfLines={4}
        >
          {payload.message}
        </Text>
      </View>
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 520,
    width: "100%",
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    lineHeight: 18,
  },
});
