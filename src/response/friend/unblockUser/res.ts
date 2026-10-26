import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { friendRecoveryTips } from '@src/response/friendRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendUnblock } from '@src/api/bot/blocklist-removal';
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
  const match = (e.MessageText?.trim() ?? '').match(/^[!！/#＃]?取消拉黑\s+(.+)$/);
  const input = match?.[1]?.trim() ?? '';
  const numeric = /^[+-]?\d+$/.test(input);
  const id = numeric ? parseInt(input, 10) : NaN;

  const args = !input ? {} : numeric ? { recordId: id.toString() } : { exactName: input };

  const result = await runRobotBusiness(e, 'friends.unblock', args, value => parseGuardedSocialAction(value, parseBackendUnblock), next);

  if (result.handled) {
    return;
  }
  const { access, data } = result.data;

  if (!access.ok) {
    sendFifthLayerLockedPage({ bid, isPrivate, message, title: '取消拉黑', realmName: access.realmName });

    return;
  }
  if (!input) {
    const md = Format.createMarkdown();

    md.addText('使用方法：取消拉黑 <记录ID或玩家名称>');
    appendMiddlewareAdvice(md, friendRecoveryTips('friends.unblock', '使用方法：取消拉黑 <记录ID或玩家名称>'));
    void message.send(FormatGui({ isPrivate, bid, title: '【取消拉黑】', content: md }));

    return;
  }
  if (data === null) {
    throw new Error('社交操作响应不完整');
  }
  if (data.outcome === 'locked') {
    sendFifthLayerLockedPage({ bid, isPrivate, message, title: '取消拉黑', realmName: data.realmName ?? '未知' });

    return;
  }

  const md = Format.createMarkdown();

  md.addText(`已将${data.name ?? '该用户'}移出黑名单`);
  appendMiddlewareAdvice(md, friendRecoveryTips('friends.unblock', `已将${data.name ?? '该用户'}移出黑名单`));
  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
