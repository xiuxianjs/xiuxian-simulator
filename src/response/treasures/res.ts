import {
  parseRelicsOverview,
  parseSpiritVein,
  parseTreasureConfirmation,
  parseTreasureOverview,
  parseTreasureReceipt,
  treasureAttributeNames,
  validTreasureConfirmationRef,
  type OwnedTreasure,
  type TreasureOverview,
  type TreasurePreviewKind
} from '@src/api/bot/treasures';
import type { RobotBusinessOperation } from '@src/api/bot/robot-business';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { createQuoteMarkdown, FormatGui, type GuiButton } from '@src/utils/messageHelper';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { useMessage } from '@src/utils/useMessage';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

const number = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value);
const probability = (value: number) => `${Number((value * 100).toFixed(3))}%`;

type Button = GuiButton & { command: string };
const manual = (buttons: Button[]) => buttons.map(button => ({ ...button, autoEnter: false }));
const sources: Record<string, string> = { 灵晶: 'spirit_crystal', 道晶: 'dao_crystal', 藏宝图: 'treasure_map' };
const sourceNames: Record<string, string> = { free: '每日免费', spirit_crystal: '灵晶', dao_crystal: '道晶', treasure_map: '藏宝图' };
const stages = ['星尘', '晓月', '真阳', '仙藏'];
const pageSize = 6;
const treasureID = (value: string | undefined) => {
  if (value === undefined || !/^\d{3}$/.test(value)) { return undefined; }
  const id = Number(value);

  return id >= 101 && id <= 604 && id % 100 >= 1 && id % 100 <= 4 ? id : undefined;
};
const navigation: Button[] = [
  { label: '宝物', command: '/宝物' },
  { label: '上古遗珍', command: '/上古遗珍' },
  { label: '灵脉租契', command: '/灵脉租契' }
];

export default onResponse(selects, async event => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const match = /^\s*[/#＃]?(宝物|上古遗珍|灵脉租契|确认宝物)(?:\s+(.*?))?\s*$/.exec(event.MessageText ?? '');
  const command = match?.[1];
  const args = match?.[2]?.split(/\s+/).filter(Boolean) ?? [];
  let title = command ?? '宝物';
  let content = Format.createMarkdown();
  let operation: RobotBusinessOperation | undefined;
  let originalRef: string | undefined;
  let mutationConfirmed = false;
  const quote = (lines: string[], buttons: Button[] = []) => content.addBlockquote(createQuoteMarkdown(lines, manual(buttons)));
  const send = (footer: Button[] = navigation) => {
    const body = { bid: event.UserId, isPrivate: isPrivateEvent(event), title, content, footer: manual(footer), bar: false as const };

    return message.send(FormatGui(body));
  };
  const call = async <T>(name: RobotBusinessOperation, input: Record<string, unknown>, decode: (value: unknown) => T) => {
    operation = name;
    const response = await runRobotBusiness(
      event,
      name,
      input,
      decode,
      next,
      adviceRenderer(async reply => {
        title = reply.title || '操作未完成';
        content = Format.createMarkdown();
        quote([reply.heading, reply.text, reply.quote ?? '', ...(reply.rawLines ?? [])].filter(Boolean), reply.buttons);
        for (const block of reply.blocks ?? []) {
          quote([block.text], block.inlineButtons ?? []);
        }
        for (const tip of reply.advice) {
          quote([tip.description], [{ label: tip.command, command: tip.command }]);
        }
        await send();
      })
    );

    return response.handled ? undefined : response.data;
  };
  const preview = async (kind: TreasurePreviewKind, input: Record<string, unknown> = {}) => {
    const data = await call('treasures.preview', { kind, ...input }, parseTreasureConfirmation);

    if (!data) {
      return;
    }
    originalRef = data.confirmationRef;
    title = '宝物操作确认';
    quote(
      [...data.summary, `有效至 ${data.expiresAt.replace('T', ' ').replace(/\.\d+Z$/, 'Z')}`, '确认后按本次预览结算；重复确认只返回原操作结果。'],
      [
        { label: '确认', command: `/确认宝物 ${data.confirmationRef}` },
        { label: '取消并返回', command: kind === 'explore' || kind === 'select-mythic' ? '/上古遗珍' : kind === 'claimLease' ? '/灵脉租契' : '/宝物' }
      ]
    );
    await send();
  };
  const showFortune = (data: TreasureOverview) => {
    const f = data.fortune;

    quote([
      `鸿蒙气运 ${f.level}/${f.maxLevel}级 · 积分 ${number(f.score)}`,
      f.nextThreshold === null
        ? '已达最高气运等级，积分继续保留'
        : `下级累计 ${number(f.nextThreshold)} 分 · 还差 ${number(Math.max(0, f.nextThreshold - f.score))} 分`,
      `暴击率 +${f.bonus.critRate}% · 暴伤 +${f.bonus.critDamage}%`,
      `命中率 +${f.bonus.hitRate}% · 闪避率 +${f.bonus.dodgeRate}%`
    ]);
  };
  const showItem = (item: OwnedTreasure, data: TreasureOverview) => {
    const d = item.definition;

    quote([
      `[${d.rarityName}] ${d.id} ${d.name}`,
      item.owned ? `${item.gradeName} · 等级 ${item.level}/${data.levelCap}` : '尚未拥有',
      `碎片 ${item.fragments}/10 · 多余本体 ${item.duplicates}`
    ]);
    const fixed = item.owned ? item.attributes : d.baseAttributes;
    const percent = item.owned ? item.percentAttributes : d.basePercentAttributes;
    const stats: string[] = [];

    for (const key of Object.keys(treasureAttributeNames) as Array<keyof typeof treasureAttributeNames>) {
      if (fixed[key]) {
        stats.push(`${treasureAttributeNames[key]} +${number(fixed[key])}`);
      }
      if (percent[key]) {
        stats.push(`${treasureAttributeNames[key]} +${number(percent[key])}%`);
      }
    }
    quote(stats.length ? stats : ['暂无战斗属性']);
    if (d.effectDescription) {
      quote([
        d.effectDescription,
        ...(item.owned && item.currentEffect ? [`当前：${item.currentEffect}`] : []),
        ...d.stageValues.map((value, index) => `${stages[index]}：${value}`)
      ]);
    }
    if (item.promotion) {
      quote([`下一品需要本体 ${item.promotion.duplicates} · 仙蕴 ${item.promotion.xianYun}`, ...item.promotion.requirements]);
    }
    quote(
      [`经验 ${data.experience} · 仙蕴 ${data.xianYun}`, ...(item.owned ? [`下一级经验 ${item.nextLevelCost}`] : [])],
      [
        ...(item.canSynthesize ? [{ label: '合成', command: `/宝物 合成 ${d.id}` }] : []),
        ...(item.canUpgrade ? [{ label: '升级', command: `/宝物 升级 ${d.id}` }] : []),
        ...(item.canPromote ? [{ label: '升品', command: `/宝物 升品 ${d.id}` }] : []),
        { label: '返回持有', command: '/宝物' }
      ]
    );
  };

  try {
    if (!command || !match) {
      quote(['参数错误，请使用 /宝物、/上古遗珍 或 /灵脉租契。']);
      await send();

      return;
    }
    if (command === '确认宝物') {
      if (args.length !== 1 || !validTreasureConfirmationRef(args[0])) {
        quote(['确认凭据不完整或指令超长，请核对原结果后重新预览。']);
        await send();

        return;
      }
      originalRef = args[0];
      const data = await call('treasures.confirm', { confirmationRef: originalRef }, parseTreasureReceipt);

      if (!data) {
        return;
      }
      mutationConfirmed = true;
      title = '宝物操作回执';
      quote([data.result.message, `操作编号 ${data.operationId}`]);
      if (data.kind === 'explore' && data.result.rewards) {
        quote([`探索 ${data.result.count}次 · 消耗 ${data.result.paidAmount} · 宝物经验 +${data.result.experienceGranted}`]);
        for (const r of data.result.rewards) {
          quote(
            [`${r.name} · ${r.kind === 'body' ? '完整本体' : '碎片'} ×${r.quantity}${r.newlyOwned ? ' · 新获得' : ''}`],
            [{ label: '查看', command: `/宝物 详情 ${r.treasureId}` }]
          );
        }
      }
      if (data.kind === 'claimLease') {
        quote([`领取 ${data.result.days}收益日 · 灵晶 +${data.result.spiritCrystal}`]);
      }
      await send();

      return;
    }
    if (command === '宝物') {
      const action = args[0];

      if (['合成', '升级', '升品'].includes(action)) {
        const id = treasureID(args[1]);

        if (args.length !== 2 || id === undefined) {
          quote(['参数错误：/宝物 合成|升级|升品 <宝物编号>。']);
          await send();

          return;
        }
        await preview(({ 合成: 'synthesize', 升级: 'upgrade', 升品: 'promote' } as const)[action as '合成' | '升级' | '升品'], { treasureId: id });

        return;
      }
      const isCatalog = action === '图鉴';
      const pageArg = isCatalog ? args[1] : action;
      const isDetail = action === '详情';
      const isFortune = action === '气运';

      if (
        (isDetail && (args.length !== 2 || treasureID(args[1]) === undefined)) ||
        (isFortune && args.length !== 1) ||
        (!isDetail && !isFortune && (args.length > (isCatalog ? 2 : 1) || (pageArg !== undefined && !/^p[1-4]$/.test(pageArg))))
      ) {
        quote(['参数错误：/宝物 [p1-p4]、/宝物 图鉴 [p1-p4]、/宝物 详情 <编号>、/宝物 气运。']);
        await send();

        return;
      }
      const data = await call('treasures.overview', {}, parseTreasureOverview);

      if (!data) {
        return;
      }
      if (isDetail) {
        const item = data.items.find(item => item.definition.id === Number(args[1]));

        if (item) {
          showItem(item, data);
        } else {
          quote(['未找到该宝物，请查看图鉴。']);
        }
        await send();

        return;
      }
      showFortune(data);
      if (!isFortune) {
        quote(
          [`宝物经验 ${data.experience} · 仙蕴 ${data.xianYun} · 境界等级上限 ${data.levelCap}`],
          [
            { label: '持有', command: '/宝物' },
            { label: '全部图鉴', command: '/宝物 图鉴' }
          ]
        );
        const all = data.items.filter(item => isCatalog || item.owned || item.fragments > 0);
        const page = Math.min(Number(pageArg?.slice(1) ?? 1), Math.max(1, Math.ceil(all.length / pageSize)));
        const items = all.slice((page - 1) * pageSize, page * pageSize);

        for (const item of items) {
          quote(
            [
              `${item.definition.id} [${item.definition.rarityName}] ${item.definition.name}`,
              item.owned ? `${item.gradeName} · ${item.level}级 · 本体 ${item.duplicates}` : `未拥有 · 碎片 ${item.fragments}/10`
            ],
            [{ label: '详情与培养', command: `/宝物 详情 ${item.definition.id}` }]
          );
        }
        if (!items.length) {
          quote(['尚无宝物或碎片，可在上古遗珍每日免费探索一次。']);
        }
        const prefix = isCatalog ? '/宝物 图鉴' : '/宝物';

        quote(
          [`第 ${page}/${Math.max(1, Math.ceil(all.length / pageSize))} 页`],
          [
            ...(page > 1 ? [{ label: '上一页', command: `${prefix} p${page - 1}` }] : []),
            ...(page * pageSize < all.length ? [{ label: '下一页', command: `${prefix} p${page + 1}` }] : [])
          ]
        );
      }
      await send();

      return;
    }
    if (command === '上古遗珍') {
      if (args[0] === '免费探索' && args.length === 1) {
        await preview('explore', { source: 'free', count: 1 });

        return;
      }
      if (['探索', '十连探索'].includes(args[0]) && args.length === 2 && sources[args[1]]) {
        if (args[0] === '探索' && args[1] === '道晶') {
          quote(['道晶仅支持十连探索。'], [{ label: '道晶十连探索', command: '/上古遗珍 十连探索 道晶' }]);
          await send();

          return;
        }
        await preview('explore', { source: sources[args[1]], count: args[0] === '探索' ? 1 : 10 });

        return;
      }
      if (args[0] === '自选' && args.length === 2 && treasureID(args[1]) !== undefined && Number(args[1]) >= 601) {
        await preview('select-mythic', { treasureId: Number(args[1]) });

        return;
      }
      if (args.length > 1 || (args.length && !['概率', '记录', '自选'].includes(args[0]))) {
        quote(['参数错误：/上古遗珍 [概率|记录|自选]，探索请选灵晶、道晶或藏宝图。']);
        await send();

        return;
      }
      const data = await call('ancient-relics.overview', {}, parseRelicsOverview);

      if (!data) {
        return;
      }
      quote([`累计探索 ${data.totalExplorations}次 · 本轮 ${data.milestoneProgress}/300`, `可领取神话自选 ${data.pendingSelections}份 · 每300次额外获得一份`]);
      if (args[0] === '概率') {
        for (const pity of data.pity) {
          quote([`${pity.name}保底 ${pity.counter}/${pity.hardPity} · 下次完整本体概率 ${probability(pity.nextProbability)}`]);
        }
        quote(data.wholeRates.map(rate => `${rate.name}完整本体综合概率 ${probability(rate.probability)}`));
        quote(data.rules);
      } else if (args[0] === '记录') {
        for (const record of data.records.slice(0, 10)) {
          quote([
            `${record.createdAt} · ${sourceNames[record.source]}探索 ${record.count}次 · 消耗 ${record.paidAmount}`,
            ...record.rewards.map(r => `${r.name}${r.kind === 'body' ? '本体' : '碎片'} ×${r.quantity}`),
            `操作编号 ${record.operationId}`
          ]);
        }
        if (!data.records.length) {
          quote(['暂无探索记录。']);
        }
      } else if (args[0] === '自选') {
        const treasures = await call('treasures.overview', {}, parseTreasureOverview);

        if (!treasures) {
          return;
        }
        quote(['可选择任一神话，包括已拥有宝物；领取自选不会改变随机探索概率。']);
        for (const item of treasures.items.filter(item => item.definition.rarity === 6)) {
          quote(
            [`${item.definition.id} ${item.definition.name} · ${item.owned ? item.gradeName : '未拥有'}`],
            data.pendingSelections > 0 ? [{ label: '预览领取', command: `/上古遗珍 自选 ${item.definition.id}` }] : []
          );
        }
      } else {
        quote(
          [
            `灵晶 ${number(data.balances.spiritCrystal)} · 道晶 ${number(data.balances.daoCrystal)} · 藏宝图 ${data.balances.treasureMaps}张`,
            `今日免费探索：${data.freeAvailable ? '可用' : '已使用'}`,
            `灵晶每日首次十连9折：${data.spiritTenDiscountAvailable ? '可用' : '已使用'}；道晶十连始终9折`,
            '藏宝图目前仅通过邮件发放，单次1张、十连10张。'
          ],
          [
            ...(data.freeAvailable ? [{ label: '免费探索', command: '/上古遗珍 免费探索' }] : []),
            { label: '概率公示', command: '/上古遗珍 概率' },
            { label: '探索记录', command: '/上古遗珍 记录' }
          ]
        );
        for (const name of ['灵晶', '道晶', '藏宝图']) {
          quote(
            [`${name}探索 · 结算前将显示服务端实际费用`],
            [...(name !== '道晶' ? [{ label: '探索', command: `/上古遗珍 探索 ${name}` }] : []), { label: '十连探索', command: `/上古遗珍 十连探索 ${name}` }]
          );
        }
        if (data.pendingSelections) {
          quote([`神话自选待领取 ${data.pendingSelections}份`], [{ label: '选择神话', command: '/上古遗珍 自选' }]);
        }
      }
      await send();

      return;
    }
    if (args.length === 1 && args[0] === '领取') {
      await preview('claimLease');

      return;
    }
    if (args.length) {
      quote(['参数错误：/灵脉租契 或 /灵脉租契 领取。']);
      await send();

      return;
    }
    const lease = await call('spirit-vein.overview', {}, parseSpiritVein);

    if (!lease) {
      return;
    }
    quote(
      [
        `¥${(lease.priceAmount / 100).toFixed(2)} · 30收益日`,
        `购买即得 ${lease.immediateDaoCrystal}道晶 · 每收益日 ${lease.dailyCrystal}灵晶`,
        lease.active ? `生效中 · 剩余 ${lease.remainingDays}收益日` : '当前未生效',
        ...(lease.endDate ? [`权益截止 ${lease.endDate}`] : []),
        `可领取 ${lease.claimableDays}收益日 · ${lease.claimableCrystal}灵晶`,
        `续订延长收益日，每日金额不叠加；最多预存 ${lease.maxDays}日。`,
        ...(lease.purchaseUnavailableReason ? [lease.purchaseUnavailableReason] : [])
      ],
      [
        ...(lease.claimableDays > 0 ? [{ label: '预览领取', command: '/灵脉租契 领取' }] : []),
        ...(lease.packageId ? [{ label: '购买/续订（私聊）', command: `/充值购买 ${lease.packageId}` }] : []),
        { label: '我的订单', command: '/我的订单' }
      ]
    );
    await send();
  } catch (error) {
    logger.error('宝物指令未完成', { operation, message: error instanceof Error ? error.message : '未知异常' });
    content = Format.createMarkdown();
    quote(
      [
        mutationConfirmed
          ? '回执已确认，展示异常。请查询宝物、探索记录或租契领取状态。'
          : originalRef && operation === 'treasures.confirm'
            ? '操作结果尚未获完整确认，请重试原确认；不要另开一次探索或培养。'
            : '暂未取得完整预览或数据，请刷新；未自动提交新的培养或探索。'
      ],
      !mutationConfirmed && originalRef && operation === 'treasures.confirm' ? [{ label: '核对并重试原操作', command: `/确认宝物 ${originalRef}` }] : []
    );
    await send();
  }
});
