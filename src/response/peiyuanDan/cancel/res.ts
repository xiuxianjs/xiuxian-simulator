import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { useMessage } from '@src/utils/useMessage';
/**
 * 取消培元丹效果
 * 指令：/取消培元丹
 */
import { parseBackendPeiyuanCancel } from '@src/api/bot/peiyuan-cancel';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, logger, onResponse, useEvent } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const [, parentNext] = useEvent();

  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('peiyuan.cancel', reply), true));

  if (!/^[!！/#＃]?取消培元丹$/.test((e.MessageText ?? '').trim())) {
    await failure({ title: '', heading: '', text: '参数错误：取消培元丹不接收额外参数，请先核对原预览。', buttons: [], advice: [] });

    return;
  }
  try {
    const response = await runRobotBusiness(e, 'peiyuan.cancel', {}, parseBackendPeiyuanCancel, parentNext, failure);

    if (response.handled) {
      return;
    }
    if (response.data.outcome === 'not_pending') {
      await failure({ title: '', heading: '', text: response.data.message, buttons: [], advice: [] });

      return;
    }
    const result = { data: response.data };

    const md = Format.createMarkdown();

    md.addText('⚠️ 培元丹效果已取消');
    md.addNewline();
    md.addNewline();
    md.addText(result.data.message);

    void message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '',
        content: md,
        footer: [
          { label: '查看属性', command: '/属性面板' },
          { label: '继续服用', command: '/服用 培元丹 1' }
        ]
      })
    );
  } catch (error) {
    logger.error('取消培元丹失败:', error);
    await failure({ title: '', heading: '', text: '培元丹取消结果未获完整确认，请先核对属性、原预览与持有数量。', buttons: [], advice: [] });
  }
});
