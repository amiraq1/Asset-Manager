import { NativeModules, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import {
  cleanItems as cleanCacheItems,
  scanForJunk,
} from "@/services/JunkScannerService";
import type { JunkCategory, JunkItem, JunkScanResult } from "@/types";
import { createLogger } from "@/utils/logger";

const log = createLogger("JunkScanner");

interface JunkScannerNativeModule {
  getDeepSystemJunk?: () => Promise<
    Array<{
      uri: string;
      name?: string;
      sizeBytes: number;
      category?: JunkCategory;
    }>
  >;
  deleteFiles?: (
    uris: string[],
  ) => Promise<{ deletedBytes: number; failed: string[] }>;
}

function getNativeModule(): JunkScannerNativeModule | null {
  const mod = (NativeModules as Record<string, unknown>).JunkScanner;
  if (mod && typeof mod === "object") return mod as JunkScannerNativeModule;
  return null;
}

export function isNativeJunkScannerAvailable(): boolean {
  return Platform.OS === "android" && getNativeModule() !== null;
}

/**
 * Detects empty subdirectories under the cache root. We treat them as
 * recoverable junk because they're the residue of cleared caches.
 */
async function findEmptyFolders(): Promise<JunkItem[]> {
  if (Platform.OS === "web" || !FileSystem.cacheDirectory) return [];
  const out: JunkItem[] = [];
  try {
    const top = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    for (const name of top) {
      const uri = FileSystem.cacheDirectory.endsWith("/")
        ? `${FileSystem.cacheDirectory}${name}`
        : `${FileSystem.cacheDirectory}/${name}`;
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || !info.isDirectory) continue;
        const children = await FileSystem.readDirectoryAsync(uri);
        if (children.length === 0) {
          out.push({
            uri,
            name,
            sizeBytes: 0,
            modifiedAt: Date.now(),
            category: "emptyFolder",
          });
        }
      } catch {
        // ignore unreadable entries
      }
    }
  } catch (err) {
    log.warn("findEmptyFolders failed", err);
  }
  return out;
}

/**
 * Probes the native deep-scanner. Returns an empty array (not an error)
 * when the module is missing — the screen instead surfaces a synthetic
 * placeholder row labelled "Requires Native Module" so the user knows
 * what they'd unlock once Kotlin lands.
 */
async function getDeepSystemJunk(): Promise<{
  items: JunkItem[];
  nativeAvailable: boolean;
}> {
  const native = getNativeModule();
  if (!native?.getDeepSystemJunk) {
    return { items: [], nativeAvailable: false };
  }
  try {
    const raw = await native.getDeepSystemJunk();
    const items: JunkItem[] = raw.map((r, idx) => ({
      uri: r.uri,
      name: r.name ?? r.uri.split("/").pop() ?? `system-${idx}`,
      sizeBytes: Math.max(0, r.sizeBytes),
      modifiedAt: Date.now(),
      category: r.category ?? "systemDeep",
      requiresNative: true,
    }));
    return { items, nativeAvailable: true };
  } catch (err) {
    log.error("getDeepSystemJunk failed", err);
    return { items: [], nativeAvailable: false };
  }
}

/**
 * Full scan: combines the real cache walk, empty-folder detection, and
 * (when available) the native deep-system bridge. Always succeeds —
 * unreachable layers are simply omitted.
 */
export async function scanJunkFiles(): Promise<JunkScanResult> {
  const [cacheScan, emptyFolders, deep] = await Promise.all([
    scanForJunk(),
    findEmptyFolders(),
    getDeepSystemJunk(),
  ]);

  const items: JunkItem[] = [
    ...cacheScan.items,
    ...emptyFolders,
    ...deep.items,
  ];

  // When the native bridge is missing, expose a single honest placeholder
  // so the UI can show what would be unlocked in the production build.
  if (!deep.nativeAvailable) {
    items.push({
      uri: "native://JunkScanner.getDeepSystemJunk",
      name: "System Corpses & Deep Cache",
      sizeBytes: 0,
      modifiedAt: Date.now(),
      category: "systemDeep",
      requiresNative: true,
      note: "Requires Native Module",
    });
  }

  // Also surface a known APK location (real on Android via Downloads /
  // sdcard) only when native bridge is present; otherwise leave it out.
  // No fake APK rows here.

  const byCategory = items.reduce(
    (acc, it) => {
      const slot = acc[it.category] ?? { count: 0, bytes: 0 };
      slot.count += 1;
      slot.bytes += it.sizeBytes;
      acc[it.category] = slot;
      return acc;
    },
    {} as Record<JunkCategory, { count: number; bytes: number }>,
  );

  const totalBytes = items.reduce((s, it) => s + it.sizeBytes, 0);
  items.sort((a, b) => b.sizeBytes - a.sizeBytes);

  return {
    totalBytes,
    itemCount: items.length,
    byCategory,
    items,
    scannedDirs: cacheScan.scannedDirs,
    scannedAt: Date.now(),
  };
}

export interface CleanJunkResult {
  deletedBytes: number;
  cleaned: number;
  failed: number;
  skipped: number;
  /** Items that needed a native bridge that wasn't installed. */
  pendingNative: number;
}

/**
 * Cleans a list of junk items. JS-accessible items go through the
 * existing cache-deletion path; restricted items (system deep cache,
 * obsolete APKs outside the sandbox, etc.) are forwarded to the
 * `JunkScanner.deleteFiles` native bridge if it exists, otherwise
 * counted as `pendingNative` so the UI can report them honestly.
 */
export async function cleanJunk(items: JunkItem[]): Promise<CleanJunkResult> {
  const accessible = items.filter((i) => !i.requiresNative);
  const restricted = items.filter((i) => i.requiresNative);

  const local = await cleanCacheItems(accessible);

  let nativeDeleted = 0;
  let nativeFailed = 0;
  let pendingNative = 0;

  if (restricted.length > 0) {
    const native = getNativeModule();
    if (native?.deleteFiles) {
      try {
        const realRestricted = restricted.filter(
          (i) => !i.uri.startsWith("native://"),
        );
        if (realRestricted.length > 0) {
          const res = await native.deleteFiles(
            realRestricted.map((i) => i.uri),
          );
          nativeDeleted = res.deletedBytes;
          nativeFailed = res.failed.length;
        }
      } catch (err) {
        log.error("native deleteFiles failed", err);
        nativeFailed += restricted.length;
      }
    } else {
      pendingNative = restricted.length;
    }
  }

  return {
    deletedBytes: local.deletedBytes + nativeDeleted,
    cleaned: accessible.length - local.failed - local.skipped,
    failed: local.failed + nativeFailed,
    skipped: local.skipped,
    pendingNative,
  };
}
