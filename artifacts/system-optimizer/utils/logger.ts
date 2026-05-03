/**
 * Tiny logger wrapper. In dev we go to console; in production we drop
 * everything except errors. Avoids leaking debug info in shipped builds.
 */

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, scope: string, message: string, data?: unknown) {
  if (!__DEV__ && level !== "error" && level !== "warn") return;
  const prefix = `[${scope}]`;
  // eslint-disable-next-line no-console
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;
  if (data !== undefined) fn(prefix, message, data);
  else fn(prefix, message);
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, data?: unknown) => emit("debug", scope, msg, data),
    info: (msg: string, data?: unknown) => emit("info", scope, msg, data),
    warn: (msg: string, data?: unknown) => emit("warn", scope, msg, data),
    error: (msg: string, data?: unknown) => emit("error", scope, msg, data),
  };
}
