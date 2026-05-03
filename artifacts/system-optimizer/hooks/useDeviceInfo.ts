import { useQuery } from "@tanstack/react-query";
import * as Battery from "expo-battery";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { getDeviceInfo } from "@/services/DeviceService";
import type { BatteryInfo, BatteryState, DeviceInfo } from "@/types";

function mapState(state: Battery.BatteryState): BatteryState {
  switch (state) {
    case Battery.BatteryState.CHARGING:
      return "charging";
    case Battery.BatteryState.FULL:
      return "full";
    case Battery.BatteryState.UNPLUGGED:
      return "unplugged";
    default:
      return "unknown";
  }
}

export function useDeviceInfo() {
  return useQuery<DeviceInfo>({
    queryKey: ["deviceInfo"],
    queryFn: getDeviceInfo,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBatteryInfo() {
  const [info, setInfo] = useState<BatteryInfo>({
    level: 0,
    state: "unknown",
    lowPowerMode: false,
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    if (Platform.OS === "web") {
      setInfo({ level: 0, state: "unknown", lowPowerMode: false });
      return () => {
        mounted = false;
      };
    }

    async function refresh() {
      try {
        const [level, state, low] = await Promise.all([
          Battery.getBatteryLevelAsync(),
          Battery.getBatteryStateAsync(),
          Battery.isLowPowerModeEnabledAsync(),
        ]);
        if (!mounted) return;
        setInfo({
          level: Math.max(0, Math.min(1, level)),
          state: mapState(state),
          lowPowerMode: low,
        });
      } catch (err) {
        if (mounted) setError(err as Error);
      }
    }

    void refresh();

    const levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      if (mounted)
        setInfo((prev) => ({
          ...prev,
          level: Math.max(0, Math.min(1, batteryLevel)),
        }));
    });
    const stateSub = Battery.addBatteryStateListener(({ batteryState }) => {
      if (mounted)
        setInfo((prev) => ({ ...prev, state: mapState(batteryState) }));
    });
    const lowSub = Battery.addLowPowerModeListener(({ lowPowerMode }) => {
      if (mounted) setInfo((prev) => ({ ...prev, lowPowerMode }));
    });

    return () => {
      mounted = false;
      levelSub.remove();
      stateSub.remove();
      lowSub.remove();
    };
  }, []);

  return { info, error };
}
