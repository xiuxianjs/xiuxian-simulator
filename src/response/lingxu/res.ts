import { logger, onResponse, ResultCode, useEvent } from 'alemonjs';
import { createBackendReadRequestContext, createBackendRequestContext } from '@src/api/bot/context';
import { parseLingxuPage } from '@src/api/bot/lingxu';
import { selects } from '@src/response/config';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { buildBubble } from '@src/response/presentation';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { useMessage } from '@src/utils/useMessage';
import { parseLingxuCommand } from './commands';
import { lingxuBottomBar, lingxuBubble } from './view';

export default onResponse(selects, async event => {
  const [, next] = useEvent();
  const parsed = parseLingxuCommand(event.MessageText ?? '');

  if (parsed === undefined) {
    next();

    return;
  }
  const [message] = useMessage();
  const send = async (body: Parameters<typeof message.send>[0]) => {
    const receipts = await message.send(body);

    if (!receipts.length || receipts.some(receipt => receipt.code !== ResultCode.Ok)) {
      throw new Error('灵墟洞天消息未确认送达');
    }
  };
  const failure = (reason: string, retry?: string) => send(buildBubble({
    bid: event.UserId,
    isPrivate: isPrivateEvent(event),
    title: '灵墟洞天 · 未完成',
    sections: [{ lines: [`说明：${reason}`] }],
    footer: [
      ...(retry ? [{ label: '重试原确认', command: retry, autoEnter: false }] : []),
      { label: '返回洞天', command: '/灵墟洞天', autoEnter: false }
    ],
    bar: lingxuBottomBar
  }));

  if (!isPrivateEvent(event)) {
    await failure('洞天状态、行囊及操作只在私聊中展示，请私聊机器人使用 /灵墟洞天。');

    return;
  }
  if ('error' in parsed) {
    await failure('参数不正确，请通过洞天或阵法师页面的按键重新选择。');

    return;
  }
  try {
    const result = await runRobotBusiness(
      event,
      'lingxu.command',
      {},
      parseLingxuPage,
      next,
      // Structured middleware rejections must not echo unvalidated command/free-text parameters.
      adviceRenderer(() => failure('本次操作未完成，请查看当前状态；确认操作请继续原确认，不要重建预览。', parsed.confirmationCommand)),
      parsed.readOnly ? createBackendReadRequestContext() : createBackendRequestContext(event, 'lingxu.command'),
      async () => {
        await failure('请求未获完整确认，请查看当前状态；确认操作可重试原确认。', parsed.confirmationCommand);

        return true;
      }
    );

    if (!result.handled) {
      await send(lingxuBubble(result.data, event.UserId));
    }
  } catch {
    // Never log raw backend content, player inputs or opaque confirmation references.
    logger.error('灵墟洞天页面未完成');
    await failure('页面暂时无法显示，请查看当前状态；确认操作请保留原确认。', parsed.confirmationCommand);
  }
});
