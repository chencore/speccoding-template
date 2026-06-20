import { Agent } from "@earendil-works/pi-agent-core";
import type { AgentMessage, AgentTool } from "@earendil-works/pi-agent-core";
import type { TSchema } from "typebox";
import { DEFAULT_MODEL } from "./models.js";
import { allTools } from "./tools/index.js";

const SYSTEM_PROMPT = "你是自媒体创作工作台的 AI 助手，辅助选题与文案生成。";

export interface AskOptions {
  tools?: AgentTool<TSchema, unknown>[];
  systemPrompt?: string;
}

export interface AskResult {
  text: string;
  messages: AgentMessage[];
}

export async function ask(
  message: string,
  opts?: AskOptions,
): Promise<AskResult> {
  const agent = new Agent({
    initialState: {
      model: DEFAULT_MODEL,
      systemPrompt: opts?.systemPrompt ?? SYSTEM_PROMPT,
      tools: opts?.tools ?? allTools,
    },
  });

  let finalMessages: AgentMessage[] = [];
  agent.subscribe((event) => {
    if (event.type === "agent_end") {
      finalMessages = event.messages;
    }
  });

  await agent.prompt(message);
  await agent.waitForIdle();

  const lastAssistant = [...finalMessages]
    .reverse()
    .find(
      (m): m is Extract<AgentMessage, { role: "assistant" }> =>
        m.role === "assistant",
    );

  if (lastAssistant?.stopReason === "error" && lastAssistant.errorMessage) {
    throw new Error(lastAssistant.errorMessage);
  }

  const text = extractLastAssistantText(finalMessages);
  return { text, messages: finalMessages };
}

function extractLastAssistantText(messages: AgentMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant") {
      for (const block of m.content) {
        if (block.type === "text") {
          return block.text;
        }
      }
    }
  }
  return "";
}
