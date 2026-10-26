import { getBackendEventTasks } from '@src/api/bot/event-tasks-queries';
import { logger } from 'alemonjs';

async function queryTasks(uid: number, bid?: string) {
  const groups = await getBackendEventTasks(bid, uid);

  return groups;
}
type TasksResult = { code: 'OK'; data: { taskGroups: Awaited<ReturnType<typeof queryTasks>> } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<TasksResult> {
  try {
    const taskGroups = await queryTasks(params.uid, params.bid);

    return { code: 'OK', data: { taskGroups } };
  } catch (error) {
    logger.error('[活动任务] 错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看活动任务失败，请稍后再试' } };
  }
}
