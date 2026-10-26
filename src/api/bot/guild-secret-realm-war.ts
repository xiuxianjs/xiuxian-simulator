import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type RecordValue = Record<string, unknown>;
function row(value: unknown, message: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as RecordValue;
}
function integer(value: unknown, message: string, minimum = -Infinity): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(message);
  }

  return value;
}
function positiveInteger(value: unknown, message: string): number {
  const parsed = integer(value, message);

  if (parsed <= 0) {
    throw new Error(message);
  }

  return parsed;
}
function finite(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(message);
  }

  return value;
}
function text(value: unknown, message: string): string {
  if (typeof value !== 'string') {
    throw new Error(message);
  }

  return value;
}
function bool(value: unknown, message: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }

  return value;
}

export type SecretRealmHome = {
  isActive: boolean;
  activeStart: string;
  activeEnd: string;
  attackUsed: number;
  maxAttack: number;
  guildId: number | null;
  guildName: string;
  joinAt: string | null;
  memberRoleName: string;
  activeData: unknown | null;
  settledData: unknown | null;
  display: {
    participationNotice?: string;
    statusLabel: string;
    attackRemaining: number;
    membershipNotice: string;
    activeOwnedText: string | null;
    outputMultiplierText: string | null;
    settledOwnedText: string | null;
    rewardText: string | null;
    canPromptClaim: boolean;
  };
};
export type SecretRealmList = { items: unknown[] };
export type SecretRealmView = { positions: unknown[] };

export function parseBackendSecretRealmHome(value: unknown): SecretRealmHome {
  const r = row(value, '灵脉攻防战主页响应不完整');
  const display = row(r.display, '灵脉攻防战主页展示投影不完整');
  const guildId = r.guildId === null ? null : positiveInteger(r.guildId, '灵脉攻防战主页响应不完整');
  const nullableText = (value: unknown) => (value === null ? null : text(value, '灵脉攻防战主页展示投影不完整'));
  const activeOwnedText = nullableText(display.activeOwnedText);
  const outputMultiplierText = nullableText(display.outputMultiplierText);
  const settledOwnedText = nullableText(display.settledOwnedText);
  const rewardText = nullableText(display.rewardText);

  if ((activeOwnedText === null) !== (outputMultiplierText === null) || (settledOwnedText === null) !== (rewardText === null)) {
    throw new Error('灵脉攻防战主页展示投影不完整');
  }

  return {
    isActive: bool(r.isActive, '灵脉攻防战主页响应不完整'),
    activeStart: text(r.activeStart, '灵脉攻防战主页响应不完整'),
    activeEnd: text(r.activeEnd, '灵脉攻防战主页响应不完整'),
    attackUsed: integer(r.attackUsed, '灵脉攻防战主页响应不完整'),
    maxAttack: integer(r.maxAttack, '灵脉攻防战主页响应不完整'),
    guildId,
    guildName: text(r.guildName, '灵脉攻防战主页响应不完整'),
    joinAt: r.joinAt === null ? null : text(r.joinAt, '灵脉攻防战主页响应不完整'),
    memberRoleName: text(r.memberRoleName, '灵脉攻防战主页响应不完整'),
    activeData: r.activeData === undefined ? null : r.activeData,
    settledData: r.settledData === undefined ? null : r.settledData,
    display: {
      participationNotice: display.participationNotice === undefined ? '' : text(display.participationNotice, '灵脉攻防战主页展示投影不完整'),
      statusLabel: text(display.statusLabel, '灵脉攻防战主页展示投影不完整'),
      attackRemaining: integer(display.attackRemaining, '灵脉攻防战主页展示投影不完整'),
      membershipNotice: text(display.membershipNotice, '灵脉攻防战主页展示投影不完整'),
      activeOwnedText,
      outputMultiplierText,
      settledOwnedText,
      rewardText,
      canPromptClaim: bool(display.canPromptClaim, '灵脉攻防战主页展示投影不完整')
    }
  };
}
export async function getBackendSecretRealmHome(bid: string | undefined, uid: number): Promise<SecretRealmHome> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendSecretRealmHome(await requestBackend(bid, 'get_players_id_secret_realms_home', { path: { id: uid } }));
}
export async function getBackendSecretRealms(bid: string | undefined, page: number): Promise<SecretRealmList> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_secret_realms', { query: { page, pageSize: 5 } });

  return parseBackendSecretRealmList(data);
}

export function parseBackendSecretRealmList(data: unknown): SecretRealmList {
  if (!Array.isArray(data)) {
    throw new Error('灵脉攻防战列表响应不完整');
  }

  return { items: data };
}
export async function getBackendSecretRealm(bid: string | undefined, realmNo: number, page: number): Promise<SecretRealmView> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_secret_realms_realmNo', { path: { realmNo }, query: { page, pageSize: 5 } });

  return parseBackendSecretRealmView(data);
}

export function parseBackendSecretRealmView(data: unknown): SecretRealmView {
  if (!Array.isArray(data)) {
    throw new Error('灵脉攻防战详情响应不完整');
  }

  return { positions: data };
}
export async function challengeBackendSecretRealm(
  bid: string | undefined,
  uid: number,
  realmNo: number,
  positionNo: number,
  request?: BackendRequestContext
): Promise<{ won: boolean; realmNo: number; positionNo: number; frozenUntil?: string }> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseBackendSecretRealmChallenge(
    await requestBackend(bid, 'post_players_id_secret_realms_realmNo_positions_positionNo_challenge', {
      path: { id: uid, realmNo, positionNo },
      ...writeContext(request)
    })
  );
}

export function parseBackendSecretRealmChallenge(value: unknown): {
  won: boolean;
  realmNo: number;
  positionNo: number;
  frozenUntil?: string;
  participationContribution: number;
} {
  const data = row(value, '灵脉攻防战挑战响应不完整');

  if (data.frozenUntil !== undefined && (typeof data.frozenUntil !== 'string' || !Number.isFinite(Date.parse(data.frozenUntil)))) {
    throw new Error('灵脉攻防战挑战响应不完整');
  }

  return {
    ...data,
    participationContribution: data.participationContribution === undefined ? 0 : integer(data.participationContribution, '灵脉攻防战挑战响应不完整', 0),
    won: bool(data.won, '灵脉攻防战挑战响应不完整'),
    realmNo: positiveInteger(data.realmNo, '灵脉攻防战挑战响应不完整'),
    positionNo: positiveInteger(data.positionNo, '灵脉攻防战挑战响应不完整'),
    ...(typeof data.frozenUntil === 'string' ? { frozenUntil: data.frozenUntil } : {})
  };
}
export async function claimBackendSecretRealm(bid: string | undefined, uid: number, request?: BackendRequestContext) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseBackendSecretRealmClaim(await requestBackend(bid, 'post_players_id_secret_realms_claim', { path: { id: uid }, ...writeContext(request) }));
}

export function parseBackendSecretRealmClaim(value: unknown) {
  const data = row(value, '灵脉攻防战领奖响应不完整');

  return {
    ...data,
    spiritCrystal: integer(data.spiritCrystal, '灵脉攻防战领奖响应不完整', 0),
    contribution: integer(data.contribution, '灵脉攻防战领奖响应不完整', 0),
    reputation: integer(data.reputation, '灵脉攻防战领奖响应不完整', 0),
    ownedRealms: positiveInteger(data.ownedRealms, '灵脉攻防战领奖响应不完整'),
    reputationAlreadyClaimed: bool(data.reputationAlreadyClaimed, '灵脉攻防战领奖响应不完整')
  };
}
export { finite };
