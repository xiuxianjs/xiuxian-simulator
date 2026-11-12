import { getBackendConfig } from '@src/api/bot/config';
import { acknowledgeNotificationRelay, claimNotificationRelay, retryNotificationRelay } from '@src/api/bot/notification-relay';
import { section } from '@src/response/presentation';
import type { NotificationDelivery, NotificationTarget } from '@src/types/notification';
import { getAppConfig } from '@src/utils/appConfig';
import { parseGameTime } from '@src/utils/gameTime';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { getQQBotAppIds, isQQGroupMemberId } from '@src/utils/qqBotIdentity';
import { Format } from 'alemonjs';
import { notificationChannel, refreshNotificationPermission } from './channel';
import { deliverNotification } from './delivery';
import { deliverNotificationOnce } from './service';

const eventType = 'lingxu.treasure.announcement';
const viewOpportunity = { label: '查看机缘', command: '/灵墟洞天 机缘', autoEnter: false };
const regionNames = {
  kan: '玄泽湿地',
  kan_inner: '毒芦荡',
  gen: '玄晶矿洞',
  gen_inner: '霜息岭',
  zhen: '青岚林',
  zhen_inner: '断碑谷',
  xun: '百草坞',
  xun_inner: '灵风竹海',
  li: '赤砂裂隙',
  li_inner: '地脉熔窟',
  kun: '废弃坊市',
  kun_inner: '龙脉石窟',
  dui: '秋水河滩',
  dui_inner: '葬剑原',
  qian: '观星台',
  qian_inner: '浮空遗宫',
  core: '归墟核心'
} as const;
const qualities = {
  RARE: {
    headline: '紫霞初起', omen: '稀有宝物', firstTreasure: 401,
    treasures: ['采薇竹篮', '长明青灯', '丹砂玉匙', '春风拂尘', '寻幽罗盘', '轻身羽符', '百缘通宝']
  },
  EPIC: {
    headline: '金芒照野', omen: '史诗宝物', firstTreasure: 501,
    treasures: ['万木春符', '人皇笔', '地皇书', '神农鼎', '归元玉璧', '御风仙履', '万象藏珍匣']
  },
  MYTHIC: {
    headline: '惊现通天红光', omen: '通天古宝', firstTreasure: 601,
    treasures: ['九天息壤', '玉净瓶', '乾坤鼎', '掌天瓶', '万宝乾坤袋', '太初归元珠', '玄黄承运玺']
  }
} as const;

type TreasureNotice = {
  target: NotificationTarget;
  phase: 'PREVIEW' | 'RESULT' | 'CORRECTION';
  quality: (typeof qualities)[keyof typeof qualities];
  region: string;
  openAt: NonNullable<ReturnType<typeof parseGameTime>>;
  neighbors: string[];
  mentionMembers: string[];
  result?: { treasure: string; winnerUid: number };
};

const isRegion = (key: unknown): key is keyof typeof regionNames => typeof key === 'string' && Object.hasOwn(regionNames, key);

function parseTreasureNotice(payload: unknown, botId: string): TreasureNotice | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const { version, phase, quality, region, openAt, target, neighbors = [], mentionMembers, result } = payload as {
    version?: unknown;
    phase?: unknown;
    quality?: unknown;
    region?: unknown;
    openAt?: unknown;
    target?: Partial<NotificationTarget>;
    neighbors?: unknown;
    mentionMembers?: unknown;
    result?: { treasureId?: unknown; winnerUid?: unknown };
  };

  if (
    version !== 1 ||
    (phase !== 'PREVIEW' && phase !== 'CORRECTION' && phase !== 'RESULT') ||
    typeof quality !== 'string' ||
    !Object.hasOwn(qualities, quality) ||
    (region !== 'core' && region !== 'qian_inner') ||
    target?.platform !== 'qq-bot' ||
    target.scope !== 'group' ||
    target.BotId !== botId ||
    typeof target.targetId !== 'string' ||
    !/^[\w-]{1,128}$/.test(target.targetId) ||
    typeof openAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:[0-5]0:00(?:Z|[+-]\d{2}:\d{2})$/.test(openAt) ||
    !Array.isArray(neighbors) ||
    neighbors.length > 8 ||
    !neighbors.every(isRegion) ||
    new Set(neighbors).size !== neighbors.length ||
    neighbors.includes(region)
  ) {
    return undefined;
  }
  const time = parseGameTime(openAt);

  if (!time || time.minute() % 10 !== 0) {
    return undefined;
  }
  const definition = qualities[quality as keyof typeof qualities];
  let award: TreasureNotice['result'];

  if (result !== undefined && result !== null) {
    if (phase !== 'RESULT' || !Number.isSafeInteger(result.treasureId) || !Number.isSafeInteger(result.winnerUid) || (result.winnerUid as number) <= 0) {
      return undefined;
    }
    const treasure = definition.treasures[(result.treasureId as number) - definition.firstTreasure];

    if (!treasure) {
      return undefined;
    }
    award = { treasure, winnerUid: result.winnerUid as number };
  }

  return {
    target: { platform: 'qq-bot', BotId: botId, scope: 'group', targetId: target.targetId },
    phase,
    quality: definition,
    region: regionNames[region],
    openAt: time,
    neighbors: neighbors.map(key => regionNames[key]),
    mentionMembers: Array.isArray(mentionMembers) ? [...new Set(mentionMembers.filter(isQQGroupMemberId))].slice(0, 10) : [],
    result: award
  };
}

function treasureNoticeData(notice: TreasureNotice) {
  const { phase, quality, region, openAt, neighbors, mentionMembers, result } = notice;
  const clock = openAt.format('HH:mm');
  const title = phase === 'PREVIEW' ? `群公告 · ${region}${quality.headline}` : phase === 'CORRECTION' ? '群公告 · 宝物现世改期' : '群公告 · 宝物现世结果';
  const lines = phase === 'RESULT'
    ? [
        `地点：${region}`,
        result ? `结果：${result.treasure}已收入修士 #${result.winnerUid} 的墟行囊，待其撤离。` : '结果：本场宝物未被取得。'
      ]
    : [
        `动静：似有${quality.omen}将于${clock}在${region}现世。`,
        ...(neighbors.length > 0 ? [`机缘：浓郁的灵气席卷周边，${neighbors.join('、')}有不少机缘正在复苏。`] : [])
      ];

  const quote = section({ lines });

  if (mentionMembers.length > 0) {
    quote.addNewline().addText('提醒：');
    mentionMembers.forEach((member, index) => {
      if (index > 0) {
        quote.addText(' ');
      }
      quote.addMention(member);
    });
  }
  quote.addNewline();
  addOptions(quote, [viewOpportunity]);

  return FormatGui({ title, content: Format.createMarkdown().addBlockquote(quote), bar: false }).format.value;
}

async function sendTreasureNotice(notice: TreasureNotice): Promise<NotificationDelivery> {
  const live = () => notice.phase === 'RESULT' || notice.openAt.valueOf() > Date.now();

  if (!live()) {
    return { route: 'history', reason: 'no_target' };
  }

  return await deliverNotification(
    {
      group: notice.target,
      data: () => treasureNoticeData(notice),
      enabled: !getAppConfig()?.close_proactive_message,
      authorize: () => Promise.resolve(live())
    },
    {
      ...notificationChannel,
      async read(target) {
        const cached = await notificationChannel.read(target);
        const permission = cached && cached.state !== 'unknown' ? cached : await refreshNotificationPermission(target, false, true);

        if (!permission || permission.state === 'unknown') {
          throw new Error('群主动消息权限暂时无法确认');
        }

        return permission;
      }
    }
  );
}

export async function dispatchLingxuTreasureAnnouncements(): Promise<void> {
  if (process.env.login && process.env.login !== 'qq-bot') {
    return;
  }
  const backend = getBackendConfig();
  const botIds = getQQBotAppIds().filter(id => !backend.channelMode || id === backend.channelBotId);

  for (const botId of botIds) {
    const consumer = `qq-lingxu-treasure:${botId}`;

    while (true) {
      const row = await claimNotificationRelay(eventType, consumer);

      if (!row) {
        break;
      }
      const notice = row.eventType === eventType ? parseTreasureNotice(row.payload, botId) : undefined;

      try {
        const delivery = notice ? await deliverNotificationOnce(row.eventId, () => sendTreasureNotice(notice)) : { route: 'history', reason: 'no_target' } as const;

        await acknowledgeNotificationRelay(row.eventId, consumer, delivery);
      } catch (error) {
        await retryNotificationRelay(row.eventId, consumer, error);
      }
    }
  }
}
