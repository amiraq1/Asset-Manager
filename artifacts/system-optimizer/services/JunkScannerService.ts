import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import type { JunkCategory, JunkItem, JunkScanResult } from "@/types";
import { createLogger } from "@/utils/logger";

const log = createLogger("JunkScanner");

const MAX_DEPTH = 4;
const EMPTY: Record<JunkCategory, { count: number; bytes: number }> = {
  cache: { count: 0, bytes: 0 },
  temp: { count: 0, bytes: 0 },
  log: { count: 0, bytes: 0 },
  other: { count: 0, bytes: 0 },
};

function categorize(name: string, parentDir: string): JunkCategory {
  const lower = name.toLowerCase();
  const parent = parentDir.toLowerCase();
  if (parent.includes("cache") || lower.endsWith(".cache")) return "cache";
  if (lower.endsWith(".tmp") || lower.endsWith(".temp") || parent.includes("tmp"))
    return "temp";
  if (lower.endsWith(".log")) return "log";
  return "other";
}

async function walk(
  dir: string,
  depth: number,
  out: JunkItem[],
): Promise<void> {
  if (depth > MAX_DEPTH) return;
  let names: string[];
  try {
    names = await FileSystem.readDirectoryAsync(dir);
  } catch (err) {
    log.warn(`readDirectoryAsync failed for ${dir}`, err);
    return;
  }
  for (const name of names) {
    const uri = dir.endsWith("/") ? `${dir}${name}` : `${dir}/${name}`;
    let info: FileSystem.FileInfo;
    try {
      info = await FileSystem.getInfoAsync(uri, { size: true });
    } catch (err) {
      log.warn(`getInfoAsync failed for ${uri}`, err);
      continue;
    }
    if (!info.exists) continue;
    if (info.isDirectory) {
      await walk(uri, depth + 1, out);
      continue;
    }
    const size = "size" in info && typeof info.size === "number" ? info.size : 0;
    if (size <= 0) continue;
    out.push({
      uri,
      name,
      sizeBytes: size,
      modifiedAt:
        "modificationTime" in info && typeof info.modificationTime === "number"
          ? info.modificationTime * 1000
          : Date.now(),
      category: categorize(name, dir),
    });
  }
}

function getScanRoots(): string[] {
  if (Platform.OS === "web") return [];
  const roots: string[] = [];
  if (FileSystem.cacheDirectory) roots.push(FileSystem.cacheDirectory);
  // documentDirectory is intentionally NOT scanned by default — it
  // contains user data. We only scan caches.
  return roots;
}

export async function scanForJunk(): Promise<JunkScanResult> {
  const items: JunkItem[] = [];
  const roots = getScanRoots();
  for (const root of roots) {
    await walk(root, 0, items);
  }
  const byCategory: Record<JunkCategory, { count: number; bytes: number }> = {
    cache: { ...EMPTY.cache },
    temp: { ...EMPTY.temp },
    log: { ...EMPTY.log },
    other: { ...EMPTY.other },
  };
  let totalBytes = 0;
  for (const item of items) {
    byCategory[item.category].count += 1;
    byCategory[item.category].bytes += item.sizeBytes;
    totalBytes += item.sizeBytes;
  }
  items.sort((a, b) => b.sizeBytes - a.sizeBytes);
  return {
    totalBytes,
    itemCount: items.length,
    byCategory,
    items,
    scannedDirs: roots,
    scannedAt: Date.now(),
  };
}

/**
 * SAFETY: only allow deletion of URIs that live underneath the app's own
 * cache directory. Persisted scan results, tampering, or stale data could
 * otherwise point at the document directory or other user data.
 */
function isInsideCache(uri: string): boolean {
  const cacheRoot = FileSystem.cacheDirectory;
  if (!cacheRoot) return false;
  return uri.startsWith(cacheRoot);
}

export async function cleanItems(items: JunkItem[]): Promise<{
  deletedBytes: number;
  failed: number;
  skipped: number;
}> {
  let deletedBytes = 0;
  let failed = 0;
  let skipped = 0;
  for (const item of items) {
    if (!isInsideCache(item.uri)) {
      skipped += 1;
      log.warn(`refused to delete out-of-cache uri: ${item.uri}`);
      continue;
    }
    try {
      await FileSystem.deleteAsync(item.uri, { idempotent: true });
      deletedBytes += item.sizeBytes;
    } catch (err) {
      failed += 1;
      log.warn(`deleteAsync failed for ${item.uri}`, err);
    }
  }
  return { deletedBytes, failed, skipped };
}
