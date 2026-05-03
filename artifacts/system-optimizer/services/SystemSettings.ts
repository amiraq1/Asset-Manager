import { NativeModules, Platform } from "react-native";
import { createLogger } from "@/utils/logger";

const log = createLogger("SystemSettings");

export interface SystemSettingsModule {
  openDeveloperOptions?: () => Promise<boolean>;
  openWifiSettings?: () => Promise<boolean>;
  checkShizukuStatus?: () => Promise<{ isRunning: boolean }>;
}

export class NativeModuleUnavailableError extends Error {
  public readonly code = "NATIVE_MODULE_UNAVAILABLE";
  constructor(method: string) {
    super(`SystemSettings.${method} is not available in this build. Needs compiled app.`);
    this.name = "NativeModuleUnavailableError";
  }
}

function getNativeModule(): SystemSettingsModule | null {
  const mod = (NativeModules as Record<string, unknown>).SystemSettings;
  if (mod && typeof mod === "object") return mod as SystemSettingsModule;
  return null;
}

export async function openDeveloperOptions(): Promise<boolean> {
  const native = getNativeModule();
  if (!native || typeof native.openDeveloperOptions !== "function") {
    log.warn("SystemSettings.openDeveloperOptions() aborted — native module not installed.");
    throw new NativeModuleUnavailableError("openDeveloperOptions");
  }
  return await native.openDeveloperOptions();
}

export async function openWifiSettings(): Promise<boolean> {
  const native = getNativeModule();
  if (!native || typeof native.openWifiSettings !== "function") {
    log.warn("SystemSettings.openWifiSettings() aborted — native module not installed.");
    throw new NativeModuleUnavailableError("openWifiSettings");
  }
  return await native.openWifiSettings();
}

export async function checkShizukuStatus(): Promise<{ isRunning: boolean }> {
  const native = getNativeModule();
  if (!native || typeof native.checkShizukuStatus !== "function") {
    log.warn("SystemSettings.checkShizukuStatus() aborted — native module not installed.");
    throw new NativeModuleUnavailableError("checkShizukuStatus");
  }
  return await native.checkShizukuStatus();
}
