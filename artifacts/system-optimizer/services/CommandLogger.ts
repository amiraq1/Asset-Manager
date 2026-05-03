export type LogStatus = "pending" | "success" | "error";
export type LogSource = "ROOT" | "SHIZUKU" | "SYSTEM";
export type LogType = "root" | "shizuku" | "fs" | "ai";

export interface LogEntry {
  id: string;
  timestamp: number;
  command: string;
  status: LogStatus;
  source: LogSource;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  command: string;
  status: LogStatus;
  type: LogType;
}

type Listener = () => void;
type LogListener = (logs: SystemLog[]) => void;

const MAX_LOGS = 500;

class CommandLoggerImpl {
  private logs: LogEntry[] = [];
  private listeners = new Set<Listener>();

  private systemListeners = new Set<LogListener>();
  private nextId = 1;

  getLogs = (): LogEntry[] => this.logs;

  getSystemLogs(): SystemLog[] {
    return this.logs.map((log) => ({
      id: log.id,
      timestamp: new Date(log.timestamp).toLocaleTimeString([], {
        hour12: false,
      }),
      command: log.command,
      status: log.status,
      type: this.toLogType(log.source),
    }));
  }

  addLog(command: string, source: LogSource | LogType): string {
    const normalizedSource = this.toLogSource(source);
    const id = `cmd_${Date.now().toString(36)}_${this.nextId++}`;

    const entry: LogEntry = {
      id,
      timestamp: Date.now(),
      command,
      status: "pending",
      source: normalizedSource,
    };

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

  clear(): void {
    this.clearLogs();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  subscribeSystem(listener: LogListener): () => void {
    this.systemListeners.add(listener);
    listener(this.getSystemLogs());
    return () => {
      this.systemListeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) listener();

    const systemLogs = this.getSystemLogs();
    for (const listener of this.systemListeners) listener(systemLogs);
  }

  private toLogSource(source: LogSource | LogType): LogSource {
    switch (source) {
      case "root":
        return "ROOT";
      case "shizuku":
        return "SHIZUKU";
      case "fs":
      case "ai":
        return "SYSTEM";
      default:
        return source;
    }
  }

  private toLogType(source: LogSource): LogType {
    switch (source) {
      case "ROOT":
        return "root";
      case "SHIZUKU":
        return "shizuku";
      case "SYSTEM":
      default:
        return "fs";
    }
  }
}

export const CommandLogger = new CommandLoggerImpl();
export const commandLogger = CommandLogger;