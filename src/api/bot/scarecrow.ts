import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type BackendScarecrowSkillStat = { skillName: string; count: number; totalDamage: number; damageShareText: string };
export type BackendScarecrowSummary = {
  totalDamage: number;
  skillDamage: number;
  buffDamage: number;
  skills: BackendScarecrowSkillStat[];
  totalSkillAttacks: number;
  critCount: number;
  critRate: number;
  critRateText: string;
  buffDamageShareText: string;
  maxSingleDamage: number;
  maxSingleDamageSkill: string;
  maxSingleDamageRound: number;
};
export type BackendScarecrowResult = { summary: BackendScarecrowSummary; logId: string; rounds: number };

function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('稻草人测试响应不完整');
  }

  return value as Record<string, unknown>;
}
function integerField(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('稻草人测试响应不完整');
  }

  return value;
}
function numberField(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('稻草人测试响应不完整');
  }

  return value;
}

export async function challengeBackendScarecrow(
  bid: string,
  uid: number,
  roundsText: string | undefined,
  request?: BackendRequestContext
): Promise<BackendScarecrowResult> {
  if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1 || (roundsText !== undefined && !/^\d+$/.test(roundsText))) {
    throw new Error('稻草人测试参数无效');
  }

  return parseBackendScarecrow(
    await requestBackend(bid, 'post_players_id_scarecrow_challenge', {
      path: { id: uid },
      body: { ...(roundsText === undefined ? {} : { roundsText }) },
      ...writeContext(request)
    })
  );
}

export function parseBackendScarecrow(value: unknown): BackendScarecrowResult {
  const data = row(value);
  const summary = row(data.summary);

  if (
    typeof data.logId !== 'string' ||
    !Array.isArray(summary.skills) ||
    typeof summary.critRateText !== 'string' ||
    typeof summary.buffDamageShareText !== 'string' ||
    typeof summary.maxSingleDamageSkill !== 'string'
  ) {
    throw new Error('稻草人测试响应不完整');
  }
  const skills = summary.skills.map(value => {
    const skill = row(value);

    if (typeof skill.skillName !== 'string' || typeof skill.damageShareText !== 'string') {
      throw new Error('稻草人测试响应不完整');
    }

    return {
      skillName: skill.skillName,
      count: integerField(skill.count),
      totalDamage: integerField(skill.totalDamage),
      damageShareText: skill.damageShareText
    };
  });

  return {
    logId: data.logId,
    rounds: integerField(data.rounds),
    summary: {
      totalDamage: integerField(summary.totalDamage),
      skillDamage: integerField(summary.skillDamage),
      buffDamage: integerField(summary.buffDamage),
      skills,
      totalSkillAttacks: integerField(summary.totalSkillAttacks),
      critCount: integerField(summary.critCount),
      critRate: numberField(summary.critRate),
      critRateText: summary.critRateText,
      buffDamageShareText: summary.buffDamageShareText,
      maxSingleDamage: integerField(summary.maxSingleDamage),
      maxSingleDamageSkill: summary.maxSingleDamageSkill,
      maxSingleDamageRound: integerField(summary.maxSingleDamageRound)
    }
  };
}
