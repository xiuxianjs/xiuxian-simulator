import { repeatPresentationHeaders } from './repeat-presentation';
import { parseTreasureEffects, type TreasureEffectNotice } from './treasure-effects';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type ActionResult = { message: string; treasureEffects?: TreasureEffectNotice[] };
type Proposal = { id: number; fromUserId: number; fromName: string; fromRealm: string; createdAt: string | Date };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('师徒服务响应不完整');
  }

  return value as Record<string, unknown>;
}
export function parseMasterAction(value: unknown): ActionResult {
  const result = record(value);

  if (typeof result.message !== 'string') {
    throw new Error('师徒服务响应不完整');
  }

  return { message: result.message, treasureEffects: parseTreasureEffects(result.treasureEffects) };
}
function proposal(value: unknown): Proposal {
  const row = record(value);

  if (!Number.isInteger(row.id) || !Number.isInteger(row.fromUserId) || typeof row.fromName !== 'string' || typeof row.fromRealm !== 'string') {
    throw new Error('师徒申请数据不完整');
  }

  return row as unknown as Proposal;
}
function id(value: string, usage: string): number {
  if (!/^\d+$/.test(value.trim()) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw new Error(usage);
  }

  return Number(value);
}
function writable(request?: BackendRequestContext, repeatCommand?: string) {
  return { ...writeContext(request), headers: repeatPresentationHeaders(repeatCommand) };
}

export async function applyBackendMaster(
  bid: string | undefined,
  uid: number,
  target: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const masterUserId = id(target, '使用方法：拜师 <师父UID|@目标>');
  const result = await requestBackend(bid, 'post_players_id_master_apply', { path: { id: uid }, body: { masterUserId }, ...writable(request, repeatCommand) });

  parseMasterAction(result);

  return { message: '已向师父发起拜师申请，等待对方同意' };
}
export async function listBackendMasterProposals(bid: string | undefined, uid: number): Promise<Proposal[]> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const rows = await requestBackend(bid, 'get_players_id_master_proposals', { path: { id: uid } });

  if (!Array.isArray(rows)) {
    throw new Error('师徒申请列表响应不完整');
  }

  return rows.map(proposal);
}
export async function acceptBackendMaster(
  bid: string | undefined,
  uid: number,
  disciple: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<ActionResult> {
  const target = id(disciple, '使用方法：同意拜师 <徒弟UID>');

  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseMasterAction(
    await requestBackend(bid, 'post_players_id_master_proposal_decision', {
      path: { id: uid },
      body: { kind: 'binding', discipleId: target, accept: true },
      ...writable(request, repeatCommand)
    })
  );
}
async function interaction(
  bid: string | undefined,
  operation: 'post_players_id_master_teach_discipleId' | 'post_players_id_master_bless_discipleId',
  uid: number,
  disciple: string,
  request?: BackendRequestContext,
  repeatCommand?: string
) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const discipleId = id(disciple, operation.includes('bless') ? '使用方法：赐福 <徒弟UID|@目标>' : '使用方法：传功 <徒弟UID|@目标>');

  const raw = record(await requestBackend(bid, operation, { path: { id: uid, discipleId }, ...writable(request, repeatCommand) }));

  return parseMasterInteraction(raw, operation.includes('bless') ? '赐福' : '传功', discipleId);
}

export function parseMasterInteraction(value: unknown, action: '传功' | '赐福', discipleId: number): ActionResult {
  const raw = record(value);
  const result = parseMasterAction(raw);

  // The service's short success message does not include its settlement facts.
  // Preserve richer messages from newer services and only expand the old label.
  if (result.message !== action) {
    return result;
  }
  const lines = [`${action}成功。`, `徒弟 UID：${discipleId}`];

  if (Number.isSafeInteger(raw.rewardExperience) && (raw.rewardExperience as number) > 0) {
    lines.push(`基础修为奖励：${raw.rewardExperience}（实际到账受境界修为上限限制）`);
  }
  if (Number.isSafeInteger(raw.virtueExperience) && (raw.virtueExperience as number) >= 0) {
    lines.push(`当前师德：${raw.virtueExperience}`);
  }
  if (Number.isSafeInteger(raw.virtueLevel) && (raw.virtueLevel as number) > 0) {
    lines.push(`师德等级：${raw.virtueLevel}`);
  }

  return { message: lines.join('\n') };
}
export const teachBackendMaster = (bid: string | undefined, uid: number, disciple: string, request?: BackendRequestContext, repeatCommand?: string) => interaction(bid, 'post_players_id_master_teach_discipleId', uid, disciple, request, repeatCommand);
export const blessBackendMaster = (bid: string | undefined, uid: number, disciple: string, request?: BackendRequestContext, repeatCommand?: string) => interaction(bid, 'post_players_id_master_bless_discipleId', uid, disciple, request, repeatCommand);
export async function giftBackendMaster(
  bid: string | undefined,
  uid: number,
  disciple: string,
  itemKey: 'peiyuan' | 'zhuji' | undefined,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const discipleId = id(disciple, '使用方法：赐丹 <徒弟UID|@目标> [培元丹|筑基丹]');

  return parseMasterAction(
    await requestBackend(bid, 'post_players_id_master_gift_discipleId', {
      path: { id: uid, discipleId },
      body: itemKey ? { itemKey } : {},
      ...writable(request, repeatCommand)
    })
  );
}
export async function applyBackendGraduation(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseMasterAction(await requestBackend(bid, 'post_players_id_master_graduation', { path: { id: uid }, ...writable(request, repeatCommand) }));
}
export async function listBackendGraduationProposals(bid: string | undefined, uid: number): Promise<Proposal[]> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const rows = await requestBackend(bid, 'get_players_id_master_graduation_proposals', { path: { id: uid } });

  if (!Array.isArray(rows)) {
    throw new Error('出师申请列表响应不完整');
  }

  return rows.map(proposal);
}
export async function decideBackendGraduation(
  bid: string | undefined,
  uid: number,
  disciple: string,
  accept: boolean,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const target = id(disciple, accept ? '使用方法：同意出师 <徒弟UID>' : '使用方法：拒绝出师 <徒弟UID>');

  return parseMasterAction(
    await requestBackend(bid, 'post_players_id_master_proposal_decision', {
      path: { id: uid },
      body: { kind: 'graduation', discipleId: target, accept },
      ...writable(request, repeatCommand)
    })
  );
}
export async function rebelBackendMaster(bid: string | undefined, uid: number, request?: BackendRequestContext, repeatCommand?: string): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseMasterAction(await requestBackend(bid, 'post_players_id_master_rebel', { path: { id: uid }, ...writable(request, repeatCommand) }));
}
export async function expelBackendMaster(
  bid: string | undefined,
  uid: number,
  disciple: string,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<ActionResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const discipleId = id(disciple, '使用方法：逐出师门 <徒弟UID|@目标>');

  return parseMasterAction(
    await requestBackend(bid, 'post_players_id_master_disciples_discipleId_expel', { path: { id: uid, discipleId }, ...writable(request, repeatCommand) })
  );
}
export async function claimBackendMasterTitle(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<{ title: string }> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const row = record(await requestBackend(bid, 'post_players_id_master_title_claim', { path: { id: uid }, ...writable(request) }));

  if (typeof row.title !== 'string') {
    throw new Error('师门称号响应不完整');
  }

  return { title: row.title };
}

export function parseMasterDecision(value: unknown): { outcome: 'list'; received: Proposal[] } | { outcome: 'decided'; message: string } {
  const data = record(value);

  if (data.outcome === 'list' && Array.isArray(data.received)) {
    return { outcome: 'list', received: data.received.map(proposal) };
  }
  if (data.outcome === 'decided') {
    return { outcome: 'decided', ...parseMasterAction(data) };
  }
  throw new Error('师徒审批响应不完整');
}

export function parseMasterTargetAction(
  value: unknown,
  action: '传功' | '赐福' | '赐丹' | '逐出师门' | '拜师'
): { outcome: 'usage' } | { outcome: 'result'; message: string } {
  const data = record(value);

  if (data.outcome === 'usage') {
    return { outcome: 'usage' };
  }
  if (data.outcome !== 'result' || !Number.isSafeInteger(data.targetUid) || Number(data.targetUid) <= 0) {
    throw new Error('师徒操作响应不完整');
  }
  const parsed = action === '传功' || action === '赐福' ? parseMasterInteraction(data, action, Number(data.targetUid)) : parseMasterAction(data);

  return { outcome: 'result', message: parsed.message };
}

export function parseMasterClaimTitle(value: unknown): { title: string } {
  const data = record(value);

  if (typeof data.title !== 'string' || !data.title) {
    throw new Error('师门称号响应不完整');
  }

  return { title: data.title };
}
