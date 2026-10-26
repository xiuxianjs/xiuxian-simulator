import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendFriendReject } from '@src/api/bot/friend-request-reject';
import { parseGuardedSocialAction } from '@src/api/bot/social-robot-query';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayerView';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e.UserId;
  const isPrivate = e.isPrivate ?? false;
  const match = (e.MessageText?.trim() ?? '').match(/^[!！/#＃]?拒绝结交\s+(\d+)$/);
  const input = match?.[1]?.trim() ?? '';
  const id = input ? parseInt(input, 10) : null;

  const args = { requestId: id === null ? '' : id.toString() };

  const result = await runRobotBusiness(e, 'friends.reject', args, value => parseGuardedSocialAction(value, parseBackendFriendReject), next);

  if (result.handled) {
    return;
  }
  const { access, data } = result.data;

  if (!access.ok) {
    sendFifthLayerLockedPage({ bid, isPrivate, message, title: '拒绝结交', realmName: access.realmName });

    return;
  }
  if (!input) {
    const md = Format.createMarkdown();

    md.addText('使用方法：拒绝结交 <申请ID>');
    appendMiddlewareAdvice(md, [{ command: '/好友申请', description: '从本人收到的待处理申请选择申请编号，玩家UID不能代替申请ID' }]);
    void message.send(FormatGui({ isPrivate, bid, title: '【拒绝结交】', content: md }));

    return;
  }
  if (data === null) {
    throw new Error('社交操作响应不完整');
  }
  if (data.outcome === 'locked') {
    sendFifthLayerLockedPage({ bid, isPrivate, message, title: '拒绝结交', realmName: data.realmName ?? '未知' });

    return;
  }

  const md = Format.createMarkdown();

  md.addText(`已拒绝「${data.listed ? (data.fromUserName ?? '未知用户') : '对方'}」的结交申请`);
  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
