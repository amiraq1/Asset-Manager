import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

import { NativeModuleUnavailableError } from "@/services/RootShell";
import { createLogger } from "@/utils/logger";

const log = createLogger("NightlyFreezeManager");

const STORAGE_KEY = "@NightlyFreeze_Config";

export interface NightlyFreezeConfig {
  isEnabled: boolean;
  startTime: string; // e.g., "23:00"
  endTime: string;   // e.g., "07:00"
  selectedApps: string[];
}

const DEFAULT_CONFIG: NightlyFreezeConfig = {
  isEnabled: false,
  startTime: "23:00",
  endTime: "07:00",
  selectedApps: [],
};

interface NightlyFreezeNativeModule {
  updateSchedule?: (config: NightlyFreezeConfig) => Promise<boolean>;
}

function getNativeModule(): NightlyFreezeNativeModule | null {
  const mod = (NativeModules as Record<string, unknown>).NightlyFreeze;
  if (mod && typeof mod === "object") return mod as NightlyFreezeNativeModule;
  return null;
}

export async function getFreezeSettings(): Promise<NightlyFreezeConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as NightlyFreezeConfig;
    }
  } catch (err) {
    log.error("Failed to load freeze settings", err);
  }
  return DEFAULT_CONFIG;
}

export async function saveFreezeSettings(config: NightlyFreezeConfig): Promise<void> {
  // 1. Save locally for the UI state
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    log.error("Failed to save freeze settings locally", err);
    throw err;
  }

  // 2. Pass to the Native Module for background scheduling
  if (Platform.OS !== "android") {
    // Only supported on Android
    return;
  }

  const native = getNativeModule();
  if (!native || typeof native.updateSchedule !== "function") {
    log.warn("NightlyFreeze.updateSchedule() aborted — native module not installed.");
    throw new NativeModuleUnavailableError("NightlyFreeze.updateSchedule");
  }

  try {
    await native.updateSchedule(config);
    log.info("Nightly schedule updated in native module.");
  } catch (err) {
    log.error("Failed to update native schedule", err);
    throw err;
  }
}
