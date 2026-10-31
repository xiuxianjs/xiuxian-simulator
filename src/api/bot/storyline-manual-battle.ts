import { requestBackend, writeContext } from './client';
import { parseNormalExperienceGained, parseTreasureEffects } from './treasure-effects';
import type { BackendRequestContext } from './context';

export type ManualSkillOption = { type: 'normal' | 'battle' | 'divine'; name: string; available: boolean; reason?: string };
export type ManualChoice = { unitId: string; unitName: string; side: 'A' | 'B'; round: number; availableSkills: ManualSkillOption[] };
export type StorylineManualBattleState = {
  sessionId: string;
  choice?: ManualChoice;
  finished: boolean;
  winner?: string;
  events: unknown[];
  settlement?: unknown;
  logId?: string;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('主线手动战斗响应不完整');
  }

  return value as Record<string, unknown>;
}
export function parseStorylineManualBattleState(value: unknown): StorylineManualBattleState {
  const data = record(value);
  // A Go nil slice is an empty event batch, serialized as null.
  const events = data.events === null ? [] : data.events;

  if (typeof data.sessionId !== 'string' || typeof data.finished !== 'boolean' || !Array.isArray(events)) {
    throw new Error('主线手动战斗响应不完整');
  }
  let choice: ManualChoice | undefined;

  if (data.choice !== undefined && data.choice !== null) {
    const raw = record(data.choice);

    if (
      typeof raw.unitId !== 'string' ||
      typeof raw.unitName !== 'string' ||
      (raw.side !== 'A' && raw.side !== 'B') ||
      !Number.isInteger(raw.round) ||
      !Array.isArray(raw.availableSkills)
    ) {
      throw new Error('主线手动战斗选技数据不完整');
    }
    choice = {
      unitId: raw.unitId,
      unitName: raw.unitName,
      side: raw.side,
      round: raw.round as number,
      availableSkills: raw.availableSkills.map(value => {
        const skill = record(value);

        if (
          typeof skill.type !== 'string' ||
          !['normal', 'battle', 'divine'].includes(skill.type) ||
          typeof skill.name !== 'string' ||
          typeof skill.available !== 'boolean'
        ) {
          throw new Error('主线手动战斗技能数据不完整');
        }

        return {
          type: skill.type as ManualSkillOption['type'],
          name: skill.name,
          available: skill.available,
          ...(typeof skill.reason === 'string' ? { reason: skill.reason } : {})
        };
      })
    };
  }
  const settlement = data.settlement === undefined || data.settlement === null ? data.settlement : record(data.settlement);

  if (settlement) {
    parseTreasureEffects(settlement.treasureEffects);
    parseNormalExperienceGained(settlement.normalExperienceGained);
  }

  return {
    sessionId: data.sessionId,
    choice,
    finished: data.finished,
    ...(typeof data.winner === 'string' ? { winner: data.winner } : {}),
    events,
    ...(typeof data.logId === 'string' ? { logId: data.logId } : {}),
    ...(settlement !== undefined ? { settlement } : {})
  };
}
export async function submitBackendStorylineManualChoice(
  bid: string,
  uid: number,
  sessionId: string,
  choice: string,
  request: BackendRequestContext
): Promise<StorylineManualBattleState> {
  if (!sessionId || !choice) {
    throw new Error('主线战斗选技参数无效');
  }

  return parseStorylineManualBattleState(
    await requestBackend(bid, 'post_players_id_storyline_manual_battles_sessionId_choices', {
      path: { id: uid, sessionId },
      body: { choice },
      ...writeContext(request)
    })
  );
}

export async function readBackendStorylineManualBattle(bid: string, uid: number, sessionId: string): Promise<StorylineManualBattleState> {
  if (!sessionId) {
    throw new Error('主线战斗会话参数无效');
  }

  return parseStorylineManualBattleState(await requestBackend(bid, 'get_players_id_storyline_manual_battles_sessionId', { path: { id: uid, sessionId } }));
}

export async function startBackendStorylineChallenge(
  bid: string,
  uid: number,
  chapterNumber: number,
  stageNumber: number,
  request: BackendRequestContext
): Promise<StorylineManualBattleState> {
  return parseStorylineManualBattleState(
    await requestBackend(bid, 'post_players_id_storyline_challenge_command', {
      path: { id: uid },
      body: { chapterNumber, stageNumber },
      ...writeContext(request)
    })
  );
}

export function parseStorylineChallengeBusiness(value: unknown) {
  if (record(value).outcome === 'ignored') {
    return { ignored: true as const };
  }

  return { ignored: false as const, state: parseStorylineManualBattleState(value) };
}
