import { adviceRenderer } from '@src/response/feedbackRenderer';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { useMessage } from '@src/utils/useMessage';
import { parseBackendCaveLogs } from '@src/api/bot/cave-queries';
import { sendCavePlotLogPage } from '@src/response/cavePlot/render';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { sendMiddlewareReply } from '@src/response/middlewareReply';
import { selects } from '@src/response/config';
import { onResponse, useEvent, logger } from 'alemonjs';

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? e.name.startsWith('private.');
  const pageMatch = (e.MessageText ?? '').trim().match(/(?:灵田|洞府)记录(?:\s+p?(\d+))?$/);
  const page = pageMatch?.[1] ? Number(pageMatch[1]) : 1;

  const failure = adviceRenderer(reply => sendMiddlewareReply(e, withBusinessRecovery('cave.logs', { ...reply, title: reply.title || '洞府记录' }), 'footer'));

  try {
  const [, next] = useEvent();
  const response = await runRobotBusiness(e, 'cave.logs', { page: String(Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.floor(page) || 1))) }, parseBackendCaveLogs, next, failure);

  if (response.handled) { return; }
  const logResult = response.data;

  sendCavePlotLogPage({
    title: '洞府记录',
    bid,
    isPrivate,
    message,
    logs: logResult.logs,
    page: logResult.page,
    totalPages: logResult.totalPages,
    total: logResult.total
  });
  } catch (error) {
    logger.error('洞府记录查询失败:', error);
    await failure({ title: '', heading: '', text: '获取洞府记录失败，请稍后重试。', buttons: [], advice: [] });
  }
});
