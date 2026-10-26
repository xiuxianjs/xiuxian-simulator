import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { masterRecoveryTips } from '@src/response/masterRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

function parseSupport(value: unknown) {
  const data = value as { message?: unknown; plan?: unknown; canConfirm?: unknown } | null;

  if (
    !data ||
    typeof data.message !== 'string' ||
    typeof data.plan !== 'string' ||
    typeof data.canConfirm !== 'boolean' ||
    (data.canConfirm && !/^[a-f0-9]{64}$/.test(data.plan))
  ) {
    throw new Error('师门扶持响应不完整');
  }

  return { message: data.message, plan: data.plan, canConfirm: data.canConfirm };
}

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const text = (e.MessageText ?? '').trim().replace(/^[/#＃!！]/, '');
  const match = text.match(/^一键(赐福|赐丹)(?:\s+确认\s+([a-f0-9]{64}))?$/);
  const label = text.startsWith('一键赐丹') ? '赐丹' : '赐福';
  const quote = Format.createMarkdown();
  const operation = label === '赐福' ? 'master.bless-all' : 'master.gift-all';

  try {
    if (!match) {
      throw new Error(`使用方法：/一键${label}，先预览丹药消耗，再点击确认`);
    }
    const loaded = await runRobotBusiness(e, operation, { plan: match[2] ?? '' }, parseSupport, next);

    if (loaded.handled) {
      return;
    }
    loaded.data.message
      .split('\n')
      .filter(Boolean)
      .forEach(line => quote.addText(line).addNewline());
    appendMiddlewareAdvice(quote, masterRecoveryTips(operation, loaded.data.message));
    if (!match[2] && loaded.data.canConfirm) {
      addOptions(quote, [{ label: `确认${label}`, command: `/一键${label} 确认 ${loaded.data.plan}` }]);
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : '操作失败，请稍后重试';

    quote.addText(text).addNewline();
    appendMiddlewareAdvice(quote, masterRecoveryTips(operation, match?.[2] ? '批量执行未获完整确认' : text));
  }
  addOptions(quote, [{ label: '我的师门', command: '/我的师门' }]);
  const md = Format.createMarkdown().addBlockquote(quote);

  void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: `【一键${label}】`, content: md }));
});
