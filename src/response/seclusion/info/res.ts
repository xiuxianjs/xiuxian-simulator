import { formatGameTime } from '@src/utils/gameTime';
import { loadFinalBusiness } from '@src/response/finalBusiness';
import { buildBubble, type BubbleSection } from '@src/response/presentation';
import { useMessage } from '@src/utils/useMessage';
import { executeBackendSeclusionCommand } from '@src/api/bot/seclusion-command';
import { selects } from '@src/response/config';
import { onResponse, useEvent } from 'alemonjs';

const progress = { label: '查看进度', command: '/探索秘境' };
const returnTrip = { label: '返程', command: '/返程' };

export default onResponse(selects, async e => {
  const [, next] = useEvent();
  const [message] = useMessage();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const send = (title: string, sections: BubbleSection[], footer?: Array<{ label: string; command: string }>) => {
    void message.send(buildBubble({ isPrivate, bid, title, sections, footer }));
  };
  const text = (e.MessageText ?? '').trim();
  const startMatch = text.match(/探索秘境\s+(.+)\s+(\d+)$/);

  if (startMatch) {
    const dungeonName = startMatch[1].trim();
    const duration = Number(startMatch[2]);

    if (!dungeonName) {
      send('探索秘境 · 未开始', [{ lines: ['说明：请先选择秘境'] }], [{ label: '查看秘境', command: '/查看秘境' }]);

      return;
    }
    const business = await loadFinalBusiness(e, next, 'seclusion.command', { action: 'start', dungeonName, duration }, value => value);

    if (business.handled) {
      return;
    }
    const { result } = await executeBackendSeclusionCommand(bid, e.uid as number, 'start', { dungeonName, duration }, undefined, business.load);

    if (result.code !== 'OK') {
      send('探索秘境 · 未开始', [{ lines: [result.data.message] }], [progress]);

      return;
    }
    const { dungeon, record } = result.data;

    send('探索秘境 · 已出发', [
      {
        title: dungeon.name,
        lines: [`时长：${record.duration} 小时`, `消耗：精力 ${record.spiritCost}`, ...(record.endTime ? [`预计返程：${formatGameTime(record.endTime)}`] : [])],
        actions: [progress, returnTrip]
      }
    ]);

    return;
  }
  const selected = text.match(/探索秘境\s+(.+)$/)?.[1]?.trim();

  if (selected) {
    const business = await loadFinalBusiness(e, next, 'seclusion.command', { action: 'select', dungeonName: selected }, value => value);

    if (business.handled) {
      return;
    }
    const { result, access } = await executeBackendSeclusionCommand(bid, e.uid as number, 'select', { dungeonName: selected }, undefined, business.load);

    if (result.code === 'IN_SECLUSION') {
      send('探索秘境', [{ lines: ['状态：探索中'], actions: [progress, returnTrip] }]);

      return;
    }
    if (result.code !== 'OK') {
      const text = result.code === 'DUNGEON_NOT_FOUND' ? '未找到匹配秘境或境界不足' : result.data.message;

      send('探索秘境 · 未完成', [{ lines: [text] }]);

      return;
    }
    const { status, dungeon } = result.data;
    const sections: BubbleSection[] = dungeon.startOptions.map(option => {
      const title = `${option.duration} 小时`;
      const { preview } = option;

      if (!option.available) {
        return { title, lines: [`状态：${option.reason ?? '当前不可用'}`] };
      }

      return {
        title,
        ...(option.duration === status.recommendedDuration ? { suffix: '推荐' } : {}),
        lines: [
          `消耗：精力 ${option.spiritCost}`,
          `预计收益：修为 +${preview.projectedCreditedExperience ?? preview.experience} · 灵石 +${preview.spiritStone}`,
          '掉落：丹药与材料随探索寻获',
          ...(preview.experienceCapWarning ? ['提示：修为将满'] : [])
        ],
        actions: status.startAvailable ? [{ label: '出发', command: `/探索秘境 ${dungeon.name} ${option.duration}` }] : []
      };
    });

    if (!status.startAvailable) {
      sections.unshift({ lines: [status.startReason ?? '当前无法探索秘境'] });
    }
    send(`探索秘境 · ${dungeon.name}`, sections, [
      { label: '返回秘境列表', command: '/查看秘境' },
      ...(access.canUseSoulPath ? [{ label: '元婴道途', command: '/元婴道途' }] : [])
    ]);

    return;
  }
  const business = await loadFinalBusiness(e, next, 'seclusion.command', { action: 'view' }, value => value);

  if (business.handled) {
    return;
  }
  const { result, access } = await executeBackendSeclusionCommand(bid, e.uid as number, 'view', {}, undefined, business.load);

  if (result.code !== 'OK') {
    send('探索秘境 · 未完成', [{ lines: [result.data.message] }]);

    return;
  }
  const status = result.data;
  const footer = access.canUseSoulPath ? [{ label: '元婴道途', command: '/元婴道途' }] : [];

  if (status.inSeclusion && status.record) {
    const record = status.record;

    send(
      '探索秘境 · 进度',
      [
        {
          title: record.dungeonName,
          lines: [
            `状态：${record.isCompleted ? '探索完成' : '探索中'}`,
            `时长：${record.duration} 小时`,
            ...(!record.isCompleted
              ? [`已探索：${record.elapsedHours} 小时`, `剩余：约 ${record.remainingHours} 小时`, `可结算：${record.settleableHours} 小时`]
              : [])
          ],
          actions: status.canEnd ? [returnTrip] : []
        }
      ],
      footer
    );

    return;
  }
  send(
    '探索秘境',
    [
      {
        lines: [`状态：${status.startAvailable ? '尚未出发' : (status.startReason ?? '当前无法探索秘境')}`],
        actions: [{ label: '查看秘境', command: '/查看秘境' }]
      }
    ],
    footer
  );
});
