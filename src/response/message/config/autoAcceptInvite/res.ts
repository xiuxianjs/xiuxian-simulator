import { useMessage } from '@src/utils/useMessage';
/**
 * 配置自动同意队伍邀请
 * 指令：配置自动同意队伍邀请 [所有人|仅好友|仅道侣|关闭]
 */

import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

const RULE_MAP: Record<string, string> = {
  所有人: 'all',
  仅好友: 'friend',
  仅道侣: 'companion',
  关闭: 'none'
};

const RULE_DESC: Record<string, string> = {
  all: '所有队伍邀请将自动通过，无需手动审核。',
  friend: '仅好友发送的队伍邀请将自动通过。',
  companion: '仅道侣发送的队伍邀请将自动通过。',
  none: '所有队伍邀请都需要手动审核。'
};

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;
  const messageText = e.MessageText ?? '';

  const match = messageText.match(/^(!|！|\/|#|＃)?配置自动同意队伍邀请\s+(所有人|仅好友|仅道侣|关闭)$/);

  {
    const ruleKey = match?.[2] ?? '';
    const ruleValue = RULE_MAP[ruleKey] ?? 'none';

    const loaded = await runRobotBusiness(
      e,
      'settings.team-auto-accept-invite',
      { value: ruleValue },
      value => {
        if (!value || typeof value !== 'object' || !('teamAutoAcceptInvite' in value) || typeof value.teamAutoAcceptInvite !== 'string') {
          throw new Error('设置响应不完整');
        }

        return value;
      },
      next
    );

    if (loaded.handled) {
      return;
    }
    const result = { code: 'OK' as const, data: { type: 'TEAM_AUTO_ACCEPT_INVITE' as const, rule: loaded.data.teamAutoAcceptInvite } };
    const md = Format.createMarkdown();

    if (result.code !== 'OK') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    if (result.data.type !== 'TEAM_AUTO_ACCEPT_INVITE') {
      md.addText('设置配置失败');

      void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

      return;
    }

    const ruleLabel = ruleKey === '关闭' ? '关闭' : ruleKey;

    md.addText(`自动同意队伍邀请已设置为「${ruleLabel}」`);
    md.addNewline();
    md.addText(RULE_DESC[ruleValue]);

    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
  }
});
