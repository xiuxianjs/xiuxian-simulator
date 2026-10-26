import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { dungeonCatalogArguments, parseRobotDungeonCatalog } from '@src/api/bot/dungeon-robot-query';
import { selects } from '@src/response/config';
import { addOptions, createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';

/**
 * 查看秘境指令响应
 * 指令：/查看秘境[页数]
 * 展示副本（秘境）精简列表与分页
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const loaded = await runRobotBusiness(e, 'dungeon.catalog', dungeonCatalogArguments(e.MessageText || ''), parseRobotDungeonCatalog, next);

  if (loaded.handled) {
    return;
  }
  const result = loaded.data;
  const dungeonGroupButtons = [
    { label: '主线', command: '/查看主线' },
    { label: '凶兽', command: '/凶兽' },
    ...(result.data.canUseMeridian ? [{ label: '妖塔', command: '/妖塔' }] : []),
    { label: '队伍', command: '/我的队伍' }
  ] as const;

  if (result.code === 'EMPTY') {
    const md = Format.createMarkdown();

    md.addText('暂无秘境');
    appendMiddlewareAdvice(
      md,
      withBusinessRecovery('dungeon.catalog', {
        title: '',
        heading: '',
        text: '暂无秘境',
        buttons: [],
        advice: []
      }).advice
    );

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '副本 - 秘境列表',
        header: [...dungeonGroupButtons],
        content: md,
        footer: [{ label: '查看开放条件', command: '/天书' }]
      })
    );

    return;
  }

  const d = result.data;

  // 构建秘境列表
  const contentMd = Format.createMarkdown();

  if (d.pagination.currentPage > d.pagination.totalPages) {
    contentMd.addText(`页码超出范围：当前第${d.pagination.currentPage}页，共${d.pagination.totalPages}页。`);
    appendMiddlewareAdvice(
      contentMd,
      withBusinessRecovery('dungeon.catalog', {
        title: '',
        heading: '',
        text: '页码超出范围',
        buttons: [],
        advice: []
      }).advice
    );
  }

  // 副标题信息
  contentMd.addBlockquote(addOptions(Format.createMarkdown().addText(`精力：${d.mentalValue}`), [{ label: '✛', command: '/服用 精力丹 1' }]));

  contentMd.addNewline();
  contentMd.addNewline();

  for (const item of d.items) {
    const realmLimit = item.minRealmName
      ? item.maxRealmName
        ? `${item.minRealmName} ~ ${item.maxRealmName}`
        : `${item.minRealmName}及以上`
      : item.maxRealmName
        ? `${item.maxRealmName}及以下`
        : '无限制';

    const dgBtns: { label: string; command: string }[] = [];

    if (d.inTeam) {
      dgBtns.push({ label: '挑战', command: `/秘境挑战 ${item.name}` });
    } else if (item.hasCleared) {
      dgBtns.push({ label: '扫荡', command: `/扫荡秘境 ${item.name}` });
      dgBtns.push({ label: '×10', command: `/扫荡秘境 ${item.name} 10` });
    } else {
      dgBtns.push({ label: '挑战', command: `/秘境挑战 ${item.name}` });
    }
    dgBtns.push({ label: '查看', command: `/秘境详情 ${item.name}` });
    if (!d.inTeam && !item.isSingle && d.canMatchDungeon) {
      dgBtns.push({ label: '匹配', command: `/匹配秘境 ${item.id}` });
    }
    if (!d.inTeam) {
      dgBtns.push({ label: '探索', command: `/探索秘境 ${item.name}` });
    }

    const freeText = item.freeRemaining !== null && item.freeLimit !== null ? ` | 免费剩余：${item.freeRemaining}次` : '';

    contentMd.addBlockquote(
      createQuoteMarkdown(
        [`【${item.name}】${item.isSingle ? '' : '【多人】'}`, `${realmLimit} | 精力：${item.spiritCost}${freeText}${item.hasCleared ? '' : ' | ✨首通奖励'}`],
        dgBtns
      )
    );

    contentMd.addNewline();
    contentMd.addNewline();
  }

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '副本 - 秘境列表',
      header: [...dungeonGroupButtons],
      content: contentMd,
      nav: {
        current: d.pagination.currentPage,
        total: d.pagination.totalPages,
        count: d.pagination.total,
        command: '/查看秘境 {page}'
      },
      footer: [
        {
          label: '扫荡免费秘境',
          command: '/扫荡免费秘境'
        }
      ]
    })
  );
});
