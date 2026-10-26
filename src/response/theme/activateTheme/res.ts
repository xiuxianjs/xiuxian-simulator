import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { useMessage } from '@src/utils/useMessage';
/**
 * 切换主题指令
 * 指令：/切换主题 <id>
 */
import { validateBackendActivatedTheme } from '@src/api/bot/theme-state';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;

  const text = (e.MessageText ?? '').trim().replace(/^(!|！|\/|#|＃)?/, '');
  const match = text.match(/^切换主题\s+(\d+)$/);
  const themeId = match ? parseInt(match[1], 10) : NaN;

  const md = Format.createMarkdown();

  if (!themeId || isNaN(themeId)) {
    md.addText('指令格式：/切换主题 <主题ID>');
    md.addNewline();
    md.addButton(markdownButtonLabel('我的主题'), { data: '/我的主题' });
  } else {
    // Infinity cannot be transported as a JSON number, matching the legacy
    // adapter's refusal to submit non-finite IDs. Large finite IDs reach admission.
    if (!Number.isFinite(themeId)) {
      throw new Error('主题编号超出可查询范围');
    }
    const response = await runRobotBusiness(e, 'themes.activate', { themeId }, data => validateBackendActivatedTheme(data, themeId), next);

    if (response.handled) {
      return;
    }
    const result = response.data;
    const msg = result.outcome === 'activated' ? `已切换到主题「${result.name}」` : result.outcome === 'not_found' ? '主题不存在或无权访问' : '切换失败';

    md.addText(msg);
    md.addNewline();
    md.addButton(markdownButtonLabel('我的主题'), { data: '/我的主题' });
  }

  void message.send(FormatGui({ isPrivate, bid, title: '切换主题', content: md }));
});
