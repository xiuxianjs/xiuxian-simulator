import { useMessage } from '@src/utils/useMessage';
/**
 * 配置接受队伍邀请
 * 指令：配置接受队伍邀请 [开启|关闭]
 */

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

  const match = messageText.match(/^(!|！|\/|#|＃)?配置接受队伍邀请\s+(开启|关闭)$/);

  {
    const requestedEnabled = match?.[2] === '开启';
    const loaded = await runRobotBusiness(
      e,
      'settings.team-invites',
      { value: requestedEnabled },
      value => {
        if (!value || typeof value !== 'object' || !('teamInviteEnabled' in value) || typeof value.teamInviteEnabled !== 'boolean') {
          throw new Error('设置响应不完整');
        }

        return value;
      },
      next
    );

    if (loaded.handled) {
      return;
    }
    const result = { code: 'OK' as const, data: { type: 'TEAM_INVITE_ENABLED' as const, enabled: loaded.data.teamInviteEnabled } };
    const md = Format.createMarkdown();

    if (result.code !== 'OK') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    if (result.data.type !== 'TEAM_INVITE_ENABLED') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    const enabled = result.data.enabled;

    md.addText(`接受队伍邀请已${enabled ? '开启' : '关闭'}`);
    md.addNewline();
    md.addText(enabled ? '其他玩家可以向你发送队伍邀请。' : '其他玩家无法向你发送队伍邀请。');

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
