import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { friendRecoveryTips } from '@src/response/friendRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendBlockUser } from '@src/api/bot/block-user-by-name';
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
  const match = (e.MessageText?.trim() ?? '').match(/^[!！/#＃]?拉黑\s+(.+)$/);
  const input = match?.[1]?.trim() ?? '';
  const args = { targetName: input };

  const result = await runRobotBusiness(e, 'friends.block', args, value => parseGuardedSocialAction(value, parseBackendBlockUser), next);

  if (result.handled) {
    return;
  }
  const { access, data } = result.data;

  if (!access.ok) {
    sendFifthLayerLockedPage({ bid, isPrivate, message, title: '拉黑用户', realmName: access.realmName });

    return;
  }
  if (!input) {
    const md = Format.createMarkdown();

    md.addText('使用方法：拉黑 <玩家名称>');
    appendMiddlewareAdvice(md, friendRecoveryTips('friends.block', '使用方法：拉黑 <玩家名称>'));
    void message.send(FormatGui({ isPrivate, bid, title: '【拉黑用户】', content: md }));

    return;
  }
  if (data === null) {
    throw new Error('社交操作响应不完整');
  }
  if (data.outcome === 'locked') {
    sendFifthLayerLockedPage({ bid, isPrivate, message, title: '拉黑用户', realmName: data.realmName ?? '未知' });

    return;
  }

  const md = Format.createMarkdown();

  md.addText(`已将${data.name}加入黑名单`);
  md.addNewline();
  md.addText('对方将无法向你发送结交申请');
  appendMiddlewareAdvice(md, friendRecoveryTips('friends.block', `已将${data.name}加入黑名单`));
  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
