import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { friendRecoveryTips } from '@src/response/friendRecovery';
import { formatGameTimeAgo } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendBlocklist } from '@src/api/bot/queries';
import { parseGuardedSocialQuery } from '@src/api/bot/social-robot-query';
import { runRobotBusiness } from '@src/response/robotBusiness';
/**
 * 黑名单列表指令
 */
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayer';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const result = await runRobotBusiness(e, 'friends.blocklist', {}, data => parseGuardedSocialQuery(data, parseBackendBlocklist), next);

  if (result.handled) {
    return;
  }
  const { access: fifthLayerAccess, data: items } = result.data;

  if (!fifthLayerAccess.ok) {
    sendFifthLayerLockedPage({ bid, isPrivate, message, title: '黑名单', realmName: fifthLayerAccess.realmName });

    return;
  }

  if (items === null) {
    return;
  }

  if (items.length === 0) {
    const md = Format.createMarkdown();

    md.addText('黑名单为空');
    appendMiddlewareAdvice(md, friendRecoveryTips('friends.blocklist', '黑名单为空'));

    void message.send(FormatGui({ isPrivate, bid, title: '【黑名单】', content: md }));

    return;
  }

  const md = Format.createMarkdown();

  md.addText(`共${items.length}人`);
  md.addNewline();

  items.forEach(item => {
    const timeAgo = formatGameTimeAgo(item.createdAt, true);

    md.addNewline();
    md.addText(`【${item.id}】${item.blockedUserName} - ${timeAgo}`);

    addOptions(md, [{ label: '取消', command: `/取消拉黑 ${item.id}` }]);
  });

  void message.send(FormatGui({ isPrivate, bid, title: '【黑名单】', content: md }));
});

/**
 * 获取时间差描述
 */
