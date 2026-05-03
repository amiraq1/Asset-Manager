/**
 * CommandLogger — singleton pub/sub for shell commands executed through
 * native bridges (RootShell, JunkScanner, ...). Powers the Live Terminal
 * screen so the user can see exactly which commands the app issued in
 * real time. No external state lib needed; React subscribes via
 * `useSyncExternalStore`.
 */

export type LogStatus = "pending" | "success" | "error";
export type LogSource = "ROOT" | "SHIZUKU" | "SYSTEM";

export interface LogEntry {
  id: string;
  timestamp: number;
  command: string;
  status: LogStatus;
  source: LogSource;
}

type Listener = () => void;

const MAX_LOGS = 500;

class CommandLoggerImpl {
  private logs: LogEntry[] = [];
  private listeners = new Set<Listener>();
  private nextId = 1;

  getLogs = (): LogEntry[] => this.logs;

  /** Adds a `pending` entry and returns its id so the caller can resolve it later. */
  addLog(command: string, source: LogSource): string {
    const id = `cmd_${Date.now().toString(36)}_${this.nextId++}`;
    const entry: LogEntry = {
      id,
      timestamp: Date.now(),
      command,
      status: "pending",
      source,
    };
    // Push then trim so the array stays bounded — produces a new array
    // reference so React's getSnapshot detects the change.
    const next = this.logs.concat(entry);
    this.logs = next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
    this.notify();
    return id;
  }

  updateLog(id: string, status: LogStatus): void {
    const idx = this.logs.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const next = this.logs.slice();
    next[idx] = { ...next[idx], status };
    this.logs = next;
    this.notify();
  }

  clearLogs(): void {
    if (this.logs.length === 0) return;
    this.logs = [];
    this.notify();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

export const CommandLogger = new CommandLoggerImpl();
