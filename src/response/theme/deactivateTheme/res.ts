import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { useMessage } from '@src/utils/useMessage';
/**
 * 关闭主题指令
 * 指令：/关闭主题
 */
import { validateBackendDeactivatedTheme } from '@src/api/bot/theme-state';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;

  const result = await runRobotBusiness(e, 'themes.deactivate', {}, validateBackendDeactivatedTheme, next);

  if (result.handled) {
    return;
  }

  const md = Format.createMarkdown();

  md.addText('已关闭当前主题，恢复默认外观。');
  md.addNewline();
  md.addButton(markdownButtonLabel('我的主题'), { data: '/我的主题' });

  void message.send(FormatGui({ isPrivate, bid, title: '关闭主题', content: md }));
});
