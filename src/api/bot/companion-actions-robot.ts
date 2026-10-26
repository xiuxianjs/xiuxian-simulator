import { parseBackendCompanionOathPreview } from './companion-oath-preview';
import { parseCompanionProposalInbox } from './companion-proposal-queries';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('道侣操作响应不完整');
  }

  return value as Record<string, unknown>;
}
function result(data: Record<string, unknown>) {
  if (data.mode !== 'result' || typeof data.message !== 'string') {
    throw new Error('道侣操作响应不完整');
  }

  return { mode: 'result' as const, message: data.message };
}
export function parseRobotCompanionProposalAction(value: unknown) {
  const data = record(value);

  if (data.mode === 'list') {
    return { mode: 'list' as const, received: parseCompanionProposalInbox(data).map(p => ({ fromName: p.fromName, intimacy: p.intimacy })) };
  }

  return result(data);
}
export function parseRobotCompanionRejection(value: unknown) {
  return result(record(value));
}
export function parseRobotCompanionBreakup(value: unknown) {
  const data = record(value);

  if (data.mode === 'preview') {
    if (typeof data.partnerName !== 'string') {
      throw new Error('道侣操作响应不完整');
    }

    return { mode: 'preview' as const, partnerName: data.partnerName };
  }
  const mutation = result(data);

  if (typeof data.narrativeText !== 'string' || !data.narrativeText.trim()) {
    throw new Error('解除道侣响应缺少服务端叙事');
  }

  return { ...mutation, narrativeText: data.narrativeText };
}

export function parseRobotCompanionOathUpgrade(value: unknown) {
  const data = record(value);

  if (data.mode === 'preview') {
    return { mode: 'preview' as const, ...parseBackendCompanionOathPreview(data) };
  }
  const mutation = result(data);

  if (typeof data.partnerName !== 'string') {
    throw new Error('誓约升级预览数据不完整');
  }

  return { ...mutation, partnerName: data.partnerName };
}
