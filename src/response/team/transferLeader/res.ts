import { parseTargetSuggestions, targetSuggestionsBubble } from '@src/response/targetSuggestions';
import { useMessage } from '@src/utils/useMessage';
/**
 * 转让队长
 * 指令：转让队长 [目标玩家UID/@目标]
 */

import { resolveTransferTarget } from '@src/utils/teamTarget';
import { parseBackendTeamWorkflow } from '@src/api/bot/social-workflows';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { MSG_TEAM } from '@src/constants/messages';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useMention, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const messageText = e.MessageText || '';
  const targetUid = await resolveTransferTarget(bid, messageText, mention);

  let data;

  try {
    const result = await runRobotBusiness(
      e,
      'teams.leadership',
      { ...(targetUid ?? {}), suggestTargets: true },
      value => parseTargetSuggestions(value, raw => parseBackendTeamWorkflow(raw, 'leadership')),
      next
    );

    if (result.handled) {
      return;
    }
    if (result.data.mode === 'suggestions') {
      await message.send(targetSuggestionsBubble(e, '转让队长', result.data.ids, result.data.reason));

      return;
    }
    data = result.data.result;
    if (!('outcome' in data)) {
      throw new Error('队伍操作响应不完整');
    }
  } catch (error) {
    logger.error(error);
    const md = Format.createMarkdown();

    md.addText(error instanceof Error ? error.message : '操作失败');
    void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));

    return;
  }

  if (data.outcome === 'target_missing') {
    await message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: Format.createMarkdown().addText('未找到有效的目标队员，请从当前队伍成员中核对UID，或直接 @目标。'),
        footer: [{ label: '核对队伍成员', command: '/我的队伍' }]
      })
    );

    return;
  }

  const md = Format.createMarkdown();

  md.addText(MSG_TEAM.TRANSFER_SUCCESS);

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
