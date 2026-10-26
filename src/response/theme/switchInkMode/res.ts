import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { useMessage } from '@src/utils/useMessage';
/**
 * 切换墨色模式指令
 * 指令：/切换墨色模式 宣纸水墨 | /切换墨色模式 深底暗黑
 */
import { validateBackendInkMode } from '@src/api/bot/theme-ink-mode';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

const MODE_MAP: Record<string, 'ink' | 'dark'> = {
  宣纸水墨: 'ink',
  深底暗黑: 'dark'
};

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const [, next] = useEvent();
  const isPrivate = e.isPrivate ?? false;

  const text = (e.MessageText ?? '').trim().replace(/^(!|！|\/|#|＃)?/, '');
  const match = text.match(/^切换墨色模式\s+(.+)$/);
  const label = match ? match[1].trim() : '';
  const mode = MODE_MAP[label];

  const md = Format.createMarkdown();

  if (!mode) {
    md.addText('指令格式：/切换墨色模式 宣纸水墨 或 /切换墨色模式 深底暗黑');
    md.addNewline();
    md.addButton(markdownButtonLabel('我的主题'), { data: '/我的主题' });
  } else {
    const response = await runRobotBusiness(e, 'themes.ink-mode', { mode }, data => validateBackendInkMode(data, mode), next);

    if (response.handled) {
      return;
    }
    const result = response.data;

    if (result.code === 'OK') {
      md.addText(`已切换至「${label}」模式。`);
    } else if (result.code === 'NO_ACTIVE_THEME') {
      md.addText('当前无激活主题，请先切换一个主题后再调整模式。');
    } else {
      md.addText('切换失败，请稍后重试。');
    }

    md.addNewline();
    md.addButton(markdownButtonLabel('我的主题'), { data: '/我的主题' });
  }

  void message.send(FormatGui({ isPrivate, bid, title: '切换墨色模式', content: md }));
});
