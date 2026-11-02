export type TurnContext = { signal: AbortSignal; autonomous?: boolean };
export type AgentTool = { name: string; execute: (args: Record<string, unknown>, context: TurnContext) => Promise<unknown> };
