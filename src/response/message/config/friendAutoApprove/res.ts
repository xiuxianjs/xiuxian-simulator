import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;
  const messageText = e.MessageText ?? '';

  const match = messageText.match(/^(!|！|\/|#|＃)?配置好友自动审批进队\s+(开启|关闭)$/);

  {
    const enabled = match?.[2] === '开启';
    const loaded = await runRobotBusiness(
      e,
      'settings.friend-team-approval',
      { value: enabled },
      value => {
        if (!value || typeof value !== 'object' || !('autoApproveFriendTeam' in value) || typeof value.autoApproveFriendTeam !== 'boolean') {
          throw new Error('设置响应不完整');
        }

        return value;
      },
      next
    );

    if (loaded.handled) {
      return;
    }
    const result = { code: 'OK' as const, data: { type: 'AUTO_APPROVE_FRIEND_TEAM' as const, enabled: loaded.data.autoApproveFriendTeam } };
    const md = Format.createMarkdown();

    if (result.code !== 'OK') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    if (result.data.type !== 'AUTO_APPROVE_FRIEND_TEAM') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    md.addText(`好友自动审批进队已${result.data.enabled ? '开启' : '关闭'}`);
    md.addNewline();
    md.addText(result.data.enabled ? '你的好友申请加入你的队伍时将自动通过审批。' : '好友申请加入队伍时需要你手动审核。');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
