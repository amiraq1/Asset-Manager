import { forceDropCaches } from "@/services/RootShell";
import { createLogger } from "@/utils/logger";

const log = createLogger("AutonomousAgent");

export type StepStatus = "pending" | "active" | "success" | "error";
export type StepType = "thought" | "vision" | "action";

export interface AgentStep {
  id: string;
  type: StepType;
  text: string;
  status: StepStatus;
  /** Set when the step finishes; useful for the timeline UI. */
  finishedAt?: number;
}

export interface AgentRun {
  prompt: string;
  steps: AgentStep[];
  /** True once every step has resolved (success or error). */
  complete: boolean;
}

export type StepUpdate = (run: AgentRun) => void;

/** Sleep helper that the run loop awaits between steps. */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface PlannedStep {
  type: StepType;
  text: string;
  /** Delay BEFORE the step is marked complete. */
  delayMs: number;
  /** Optional real side-effect to trigger while the step is "active". */
  effect?: () => Promise<unknown>;
  /**
   * If `effect` throws, should we abort the rest of the run?
   * Default: false — we want the demo to keep flowing even when the
   * native bridge is missing in dev mode.
   */
  abortOnError?: boolean;
}

function plan(prompt: string): PlannedStep[] {
  return [
    {
      type: "thought",
      text: `Analyzing intent: "${prompt.trim()}"`,
      delayMs: 800,
    },
    {
      type: "vision",
      text: "Requesting UI Hierarchy (Accessibility Node Info)...",
      delayMs: 1000,
    },
    {
      type: "action",
      text: "Executing System Kernel Drop...",
      delayMs: 200,
      // Real side-effect: this triggers the Live Terminal entry too.
      effect: () => forceDropCaches(),
    },
    {
      type: "vision",
      text: "Locating target app icon...",
      delayMs: 800,
    },
    {
      type: "action",
      text: "Task Complete: Game launched.",
      delayMs: 500,
    },
  ];
}

/**
 * Runs the planned Reason→Act loop for a prompt, emitting an immutable
 * snapshot of the run after every state change so React can re-render
 * cheaply. The async generator pattern would be cleaner but a callback
 * keeps the consumer's hook (`useState`) trivial.
 */
export async function executeTask(
  prompt: string,
  onUpdate: StepUpdate,
): Promise<AgentRun> {
  const planned = plan(prompt);
  const steps: AgentStep[] = planned.map((p, i) => ({
    id: `step_${Date.now().toString(36)}_${i}`,
    type: p.type,
    text: p.text,
    status: "pending",
  }));

  const emit = (complete = false) => {
    onUpdate({
      prompt,
      steps: steps.map((s) => ({ ...s })),
      complete,
    });
  };

  emit();

  for (let i = 0; i < planned.length; i += 1) {
    const p = planned[i];
    steps[i] = { ...steps[i], status: "active" };
    emit();

    try {
      // Kick off the side-effect (if any) in parallel with the dramatic
      // delay so a real native call doesn't double the perceived latency.
      const effectPromise = p.effect ? p.effect() : Promise.resolve();
      await Promise.all([sleep(p.delayMs), effectPromise]);
      steps[i] = {
        ...steps[i],
        status: "success",
        finishedAt: Date.now(),
      };
      emit();
    } catch (err) {
      log.warn(`agent step ${i} failed`, err);
      steps[i] = {
        ...steps[i],
        status: "error",
        finishedAt: Date.now(),
      };
      emit();
      if (p.abortOnError) break;
    }
  }

  emit(true);
  return {
    prompt,
    steps: steps.map((s) => ({ ...s })),
    complete: true,
  };
}
