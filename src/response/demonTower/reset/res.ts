import { useMessage } from '@src/utils/useMessage';
/**
 * 妖塔重置指令（消耗重列旗）
 * 指令：/妖塔重置
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseReset } from '@src/api/bot/demon-tower-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const sendFailure = async (text: string) => {
    const md = Format.createMarkdown().addText(text).addNewline();

    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: md,
        footer: [
          { label: '万宝楼', command: '/商店 万宝楼' },
          { label: '本命物', command: '/我的本命物' }
        ]
      })
    );
  };
  const loaded = await runRobotBusiness(e, 'demon-tower.reset', {}, parseReset, next, async reply => {
    await sendFailure(reply.text);
  }).catch(async error => {
    await sendFailure(error instanceof Error ? error.message : '妖塔重置失败，请稍后再试');

    return { handled: true as const };
  });

  if (loaded.handled) {
    return;
  }
  const md = Format.createMarkdown();

  md.addText(loaded.data.message);
  md.addNewline();
  md.addNewline();

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '',
      content: md,
      footer: [
        { label: '挑战1🌟', command: '/妖塔挑战 1' },
        { label: '挑战2🌟', command: '/妖塔挑战 2' },
        { label: '挑战3🌟', command: '/妖塔挑战 3' },
        { label: '妖塔扫荡', command: '/妖塔扫荡' },
        { label: '妖塔信息', command: '/妖塔' }
      ]
    })
  );
});
