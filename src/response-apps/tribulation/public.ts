import { formatGameTime } from '@src/utils/gameTime';
import { listBackendPublicTribulations, observeBackendPublicTribulation } from '@src/api/bot/public-tribulation';
import type { PublicTribulationEvent, PublicTribulationQuery } from '@src/api/schemas/public-tribulation';
import { getCommandErrorMessage } from '@src/utils/commandError';
import type { TribulationPanel } from './app';

const pageSize = 5;
const statuses = {
  opened: '已开启，准备中',
  preparing: '准备中',
  charging: '已确认，等待落雷',
  succeeded: '本次渡劫成功',
  failed: '本次渡劫失败',
  expired: '未开劫，确认已超时',
  evaded: '本次已主动暂避',
  cancelled: '本次已取消'
};
const time = (value: string) => formatGameTime(value);
const navigation = [
  { label: '劫云榜', command: '/劫云榜' },
  { label: '我的劫云', command: '/我的渡劫' }
];

export type PublicTribulationCommand =
  { kind: 'list'; page: number; filter: Pick<PublicTribulationQuery, 'playerId' | 'name'> } | { kind: 'observe'; eventId: number };
export function parsePublicTribulationCommand(text: string): PublicTribulationCommand | null {
  let command = text.trim().replace(/^[!！/#＃]/, '');

  if (/[\r\n]/.test(command)) {
    return null;
  }
  if (/^搜索劫云\s+/.test(command)) {
    command = command.replace(/^搜索劫云\s+/, '劫云榜 1 ');
  }
  const observed = command.match(/^观望渡劫\s+(\d+)$/);

  if (observed) {
    const eventId = Number(observed[1]);

    return Number.isSafeInteger(eventId) && eventId > 0 ? { kind: 'observe', eventId } : null;
  }
  const list = command.match(/^劫云榜(?:\s+(\d+))?(?:\s+(UID|道号)\s+(.+))?$/);

  if (!list) {
    return null;
  }
  const page = Number(list[1] ?? 1);

  if (!Number.isSafeInteger(page) || page <= 0 || !Number.isSafeInteger((page - 1) * pageSize + pageSize + 1)) {
    return null;
  }
  const filter: Pick<PublicTribulationQuery, 'playerId' | 'name'> = {};

  if (list[2] === 'UID') {
    const playerId = Number(list[3]);

    if (!/^\d+$/.test(list[3]) || !Number.isSafeInteger(playerId) || playerId <= 0) {
      return null;
    }
    filter.playerId = playerId;
  } else if (list[2] === '道号') {
    filter.name = list[3].trim();
  }

  return { kind: 'list', page, filter };
}
function listCommand(page: number | string, filter: Pick<PublicTribulationQuery, 'playerId' | 'name'>) {
  return `/劫云榜 ${page}${filter.playerId ? ` UID ${filter.playerId}` : filter.name ? ` 道号 ${filter.name}` : ''}`;
}
// 榜单与观望详情的互动风险均与操作按钮放在同一气泡块。
function eventSection(event: PublicTribulationEvent, detail = false, viewerId?: number): TribulationPanel['sections'][number] {
  const own = viewerId === event.playerId;
  const participationOpen = event.participationOpen && !own;
  const interactionOpen = event.interactionOpen && !own;

  return {
    lines: [
      ...(detail
        ? [`${event.name} · UID ${event.playerId}`, `${event.currentRealm} → ${event.targetRealm} · ${event.tribulationName}`, statuses[event.status]]
        : [
            `【${event.tribulationName}】${event.name}`,
            `${event.currentRealm} → ${event.targetRealm} · ${event.status === 'charging' ? '待落雷' : event.status === 'preparing' ? '待开劫' : statuses[event.status]}`
          ]),
      ...(event.strikeAt
        ? [`落雷：${time(event.strikeAt)}`]
        : [`开放：${time(event.opensAt)}`, ...(event.deadline ? [`确认截止：${time(event.deadline)}`] : ['准备时间不限，尚未确认开始'])]),
      ...(detail
        ? [
            `晋级需${event.requiredAttempts}次渡劫成功`,
            ...(event.disruption ? [`捣乱${event.disruption.count}人 · 捣乱来源增幅 +${event.disruption.attackBonusPercent}%（来源上限10%）`] : []),
            ...(participationOpen ? ['参与感悟可获修为，每日最多3场；实际到账受资格与存储上限限制，同场观望与捣乱共享奖励。'] : []),
            ...(interactionOpen
              ? ['捣乱：每人限一次，无物品或货币成本；每人贡献1%双攻击来源增幅，累计来源上限10%，品质奖励不变。最终攻击以落雷条件为准。']
              : []),
            ...(interactionOpen && event.disruptionKarmaEnabled ? ['本次捣乱会计入本人后续渡劫因果，可能增加雷劫威力；具体增幅以本人开劫预览为准。'] : []),
            ...(own ? ['这是你的劫云，请前往我的劫云查看准备或结算。'] : [])
          ]
        : [
            ...(participationOpen ? ['观望或捣乱可获修为，每日最多3场，同场共享一次奖励；实际到账以参与回执为准。'] : []),
            ...(interactionOpen ? ['捣乱会增强对方雷劫，并可能计入自身渡劫因果。'] : [])
          ])
    ],
    buttons: detail
      ? [
          ...(own ? [{ label: '查看我的劫云', command: '/我的渡劫' }] : []),
          ...(participationOpen ? [{ label: '参与观望·即时感悟', command: `/参与观望 ${event.eventId}` }] : []),
          ...(interactionOpen ? [{ label: '捣乱', command: `/捣乱渡劫 ${event.eventId}` }] : [])
        ]
      : [
          ...(own ? [{ label: '我的劫云', command: '/我的渡劫' }] : []),
          ...(participationOpen ? [{ label: '观望', command: `/参与观望 ${event.eventId}` }] : []),
          ...(interactionOpen ? [{ label: '捣乱', command: `/捣乱渡劫 ${event.eventId}` }] : [])
        ]
  };
}
const dependencies = { list: listBackendPublicTribulations, observe: observeBackendPublicTribulation };

export async function runPublicTribulationCommand(text: string, bid?: string, api = dependencies, viewerId?: number): Promise<TribulationPanel> {
  const command = parsePublicTribulationCommand(text);

  if (!command) {
    return {
      title: '劫云榜',
      sections: [{ lines: ['劫云查询无效。'], buttons: navigation }]
    };
  }
  try {
    if (command.kind === 'observe') {
      const event = await api.observe(bid, command.eventId);

      return {
        title: `${event.name} · 渡劫观望`,
        sections: [eventSection(event, true, viewerId)],
        footer: [{ label: '刷新', command: `/观望渡劫 ${event.eventId}` }, ...navigation]
      };
    }
    // Fetch one extra public row to decide whether a next-page button exists.
    const events = await api.list(bid, { ...command.filter, offset: (command.page - 1) * pageSize, limit: pageSize + 1 });
    const sections = events.slice(0, pageSize).map(event => eventSection(event, false, viewerId));

    // 与商店一致：顶部入口、条目卡片、底部分页。服务端只返回下一页哨兵，不虚构总页数。
    return {
      title: '劫云榜',
      header: [
        { label: '我的劫云', command: '/我的渡劫' },
        { label: '刷新', command: listCommand(command.page, command.filter) },
        ...(command.filter.playerId || command.filter.name ? [{ label: '全部劫云', command: '/劫云榜' }] : [])
      ],
      sections,
      emptyText: '当前没有匹配的可观望渡劫事件。',
      ...(events.length || command.page > 1
        ? {
            nav: { current: command.page, hasNext: events.length > pageSize, command: listCommand('{page}', command.filter) }
          }
        : {})
    };
  } catch (error) {
    return {
      title: '劫云查询未完成',
      sections: [
        {
          lines: [getCommandErrorMessage(error)],
          buttons: [
            { label: '重查原事件或列表', command: command.kind === 'observe' ? `/观望渡劫 ${command.eventId}` : listCommand(command.page, command.filter) },
            ...navigation
          ]
        }
      ]
    };
  }
}
