import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import { createLogger } from "@/utils/logger";

const log = createLogger("CacheService");

export interface DirectorySize {
  uri: string;
  bytes: number;
  fileCount: number;
}

async function measureDir(dir: string, depth = 0): Promise<DirectorySize> {
  if (depth > 6) return { uri: dir, bytes: 0, fileCount: 0 };
  let names: string[];
  try {
    names = await FileSystem.readDirectoryAsync(dir);
  } catch (err) {
    log.warn(`readDirectoryAsync failed for ${dir}`, err);
    return { uri: dir, bytes: 0, fileCount: 0 };
  }
  let bytes = 0;
  let fileCount = 0;
  for (const name of names) {
    const uri = dir.endsWith("/") ? `${dir}${name}` : `${dir}/${name}`;
    try {
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      if (!info.exists) continue;
      if (info.isDirectory) {
        const sub = await measureDir(uri, depth + 1);
        bytes += sub.bytes;
        fileCount += sub.fileCount;
      } else if ("size" in info && typeof info.size === "number") {
        bytes += info.size;
        fileCount += 1;
      }
    } catch (err) {
      log.warn(`getInfoAsync failed for ${uri}`, err);
    }
  }
  return { uri: dir, bytes, fileCount };
}

export async function getAppCacheSize(): Promise<DirectorySize> {
  if (Platform.OS === "web" || !FileSystem.cacheDirectory) {
    return { uri: "", bytes: 0, fileCount: 0 };
  }
  return measureDir(FileSystem.cacheDirectory);
}

export async function getDocumentDirSize(): Promise<DirectorySize> {
  if (Platform.OS === "web" || !FileSystem.documentDirectory) {
    return { uri: "", bytes: 0, fileCount: 0 };
  }
  return measureDir(FileSystem.documentDirectory);
}

/**
 * Clear ALL files inside the app's cache directory.
 * Returns the number of bytes freed and the number of files deleted.
 */
export async function clearAppCache(): Promise<{
  bytesFreed: number;
  filesDeleted: number;
}> {
  if (Platform.OS === "web" || !FileSystem.cacheDirectory) {
    return { bytesFreed: 0, filesDeleted: 0 };
  }
  const before = await measureDir(FileSystem.cacheDirectory);
  let names: string[] = [];
  try {
    names = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
  } catch (err) {
    log.warn("readDirectoryAsync failed for cacheDirectory", err);
    return { bytesFreed: 0, filesDeleted: 0 };
  }
  for (const name of names) {
    const uri = `${FileSystem.cacheDirectory}${name}`;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (err) {
      log.warn(`deleteAsync failed for ${uri}`, err);
    }
  }
  return { bytesFreed: before.bytes, filesDeleted: before.fileCount };
}
