import { NativeModules, Platform } from "react-native";
import * as Device from "expo-device";

import { cleanItems, scanJunk } from "@/services/JunkScannerService";
import { getStorageInfo } from "@/services/StorageService";
import { createLogger } from "@/utils/logger";

const log = createLogger("DeviceStats");

export interface RamUsage {
  /** Total physical RAM in bytes (real, from expo-device). */
  totalBytes: number;
  /** Used RAM in bytes. May be estimated when no native module is available. */
  usedBytes: number;
  /** 0..1 ratio. */
  usedRatio: number;
  /**
   * "native"   – obtained from a real native bridge (e.g. ActivityManager.MemoryInfo).
   * "estimate" – heuristic estimate because no native bridge is wired yet.
   * "unknown"  – platform offers no value at all (e.g. web).
   */
  source: "native" | "estimate" | "unknown";
}

export interface StorageStats {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedRatio: number;
}

export interface QuickOptimizeResult {
  bytesFreed: number;
  itemsScanned: number;
  itemsCleaned: number;
  itemsSkipped: number;
  durationMs: number;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
  /** True when this entry comes from the bundled fallback list (not a live PackageManager query). */
  isFallback: boolean;
}

interface DeviceStatsNativeModule {
  getRamUsage?: () => Promise<{ totalBytes: number; usedBytes: number }>;
  getInstalledApps?: () => Promise<
    Array<{ packageName: string; appName: string }>
  >;
}

/**
 * Curated list of common Android apps. Used as a fallback so the
 * Task Manager / RAM Booster screen has something realistic to render
 * before the native `PackageManager` bridge is wired in. Each entry is
 * tagged `isFallback: true` so the UI can disclose this honestly.
 */
const FALLBACK_APPS: ReadonlyArray<{
  packageName: string;
  appName: string;
}> = [
  { packageName: "com.whatsapp", appName: "WhatsApp" },
  { packageName: "com.android.chrome", appName: "Chrome" },
  { packageName: "com.google.android.youtube", appName: "YouTube" },
  { packageName: "com.facebook.katana", appName: "Facebook" },
  { packageName: "com.instagram.android", appName: "Instagram" },
  { packageName: "org.telegram.messenger", appName: "Telegram" },
  { packageName: "com.twitter.android", appName: "X (Twitter)" },
  { packageName: "com.zhiliaoapp.musically", appName: "TikTok" },
  { packageName: "com.spotify.music", appName: "Spotify" },
  { packageName: "com.google.android.gm", appName: "Gmail" },
  { packageName: "com.google.android.apps.maps", appName: "Maps" },
  { packageName: "com.snapchat.android", appName: "Snapchat" },
];

function getNativeModule(): DeviceStatsNativeModule | null {
  const mod = (NativeModules as Record<string, unknown>).DeviceStats;
  if (mod && typeof mod === "object") return mod as DeviceStatsNativeModule;
  return null;
}

/**
 * Returns RAM usage. When the native bridge is wired, the values come from
 * `ActivityManager.MemoryInfo` (or equivalent) and `source` is `"native"`.
 *
 * In the current Expo Go build there is no native module, so we expose the
 * real total RAM (from `expo-device`) and a deterministic estimate for the
 * used portion, clearly tagged with `source: "estimate"`. The UI surfaces
 * this tag so the user is never misled into thinking it is a live reading.
 */
export async function getRamUsage(): Promise<RamUsage> {
  const native = getNativeModule();
  if (native?.getRamUsage) {
    try {
      const r = await native.getRamUsage();
      const total = Math.max(0, r.totalBytes);
      const used = Math.max(0, Math.min(r.usedBytes, total));
      return {
        totalBytes: total,
        usedBytes: used,
        usedRatio: total > 0 ? used / total : 0,
        source: "native",
      };
    } catch (err) {
      log.warn("native getRamUsage failed, falling back to estimate", err);
    }
  }

  const total = Platform.OS === "web" ? 0 : Device.totalMemory ?? 0;
  if (total <= 0) {
    return { totalBytes: 0, usedBytes: 0, usedRatio: 0, source: "unknown" };
  }
  // Stable estimate (~62% used) so the UI doesn't flicker between renders
  // and so it's obvious in code review that this is not a live reading.
  const used = Math.round(total * 0.62);
  return {
    totalBytes: total,
    usedBytes: used,
    usedRatio: used / total,
    source: "estimate",
  };
}

/**
 * Returns the list of user-installed apps. When the native bridge is
 * wired (via Android `PackageManager.getInstalledApplications`), this
 * is the live list and `isFallback` is `false`. Otherwise we return a
 * curated set of common apps so the Task Manager UI has something
 * realistic to render in dev/Expo Go, with `isFallback: true` so the
 * UI can disclose this clearly.
 */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  const native = getNativeModule();
  if (native?.getInstalledApps) {
    try {
      const list = await native.getInstalledApps();
      return list.map((a) => ({
        packageName: a.packageName,
        appName: a.appName,
        isFallback: false,
      }));
    } catch (err) {
      log.warn("native getInstalledApps failed, using fallback list", err);
    }
  }
  return FALLBACK_APPS.map((a) => ({ ...a, isFallback: true }));
}

/** Real storage stats backed by `expo-file-system`. */
export async function getStorageStats(): Promise<StorageStats> {
  const info = await getStorageInfo();
  return {
    totalBytes: info.totalBytes,
    freeBytes: info.freeBytes,
    usedBytes: info.usedBytes,
    usedRatio: info.usedPercent,
  };
}

/**
 * Runs a real quick optimization pass: scans the app's cache directory
 * (the only thing JS can safely walk) and deletes everything that is
 * provably under it. No fake delay — the duration is whatever the real
 * filesystem operations take.
 */
export async function runQuickOptimize(): Promise<QuickOptimizeResult> {
  const start = Date.now();
  const scan = await scanJunk();
  const result = await cleanItems(scan.items);
  return {
    bytesFreed: result.deletedBytes,
    itemsScanned: scan.items.length,
    itemsCleaned: scan.items.length - result.failed - result.skipped,
    itemsSkipped: result.skipped,
    durationMs: Date.now() - start,
  };
}
