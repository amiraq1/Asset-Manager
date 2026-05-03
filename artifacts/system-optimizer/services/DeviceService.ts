import { Platform } from "react-native";
import * as Device from "expo-device";

import type { DeviceInfo } from "@/types";
import { createLogger } from "@/utils/logger";

const log = createLogger("DeviceService");

export async function getDeviceInfo(): Promise<DeviceInfo> {
  try {
    if (Platform.OS === "web") {
      return {
        brand: null,
        manufacturer: null,
        modelName: "Web",
        osName: "Web",
        osVersion: typeof navigator !== "undefined" ? navigator.userAgent : null,
        totalMemoryBytes: null,
        isDevice: false,
      };
    }
    return {
      brand: Device.brand ?? null,
      manufacturer: Device.manufacturer ?? null,
      modelName: Device.modelName ?? null,
      osName: Device.osName ?? null,
      osVersion: Device.osVersion ?? null,
      totalMemoryBytes: Device.totalMemory ?? null,
      isDevice: Device.isDevice,
    };
  } catch (err) {
    log.error("getDeviceInfo failed", err);
    return {
      brand: null,
      manufacturer: null,
      modelName: null,
      osName: Platform.OS,
      osVersion: null,
      totalMemoryBytes: null,
      isDevice: false,
    };
  }
}
