import { getLingxuPushDestination } from '@src/api/bot/notification-relay';
import { lingxuChoiceActions } from '@src/response/lingxu/commands';
import { buildBubble, type BubbleSection } from '@src/response/presentation';
import type { NotificationDelivery } from '@src/types/notification';
import { parseGameTime } from '@src/utils/gameTime';
import type { DataEnums } from 'alemonjs';
import { deliverPlayerNotification } from './service';

const viewJournal = { label: '查看行记', command: '/灵墟洞天 行记', autoEnter: false };
const settlementTimeMask = 'YYYY.MM.DD-HH:mm';
const settlementTimePattern = /^\d{4}\.\d{2}\.\d{2}-\d{2}:\d{2}$/;
const legacySettlementTimePattern = /^\d{2}-\d{2} \d{2}:\d{2}(?:–(?:\d{2}-\d{2} )?\d{2}:\d{2})?$/;

const choiceCues = {
  FIGHT_NOISE: '你听见不远处传来兵刃声。',
  PLAYER_EXPOSED: '附近有修士显露了行踪。',
  FRIENDLY_PLAYER: '附近有修士留下了问道的传音。',
  NPC_PEACEFUL: '附近有异种徘徊，似乎并无敌意。',
  NPC_HOSTILE: '附近有敌对异种徘徊。',
  SEARCH_POINT: '附近似乎还有未搜过的藏处。',
  EN_ROUTE: '你还在赶路，可以暂作调整。',
  LOW_LIFE: '命数仅余1点，附近仍有动静。',
  BAG_NEAR_FULL: '行囊快满了，可以准备撤离。'
} as const;
const exitGates = {
  玄泽湿地: '坎门',
  玄晶矿洞: '艮门',
  青岚林: '震门',
  百草坞: '巽门',
  赤砂裂隙: '离门',
  废弃坊市: '坤门',
  秋水河滩: '兑门',
  观星台: '乾门'
} as const;

type ChoiceAction = keyof typeof lingxuChoiceActions;
const isChoiceAction = (value: unknown): value is ChoiceAction => typeof value === 'string' && Object.hasOwn(lingxuChoiceActions, value);
const contextualLabels: Readonly<Record<string, Partial<Record<ChoiceAction, string>>>> = {
  SEARCH_POINT: { SEARCH: '搜寻藏点' },
  BAG_NEAR_FULL: { SEARCH: '继续搜寻' },
  AT_EXIT: { SEARCH: '继续搜寻' },
  FRIENDLY_PLAYER: { AVOID_PLAYER: '避开接触' }
};

function lingxuChoiceSection(raw: unknown): BubbleSection | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const { nextTick, cue, region, options } = raw as { nextTick?: unknown; cue?: unknown; region?: unknown; options?: unknown };

  if (
    typeof nextTick !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:[0-5]0:00(?:Z|[+-]\d{2}:\d{2})$/.test(nextTick) ||
    !Array.isArray(options) ||
    options.length < 1 ||
    options.length > 3 ||
    !options.every(isChoiceAction) ||
    new Set(options).size !== options.length
  ) {
    return undefined;
  }
  const time = parseGameTime(nextTick);
  const remaining = (time?.valueOf() ?? 0) - Date.now();

  if (!time || time.minute() % 10 !== 0 || remaining <= 0 || remaining > 600_000) {
    return undefined;
  }
  let description: string;

  if (cue === 'AT_EXIT' && typeof region === 'string') {
    const name = region.replace(/^[坎艮震巽离坤兑乾]·阳·/u, '');

    if (!Object.hasOwn(exitGates, name)) {
      return undefined;
    }
    description = `你已抵达${name}，${exitGates[name as keyof typeof exitGates]}可以撤离。`;
  } else if ((cue === 'TREASURE_PREVIEW' || cue === 'TREASURE_OPEN') && (region === '浮空遗宫' || region === '归墟核心')) {
    description = cue === 'TREASURE_PREVIEW' ? `${region}的灵气开始汇聚。` : `${region}的机缘正在争夺。`;
  } else if (typeof cue === 'string' && Object.hasOwn(choiceCues, cue)) {
    description = choiceCues[cue as keyof typeof choiceCues];
  } else {
    return undefined;
  }

  const round = time.format('YYYY-MM-DD HH:mm');

  return {
    lines: [`动静：${description}`, `轮次：${time.format('HH:mm')} · 临场选择仅此一轮生效`],
    actions: options.map(key => {
      const { label, verb } = lingxuChoiceActions[key];
      const contextualLabel = contextualLabels[cue]?.[key] ?? label;

      return { label: contextualLabel, command: `/灵墟洞天 临场 ${round} ${verb}`, autoEnter: false };
    })
  };
}

export function lingxuNoticeData(summary: unknown, fallback: DataEnums[], tick?: unknown): DataEnums[] {
  if (summary && typeof summary === 'object') {
    const { time, lines, choice } = summary as { time?: unknown; lines?: unknown; choice?: unknown };

    if (
      typeof time === 'string' &&
      (settlementTimePattern.test(time) || legacySettlementTimePattern.test(time)) &&
      Array.isArray(lines) &&
      lines.length > 0 &&
      lines.length <= 5 &&
      lines.every(line => typeof line === 'string' && /^(?:经历|结果|掉落|损失|收获)：[^\r\n]{1,181}$/.test(line))
    ) {
      const journal = lines.map(line => line.replaceAll('生命点', '命数'));
      const context = lingxuChoiceSection(choice);
      // Preserve older ranges and use the actual settled round to recover a missing year.
      const roundTime =
        !settlementTimePattern.test(time) && !time.includes('–') && typeof tick === 'number' && Number.isSafeInteger(tick) && tick > 0
          ? (parseGameTime(tick * 1000)?.format(settlementTimeMask) ?? time)
          : time;

      return buildBubble({
        title: '灵墟洞天 · 行记推送',
        sections: [{ title: roundTime, lines: journal }, ...(context ? [context] : [])],
        footer: [viewJournal],
        bar: false
      }).format.value;
    }
  }

  // Older events can lack a structured journal summary.
  return fallback.length
    ? fallback
    : buildBubble({ title: '灵墟洞天 · 行记推送', sections: [{ lines: ['说明：有新的洞天行记。'] }], footer: [viewJournal], bar: false }).format.value;
}

export async function deliverLingxuNotification(
  userId: number,
  bid: string,
  queuedAt: string | undefined,
  summary: unknown,
  legacy: DataEnums[],
  enabled: boolean,
  tick?: unknown
): Promise<NotificationDelivery> {
  if (!enabled) {
    return { route: 'history', reason: 'proactive_disabled' };
  }
  // Older relay versions omit occurredAt. Do not guess a delivery destination.
  if (!queuedAt) {
    throw new Error('洞天推送缺少入队时间');
  }
  const preference = await getLingxuPushDestination(userId, queuedAt);

  if (preference.mode === 'off') {
    return { route: 'history', reason: 'proactive_disabled' };
  }

  return deliverPlayerNotification(userId, bid, () => lingxuNoticeData(summary, legacy, tick), enabled, {
    privateOnly: true,
    async authorize() {
      return (await getLingxuPushDestination(userId, queuedAt)).mode === 'private';
    }
  });
}
