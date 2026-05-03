import { NativeModules } from "react-native";
import { getInstalledApps } from "@/services/DeviceStats";
import { boostRam, getRunningApps } from "@/services/TaskManager";
import { createLogger } from "@/utils/logger";

const log = createLogger("AICopilot");

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export interface CopilotStatus {
  modelName: string;
  status: "ready" | "loading" | "error" | "inferencing";
}

/**
 * Gathers real system data to provide context to the AI.
 */
export async function generateSystemPrompt(): Promise<string> {
  try {
    const runningApps = await getRunningApps();
    const installedApps = await getInstalledApps();
    
    // Calculate total estimated RAM usage
    const totalRamUsage = runningApps.reduce((acc, app) => acc + app.ramMb, 0);
    const topApps = runningApps.slice(0, 3).map(app => `${app.label} (${app.ramMb}MB)`).join(", ");

    return `System Context:
- Total Apps Installed: ${installedApps.length}
- Apps Currently Running: ${runningApps.length}
- Estimated RAM Usage: ${totalRamUsage}MB
- Top Memory Consumers: ${topApps || "None detected"}
- Device Health: ${totalRamUsage > 500 ? "Heavy Load" : "Healthy"}

You are Nabd AI, a local Edge AI Copilot for this Android device. Provide technical, concise, and helpful optimization advice.`;
  } catch (err) {
    log.error("Failed to generate system prompt", err);
    return "You are Nabd AI. System context is currently unavailable.";
  }
}

/**
 * Simulates a streaming LLM response for development.
 * In production, this would call NativeModules.LocalLLM.
 */
export async function streamAIResponse(
  userMessage: string,
  systemContext: string,
  onToken: (token: string) => void
): Promise<void> {
  const lowercaseMsg = userMessage.toLowerCase();
  let responseText = "";

  // Logic for "Tool Calling" simulation
  if (lowercaseMsg.includes("analyze ram") || lowercaseMsg.includes("clean memory") || lowercaseMsg.includes("boost")) {
    responseText = "Analyzing your system memory now... I see several background processes that can be safely optimized. I will now perform a memory boost to free up resources. \n\n[Action: Performing System Boost]";
    
    // Execute the actual tool
    try {
      const running = await getRunningApps();
      const pks = running.slice(0, 5).map(a => a.packageName);
      await boostRam(pks);
    } catch (e) {
      log.error("Auto-boost failed", e);
    }
  } else if (lowercaseMsg.includes("battery") || lowercaseMsg.includes("drain")) {
    responseText = "Checking battery consumers... Your display and background sync for social apps seem to be the primary drains. I suggest enabling 'Nightly Freeze' for social apps to extend your battery life by up to 15%.";
  } else if (lowercaseMsg.includes("deep clean") || lowercaseMsg.includes("junk")) {
    responseText = "Scanning for junk files... I've found approximately 240MB of obsolete cache and temporary files. You can head over to the 'Scan' tab to perform a deep system wipe.";
  } else {
    responseText = "Hello! I am your Nabd AI Copilot. I can help you analyze RAM, suggest deep cleaning strategies, or find battery drains. What would you like to optimize today?";
  }

  // Simulate streaming effect
  const tokens = responseText.split(" ");
  for (let i = 0; i < tokens.length; i++) {
    const chunk = tokens[i] + (i === tokens.length - 1 ? "" : " ");
    onToken(chunk);
    // Simulate typical local LLM inference speed (faster for small chunks)
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
  }
}
