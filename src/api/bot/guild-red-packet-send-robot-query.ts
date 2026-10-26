import { parseGuildRedPacketSend } from './guild-red-packet-mutations';

export function guildRedPacketSendArguments(args: string[]) {
  const number = (text: string | undefined) => (text === undefined ? null : { text, value: Number.isFinite(Number(text)) ? Number(text) : null });

  return { currency: args[0] ?? null, count: number(args[1]), amount: number(args[2]) };
}

export function parseRobotGuildRedPacketSend(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('发红包响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (data.outcome === 'usage') {
    return { outcome: 'usage' as const };
  }
  if (data.outcome !== 'result') {
    throw new Error('发红包响应不完整');
  }

  return { outcome: 'result' as const, receipt: parseGuildRedPacketSend(data.receipt) };
}
