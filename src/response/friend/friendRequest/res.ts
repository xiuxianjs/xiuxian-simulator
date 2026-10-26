import { formatGameTimeAgo } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendFriendRequests } from '@src/api/bot/queries';
import { parseGuardedSocialQuery } from '@src/api/bot/social-robot-query';
import { runRobotBusiness } from '@src/response/robotBusiness';
/**
 * 好友申请列表指令
 */
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayer';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';
export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const result = await runRobotBusiness(e, 'friends.requests', {}, data => parseGuardedSocialQuery(data, parseBackendFriendRequests), next);

  if (result.handled) {
    return;
  }
  const { access: fifthLayerAccess, data: requests } = result.data;

  if (!fifthLayerAccess.ok) {
    sendFifthLayerLockedPage({
      bid,
      isPrivate: e.isPrivate ?? false,
      message,
      title: '结交申请',
      realmName: fifthLayerAccess.realmName
    });

    return;
  }

  if (requests === null) {
    return;
  }

  const md = Format.createMarkdown();

  if (requests.length === 0) {
    md.addText('暂无待处理的结交申请');
  } else {
    md.addBlockquote(Format.createMarkdown().addText('1小时内有效'));

    requests.forEach(request => {
      const timeAgo = formatGameTimeAgo(request.createdAt, false);

      md.addBlockquote(
        createQuoteMarkdown(
          [`${request.fromUserName}`, `ID:${request.fromUserId}`, `境界:${request.fromUserRealm}`, `时间:${timeAgo}`],
          [
            { label: '同意', command: `/同意结交 ${request.id}` },
            { label: '拒绝', command: `/拒绝结交 ${request.id}` }
          ]
        )
      );
      if (request.message) {
        md.addNewline();
        md.addText(`附言：${request.message}`);
      }
    });
  }

  void message.send(
    FormatGui({
      isPrivate: e.isPrivate ?? false,
      bid,
      title: '结交申请',
      header: [{ label: '我的好友', command: '/我的好友' }],
      content: md
    })
  );
});

/**
 * 获取时间差描述
 */
