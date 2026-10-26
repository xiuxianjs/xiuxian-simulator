import { parseCompanionProposalCommand } from './interaction-overview';
import { parseCompanionProposalPreflight } from './companion-proposal-preflight';

export function parseRobotCompanionPropose(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('道侣申请响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (data.mode === 'friends') {
    return { mode: 'friends' as const, preflight: parseCompanionProposalPreflight(data.preflight) };
  }
  if (data.mode !== 'command') {
    throw new Error('道侣申请响应不完整');
  }

  return { mode: 'command' as const, command: parseCompanionProposalCommand(data.command) };
}
