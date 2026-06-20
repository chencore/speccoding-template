import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai/base";
import type { Static } from "typebox";

const echoParameters = Type.Object({
  message: Type.String({ description: "要原样返回的内容" }),
});

export const echoTool: AgentTool<typeof echoParameters, { echoed: string }> = {
  label: "Echo",
  name: "echo",
  description: "原样返回输入的 message，用于验证工具调用链路",
  parameters: echoParameters,
  async execute(_toolCallId, params: Static<typeof echoParameters>) {
    return {
      content: [{ type: "text", text: params.message }],
      details: { echoed: params.message },
    };
  },
};
