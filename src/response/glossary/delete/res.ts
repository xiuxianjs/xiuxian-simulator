import { useMessage } from '@src/utils/useMessage';
/**
 * 删除词典词条
 *
 * 指令格式：
 *   /删除词典 词条名
 *
 * 权限：仅白名单玩家可操作
 * 风控：操作日志记录
 */
import { parseRobotGlossaryDelete, parseDeleteParams } from '@src/api/bot/glossary-actions-robot';
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

  // 参数解析仅决定指令格式；权限和词条状态由删除接口裁决。
  const keyword = parseDeleteParams(e.MessageText ?? '');

  const loaded = await runRobotBusiness(e, 'glossary.delete', { keyword }, parseRobotGlossaryDelete, next, renderFeedback);

  if (loaded.handled) {
    return;
  }

  const md = Format.createMarkdown();

  md.addText(`✅ 词条「${keyword}」已删除`);

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
