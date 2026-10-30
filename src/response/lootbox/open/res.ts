import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { lootboxRecoveryTips } from '@src/response/lootboxRecovery';
import { parseLootboxOpen, lootboxTreasureArgument } from '@src/api/bot/lootbox-open';
import { loadFinalBusiness } from '@src/response/finalBusiness';
import { useEvent } from 'alemonjs';
import { useMessage } from '@src/utils/useMessage';
/**
 * 开启礼盒指令处理器
 * 路由: /开启礼盒 {礼盒ID或名称} {数量?} {自选宝物ID?}
 *
 * 从玩家的 userLootboxes 中查找对应礼盒并开启
 */

import App from '@src/response-apps/lootbox/open/app';
import { createBackendRequestContext } from '@src/api/bot/context';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse } from 'alemonjs';

const response = onResponse(selects, async e => {
  const [, next] = useEvent();
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const uid = e.uid as number;
  const rawText = e.MessageText || '';

  const parts = rawText
    .replace(/^(!|！|\/|#|＃)?开启礼盒\s*/, '')
    .trim()
    .split(/\s+/);
  const count = parts[1] === undefined ? undefined : Number(parts[1]);
  let treasureId: number | undefined;

  if (parts[1] !== undefined && !Number.isFinite(count)) {
    const md = Format.createMarkdown().addText('开启数量无法解析，请核对数量后再操作');

    appendMiddlewareAdvice(md, lootboxRecoveryTips('lootboxes.open', '数量无法解析'), false);
    await message.send(FormatGui({ isPrivate, bid, title: '开启礼盒', content: md }));

    return;
  }
  try {
    treasureId = lootboxTreasureArgument(parts);
  } catch (error) {
    const md = Format.createMarkdown().addText(error instanceof Error ? error.message : '自选宝物参数无效').addNewline();

    md.addButton(markdownButtonLabel('我的礼盒'), { data: '/储物袋 礼盒', autoEnter: false });
    await message.send(FormatGui({ isPrivate, bid, title: '开启礼盒', content: md }));

    return;
  }
  const business = await loadFinalBusiness(
    e,
    next,
    'lootboxes.open',
    { lootboxName: parts[0], openCount: Number.isFinite(count) ? count : undefined, ...(treasureId === undefined ? {} : { treasureId }) },
    parseLootboxOpen
  );

  if (business.handled) {
    return;
  }
  const result = await App({ load: business.load, bid, uid, messageText: rawText, request: createBackendRequestContext(e) });

  const md = Format.createMarkdown();

  if (result.code === 'SELECT_TREASURE') {
    md.addBold(result.data.lootboxName).addNewline();
    md.addText('自选一件完整宝物；已拥有的宝物也可选择。').addNewline();
    md.addText('当前仅预览，尚未消耗宝盒。发送所选命令后消耗1个宝盒；不计入探索次数与保底。').addNewline();
    for (const choice of result.data.selection.choices) {
      const card = Format.createMarkdown().addText(choice.name).addText(' ');

      card.addButton(markdownButtonLabel('选择'), { data: `/开启礼盒 ${result.data.lootboxId} 1 ${choice.treasureId}`, autoEnter: false });
      md.addBlockquote(card);
    }
    await message.send(FormatGui({ isPrivate, bid, title: '宝盒自选', content: md, footer: [{ label: '返回礼盒', command: '/储物袋 礼盒', autoEnter: false }] }));

    return;
  }

  if (result.code === 'NO_INPUT') {
    md.addText('请选择要开启的礼盒');
    md.addNewline();
    md.addButton(markdownButtonLabel('我的礼盒'), { data: '/储物袋 礼盒', autoEnter: false });

    void message.send(FormatGui({ isPrivate, bid, title: '开启礼盒', content: md }));

    return;
  }

  if (result.code === 'NOT_FOUND') {
    md.addText(`未找到名为【${result.data.nameOrId}】的礼盒`);
    md.addNewline();
    md.addButton(markdownButtonLabel('我的礼盒'), { data: '/储物袋 礼盒', autoEnter: false });

    void message.send(FormatGui({ isPrivate, bid, title: '开启礼盒', content: md }));

    return;
  }

  if (result.code === 'NOT_OWNED') {
    md.addText(`你没有【${result.data.lootboxName}】`);
    md.addNewline();
    md.addButton(markdownButtonLabel('我的礼盒'), { data: '/储物袋 礼盒', autoEnter: false });

    void message.send(FormatGui({ isPrivate, bid, title: '开启礼盒', content: md }));

    return;
  }

  if (result.code === 'LOAD_FAILED') {
    md.addText(result.data.message);
    appendMiddlewareAdvice(md, lootboxRecoveryTips('lootboxes.open', result.data.message), false);

    void message.send(FormatGui({ isPrivate, bid, title: '开启失败', content: md }));

    return;
  }

  md.addText(result.data.message);
  md.addNewline();
  md.addButton(markdownButtonLabel('我的礼盒'), { data: '/储物袋 礼盒', autoEnter: false });

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: result.data.success ? '开启礼盒' : '开启失败',
      content: md
    })
  );
});

export default response;
