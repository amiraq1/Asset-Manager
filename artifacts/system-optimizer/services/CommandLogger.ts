export type LogStatus = "pending" | "success" | "error";
export type LogType = "root" | "shizuku" | "fs" | "ai";

export interface SystemLog {
  id: string;
  timestamp: string;
  command: string;
  status: LogStatus;
  type: LogType;
}

type LogListener = (logs: SystemLog[]) => void;

class CommandLogger {
  private logs: SystemLog[] = [];
  private listeners: Set<LogListener> = new Set();

  public getLogs(): SystemLog[] {
    return [...this.logs];
  }

  public addLog(command: string, type: LogType): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const newLog: SystemLog = {
      id,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      command,
      status: "pending",
      type,
    };
    
    // Limit log size to prevent memory issues
    if (this.logs.length > 200) {
      this.logs.shift();
    }
    
    this.logs.push(newLog);
    this.notify();
    return id;
  }

  public updateLog(id: string, status: LogStatus): void {
    const logIndex = this.logs.findIndex((l) => l.id === id);
    if (logIndex !== -1) {
      this.logs[logIndex] = { ...this.logs[logIndex], status };
      this.notify();
    }
  }

  public clear(): void {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.logs);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.logs));
  }
}

export const commandLogger = new CommandLogger();
