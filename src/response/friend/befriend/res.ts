import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { friendRecoveryTips } from '@src/response/friendRecovery';
import { useMessage } from '@src/utils/useMessage';
/**
 * 结交好友指令
 * 指令：结交 <UID|@目标>
 */
import { parseBackendFriendWorkflow } from '@src/api/bot/social-workflows';
import type { TargetSelector } from '@src/api/schemas/social-workflows';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { sendFifthLayerLockedPage } from '@src/response/access/fifthLayerView';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useMention, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const match = (e.MessageText?.trim() ?? '').match(/^[!！/#＃]?结交\s+(\d+)$/);
  const number = match ? parseInt(match[1], 10) : null;
  const parsedTargetUid = number === null ? null : isNaN(number) || number <= 0 ? -1 : number;
  const mentioned = parsedTargetUid === null ? await mention.findOne() : null;
  const targetBid = mentioned?.count && mentioned.data?.UserId ? mentioned.data.UserId : null;
  const selector: TargetSelector = parsedTargetUid && parsedTargetUid > 0 ? { targetUid: String(parsedTargetUid) } : targetBid ? { targetBid } : {};
  const result = await runRobotBusiness(e, 'friends.request', selector, value => parseBackendFriendWorkflow(value, 'request'), next);

  if (result.handled) {
    return;
  }
  const data = result.data;

  if (data.outcome === 'locked') {
    sendFifthLayerLockedPage({ bid, isPrivate, message, title: '结交好友', realmName: data.realmName ?? '未知' });

    return;
  }

  if ((data.outcome !== 'result' || !data.request) && parsedTargetUid !== -1) {
    const md = Format.createMarkdown();

    md.addText('使用方法：结交 <UID|@目标>');
    appendMiddlewareAdvice(md, friendRecoveryTips('friends.request', '使用方法'));
    md.addNewline();
    md.addText('示例：结交 10000000001 或 结交 @目标');

    void message.send(FormatGui({ isPrivate, bid, title: '【结交好友】', content: md }));

    return;
  }

  if (parsedTargetUid === -1) {
    const md = Format.createMarkdown();

    md.addText('请输入有效的UID，或直接 @目标');
    appendMiddlewareAdvice(md, friendRecoveryTips('friends.request', '请输入有效UID'));

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  if (data.outcome === 'result' && data.request) {
    const md = Format.createMarkdown();

    md.addText(`已向「${data.request.targetName}」发送结交申请，等待对方同意`);
    md.addNewline();
    md.addText('申请有效期：1小时');
    addOptions(md, [{ label: '我的好友', command: '/我的好友' }]);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
