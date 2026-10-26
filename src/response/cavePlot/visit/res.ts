import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { adviceRenderer } from '@src/response/feedbackRenderer';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { parseCavePage } from '../pagination';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendCaveVisit } from '@src/api/bot/cave-visit-queries';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { sendVisitedCavePlotPage } from '@src/response/cavePlot/render';
import { selects } from '@src/response/config';
import { resolveRobotTarget } from '@src/utils/targetUid';
import { onResponse, useMention, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [mention] = useMention();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');

  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('cave.visit', { ...reply, title: reply.title || '查看灵田' }), 'footer'));

  try {
    const [, next] = useEvent();
    const { text, page } = parseCavePage(e.MessageText ?? '');
    const target = await resolveRobotTarget(text, mention);
    const response = await runRobotBusiness(
      e,
      'cave.visit',
      { target },
      value => {
        const data = parseBackendCaveVisit(value);

        if (target && 'uid' in target && data.ownerUid !== target.uid) {
          throw new Error('访问回执目标不匹配');
        }

        return data;
      },
      next,
      failure
    );

    if (response.handled) {
      return;
    }
    const overview = response.data;
    const footer = [
      { label: '查看信息', command: `/查看信息 ${overview.ownerUid}` },
      { label: '返回灵田', command: '/我的灵田' }
    ];

    sendVisitedCavePlotPage({
      title: '查看灵田',
      bid,
      isPrivate,
      message,
      overview,
      page,
      footer
    });
  } catch (error) {
    logger.error('查看灵田失败:', error);
    await failure({ title: '', heading: '', text: '获取目标灵田失败，请稍后重试。', buttons: [], advice: [] });
  }
});
