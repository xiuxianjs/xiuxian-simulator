import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import { masterRecoveryTips } from '@src/response/masterRecovery';
import { useMessage } from '@src/utils/useMessage';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseMasterAction } from '@src/api/bot/master-actions';
import { selects } from '@src/response/config';
import { addOptions, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const md = Format.createMarkdown();

  try {
    const loaded = await runRobotBusiness(e, 'master.teach-all', {}, parseMasterAction, next);

    if (loaded.handled) {
      return;
    }
    const quote = Format.createMarkdown();

    loaded.data.message
      .split('\n')
      .filter(Boolean)
      .forEach(line => quote.addText(line).addNewline());
    appendMiddlewareAdvice(quote, masterRecoveryTips('master.teach-all', loaded.data.message));
    addOptions(quote, [{ label: '我的师门', command: '/我的师门' }]);
    md.addBlockquote(quote);
  } catch (error) {
    md.addText(error instanceof Error ? error.message : '传功失败，请稍后重试');
    appendMiddlewareAdvice(md, masterRecoveryTips('master.teach-all', '批量执行未获完整确认'));
  }

  void message.send(FormatGui({ isPrivate: e.isPrivate ?? false, bid: e.UserId, title: '【一键传功】', content: md }));
});
