import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendCaveFormationRemoval, caveFormationKeyword } from '@src/api/bot/cave-formation-actions';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const keyword = caveFormationKeyword(e.MessageText ?? '', 'remove');

  const md = Format.createMarkdown();

  const footer = [
    { label: '洞府阵法', command: '/洞府阵法' },
    { label: '万宝楼', command: '/商店 万宝楼' }
  ];

  const renderFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('cave-formations.remove', { ...reply, title: reply.title || '移除阵法' }), 'footer')
  );

  try {
    const [, next] = useEvent();
    const response = await runRobotBusiness(e, 'cave-formations.remove', { keyword }, parseBackendCaveFormationRemoval, next, renderFailure);

    if (response.handled) {
      return;
    }
    const result = response.data;

    md.addText(`你已移除【${result.name}】。`);
    await message.send(FormatGui({ isPrivate, bid, title: '移除成功', content: md, footer }));
  } catch (error) {
    logger.error('[移除阵法] 结果未获完整确认', error);
    await renderFailure({ title: '', heading: '', text: '移除阵法结果未获完整确认，请先核对当前阵法、库存与原回执。', buttons: [], advice: [] });
  }
});
