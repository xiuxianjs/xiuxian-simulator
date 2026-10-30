import { isPrivateEvent } from '@src/utils/privateEvent';
import { parseRobotFlyMailMute } from '@src/api/bot/flymail-mute';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { useMessage } from '@src/utils/useMessage';
import { parseFlyMailMuteCommand, formatFlyMailMuteResult } from '@src/utils/flyMailCommand';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = isPrivateEvent(e);
  const parsed = parseFlyMailMuteCommand(e.MessageText);

  if (!parsed) {
    return next();
  }

  if (!isPrivate) {
    await message.send(FormatGui({ bid, bar: false, content: Format.createMarkdown().addText('请私聊机器人管理飞信屏蔽设置。') }));

    return;
  }

  let targetUid = 0;
  let targetBid: string | undefined;

  if (parsed.targetArg && /^\d+$/.test(parsed.targetArg) && Number(parsed.targetArg) > 0) {
    targetUid = Number(parsed.targetArg);
  } else {
    const target = await mention.findOne();

    if (target.count && target.data?.UserId) {
      targetBid = target.data.UserId;
    }
  }

  try {
    const response = await runRobotBusiness(
      e,
      parsed.action === 'mute' ? 'flymail.mute' : 'flymail.unmute',
      { targetUid: Number.isFinite(targetUid) ? String(targetUid) : null, targetBid: targetBid ?? null },
      parseRobotFlyMailMute,
      next,
      async reply => {
        await message.send(
          FormatGui({
            isPrivate,
            bid,
            title: reply.title,
            content: Format.createMarkdown().addText(reply.text),
            footer: reply.buttons.length ? reply.buttons : undefined
          })
        );
      }
    );

    if (response.handled) {
      return;
    }
    const result = formatFlyMailMuteResult(response.data, parsed.action);

    const md = Format.createMarkdown();

    md.addText(result.message);

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '飞信',
        content: md,
        footer: [
          ...(parsed.action === 'mute' && targetUid > 0 && result.outcome === 'updated' ? [{ label: '解除屏蔽', command: `/飞信解除 ${targetUid}` }] : []),
          { label: '查看飞信', command: '/飞信' }
        ]
      })
    );
  } catch {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '飞信',
        content: Format.createMarkdown().addText('操作结果待确认，请稍后查看。'),
        footer: [{ label: '查看飞信', command: '/飞信' }]
      })
    );
  }
});
