import { soulWashFeedback } from '@src/response/soulArtifact/washFeedback';
import { useMessage } from '@src/utils/useMessage';
/**
 * 本命物洗涤指令（消耗洗涤石）
 *
 * 用法：本命物洗涤
 */
import { runRobotBusiness } from '@src/response/robotBusiness';
import { parseSoulArtifactWashPreview } from '@src/api/bot/soul-artifact-wash';
import { selects } from '@src/response/config';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');

  const text = e.MessageText?.trim() ?? '';
  const match = text.match(/^[!！/#＃]?本命物洗涤\s*(\d+)?$/);

  const [, parentNext] = useEvent();
  const renderFailure = soulWashFeedback(e, 'preview');

  if (!match) {
    await renderFailure({ title: '', heading: '', text: '本命物洗涤仅支持单次，请直接发送 /本命物洗涤', buttons: [], advice: [] });

    return;
  }
  const response = await runRobotBusiness(
    e,
    'soul-artifacts.wash',
    { count: match?.[1] ?? null },
    parseSoulArtifactWashPreview,
    parentNext,
    renderFailure
  ).catch(async () => {
    await renderFailure({ title: '', heading: '', text: '本命物洗涤结果未获完整确认，请先核对面板、原预览与洗涤石。', buttons: [], advice: [] });

    return { handled: true as const };
  });

  if (response.handled) {
    return;
  }
  const times = 1;
  const { totalSuccess, results, finalMessage: previewMessage } = response.data.pending;

  const md = Format.createMarkdown();

  if (times <= 3 && totalSuccess > 0) {
    const allLines: string[] = [];

    results.forEach((r, i) => {
      if (r.success && r.details?.length) {
        const actionName = r.action === 'add' ? '新增' : r.action === 'replace' ? '替换' : '升级';

        allLines.push(`第${i + 1}次 · ${actionName}`, ...r.details, '');
      }
    });

    if (allLines.length > 0) {
      md.addText(allLines.join('\n'));
    }
  } else if (totalSuccess > 0) {
    md.addText(`已生成 ${totalSuccess} 次洗涤预览`);
    md.addNewline();
    md.addBlockquote(Format.createMarkdown().addText('请确认是否保留本次结果'));
  }

  md.addNewline();
  md.addText(previewMessage);
  md.addNewline();
  md.addBlockquote(
    createQuoteMarkdown(
      ['原预览有效期60秒，生成预览已消耗洗涤石', '确认：保留本次洗涤结果', '取消：放弃本次洗涤结果，洗涤石不返还'],
      [
        { label: '确认保留', command: '/确认本命物洗涤' },
        { label: '放弃结果', command: '/取消本命物洗涤' },
        { label: '本命物信息', command: '/本命物信息' }
      ]
    )
  );

  void message.send(FormatGui({ isPrivate, bid, title: '本命物洗涤预览', content: md }));
});
