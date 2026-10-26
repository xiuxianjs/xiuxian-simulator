import { parseGuildMining } from './guild-mining';
import { parseGuildWorship } from './guild-worship-stipend';
import type { GuildWorshipOffer } from './guild-worship-stipend';
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门活动响应不完整');
  }

  return value as Record<string, unknown>;
}
export function parseGuildWorshipGuide(value: unknown) {
  const row = record(value);

  if (
    typeof row.dailyWorshipDone !== 'boolean' ||
    typeof row.canWorship !== 'boolean' ||
    typeof row.introText !== 'string' ||
    typeof row.noticeText !== 'string' ||
    !Array.isArray(row.offers)
  ) {
    throw new Error('祭祀祖师引导响应不完整');
  }
  const offers = row.offers.map(value => {
    const offer = record(value);

    if (
      !['灵石', '灵晶', '道晶'].includes(offer.name as string) ||
      ![offer.cost, offer.activity, offer.contribution].every(value => typeof value === 'number' && Number.isFinite(value)) ||
      typeof offer.line !== 'string' ||
      typeof offer.canWorship !== 'boolean'
    ) {
      throw new Error('祭祀祖师引导响应不完整');
    }

    return {
      name: offer.name as GuildWorshipOffer,
      cost: offer.cost as number,
      activity: offer.activity as number,
      contribution: offer.contribution as number,
      line: offer.line,
      canWorship: offer.canWorship
    };
  });

  return { dailyWorshipDone: row.dailyWorshipDone, canWorship: row.canWorship, introText: row.introText, noticeText: row.noticeText, offers };
}
export function parseRobotGuildWorship(value: unknown) {
  const row = record(value);

  if (row.code === 'GUIDE') {
    return { code: 'GUIDE' as const, data: parseGuildWorshipGuide(row.data) };
  }
  if (row.code !== 'OK') {
    throw new Error('祭祀祖师响应不完整');
  }

  return { code: 'OK' as const, data: parseGuildWorship(row.data) };
}
export function parseRobotGuildMining(value: unknown) {
  const row = record(value);

  const receipt = parseGuildMining(row.receipt);

  if (typeof row.message !== 'string' || !row.message) {
    throw new Error('宗门采矿响应不完整');
  }

  return { message: row.message, outcome: receipt.outcome };
}
