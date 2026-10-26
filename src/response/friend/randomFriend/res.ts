import { parseBackendRandomFriend } from '@src/api/bot/random-friend-queries';
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayer';
import { selects } from '@src/response/config';
import { friendRecoveryTips } from '@src/response/friendRecovery';
import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

/**
 * 随机好友推荐指令
 * 指令：/随机好友
 */
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();

  try {
    const result = await runRobotBusiness(e, 'friends.random', {}, parseBackendRandomFriend, next);

    if (result.handled) {
      return;
    }

    if (!result.data.access.ok) {
      sendFifthLayerLockedPage({ bid, isPrivate, message, title: '随机好友', realmName: result.data.access.realmName ?? '未知' });

      return;
    }

    if (!result.data.player) {
      const md = Format.createMarkdown();

      md.addText('当前没有可以推荐的道友，请稍后再试');
      appendMiddlewareAdvice(md, friendRecoveryTips('friends.random', '当前没有可以推荐的道友，请稍后再试'));

      void message.send(FormatGui({ isPrivate, bid, title: '随机推荐道友', content: md }));

      return;
    }

    const { uid: targetUid, name } = result.data.player;
    const realmName = result.data.player.realmName ?? '无境界';
    const activeTitle = result.data.player.activeTitle ?? '无';

    {
      const md = Format.createMarkdown();

      md.addText(`UID: ${targetUid} `);
      md.addButton(markdownButtonLabel('结交'), { data: `/结交 ${targetUid}` });
      md.addText(' ');
      md.addButton(markdownButtonLabel('查看'), { data: `/查看信息 ${targetUid}` });
      md.addText(' ');
      md.addButton(markdownButtonLabel('比试'), { data: `/比试 ${targetUid}` });
      md.addNewline();
      md.addText(`道号：${name}`);
      md.addNewline();
      md.addText(`称号：${activeTitle}`);
      md.addNewline();
      md.addText(`境界：${realmName}`);
      md.addNewline();
      md.addNewline();
      md.addText('茫茫人海，缘来是你，不妨结为道友，共赴仙途');

      void message.send(FormatGui({ isPrivate, bid, title: '随机推荐道友', content: md }));
    }
  } catch (error) {
    logger.error('[随机好友] 错误:', error);
    const md = Format.createMarkdown();

    md.addText(error instanceof Error ? error.message : '推荐道友失败，请稍后再试');

    void message.send(FormatGui({ isPrivate, bid, title: '随机推荐道友', content: md }));
  }
});
