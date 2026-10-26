import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { masterRecoveryTips } from '@src/response/masterRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseMasterAction } from '@src/api/bot/master-actions';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  let data;

  try {
    const result = await runRobotBusiness(e, 'master.graduation-apply', {}, parseMasterAction, next);

    if (result.handled) {
      return;
    }
    data = result.data;
  } catch (error) {
    void message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(error instanceof Error ? error.message : '操作失败') }));

    return;
  }
  const md = Format.createMarkdown();

  md.addText(data.message);
  appendMiddlewareAdvice(md, masterRecoveryTips('master.graduation-apply', data.message));

  void message.send(FormatGui({ isPrivate, bid, title: '', content: md }));
});
