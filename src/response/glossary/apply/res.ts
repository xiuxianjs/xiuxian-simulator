import { useMessage } from '@src/utils/useMessage';
/**
 * 申请词典编辑权限
 *
 * 指令格式：
 *   /申请词典编辑权限
 *   /申请词典编辑权限 申请理由
 */
import { parseRobotGlossaryApply, GLOSSARY_APPLY_REASON_MAX_LENGTH, parseApplyParams } from '@src/api/bot/glossary-actions-robot';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { glossaryFeedbackMessage } from '../feedback';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const renderFeedback = async (reply: Parameters<typeof glossaryFeedbackMessage>[1]) => {
    await message.send(glossaryFeedbackMessage(e, reply));
  };

  const parsed = parseApplyParams(e.MessageText ?? '');

  const loaded = await runRobotBusiness(e, 'glossary.apply', { reason: parsed.reason }, parseRobotGlossaryApply, next, renderFeedback);

  if (loaded.handled) {
    return;
  }
  const md = Format.createMarkdown();

  md.addText('✅ 词典编辑权限申请已提交');
  md.addNewline();
  if (parsed.reason) {
    md.addText(`申请理由：${parsed.reason}`);
    md.addNewline();
  }
  md.addText(`如需补充说明，可使用：/申请词典编辑权限 申请理由（最多${GLOSSARY_APPLY_REASON_MAX_LENGTH}字）`);
  md.addNewline();
  md.addText('请等待运营在审核项目中处理，审核通过后即可录入词典。');

  void message.send(
    FormatGui({
      isPrivate,
      bid,
      title: '词典',
      content: md,
      footer: [
        { label: '返回词典', command: '/词典' },
        { label: '录入词典', command: '/录入词典' }
      ]
    })
  );
});
