import { withBusinessRecovery } from '@src/response/businessRecovery';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendCaveFormationActivation, caveFormationKeyword } from '@src/api/bot/cave-formation-actions';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { selects } from '@src/response/config';
import { FormatGui } from '@src/utils/messageHelper';
import { Format, onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const keyword = caveFormationKeyword(e.MessageText ?? '', 'activate');

  const md = Format.createMarkdown();

  const footer = [
    { label: '洞府阵法', command: '/洞府阵法' },
    { label: '万宝楼', command: '/商店 万宝楼' }
  ];

  const renderFailure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('cave-formations.activate', { ...reply, title: reply.title || '激活阵盘' }), 'footer')
  );

  try {
    const [, next] = useEvent();
    const response = await runRobotBusiness(e, 'cave-formations.activate', { keyword }, parseBackendCaveFormationActivation, next, renderFailure);

    if (response.handled) {
      return;
    }
    const result = response.data;
    const messageText =
      result.outcome === 'refreshed'
        ? `你重新布下【${result.formation.formationName}】，持续时间已刷新为 ${result.durationHours} 小时。`
        : result.outcome === 'replaced'
          ? `你以【${result.formation.formationName}】替换了同类阵法【${result.replacedFormationName}】，新阵持续 ${result.durationHours} 小时。`
          : `你成功布下【${result.formation.formationName}】，持续 ${result.durationHours} 小时。`;

    md.addText(messageText);
    await message.send(FormatGui({ isPrivate, bid, title: '激活成功', content: md, footer }));
  } catch (error) {
    logger.error('[激活阵盘] 结果未获完整确认', error);
    await renderFailure({ title: '', heading: '', text: '激活阵盘结果未获完整确认，请先核对当前阵法、库存与原回执。', buttons: [], advice: [] });
  }
});
