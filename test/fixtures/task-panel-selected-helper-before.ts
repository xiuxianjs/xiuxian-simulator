import { requestBackend } from '../../src/api/bot/client';
import type { TaskPanelView } from '../../src/api/schemas/task-panel-view';

const keys = new Set(['checkin', 'activity', 'cultivation', 'dungeon', 'guild', 'event', 'auto']);
const priorityByStatus: Record<string, number> = { ACTIONABLE: 10, IN_PROGRESS: 20, COMPLETED: 30, UNAVAILABLE: 40, ERROR: 50 };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The Go view owns tab eligibility, item status, order and default selection. */
export async function getBackendTaskPanelView(bid: string | undefined, uid: number): Promise<TaskPanelView> {
  if (!bid) {
    throw new Error('任务面板查询缺少平台身份');
  }
  const value: unknown = await requestBackend(bid, 'get_players_id_task_panel_view', { path: { id: uid } });

  if (!record(value) || !Array.isArray(value.tabs) || value.tabs.length !== keys.size || !keys.has(String(value.defaultTabKey))) {
    throw new Error('任务面板视图响应不完整');
  }
  const seen = new Set<string>();

  for (const tab of value.tabs) {
    if (
      !record(tab) ||
      typeof tab.tabKey !== 'string' ||
      !keys.has(tab.tabKey) ||
      seen.has(tab.tabKey) ||
      typeof tab.tabName !== 'string' ||
      typeof tab.visible !== 'boolean' ||
      typeof tab.hasActionable !== 'boolean' ||
      !Array.isArray(tab.items)
    ) {
      throw new Error('任务面板 Tab 响应不完整');
    }
    seen.add(tab.tabKey);
    for (const item of tab.items) {
      if (
        !record(item) ||
        typeof item.label !== 'string' ||
        typeof item.statusText !== 'string' ||
        typeof item.status !== 'string' ||
        !(item.status in priorityByStatus) ||
        item.priority !== priorityByStatus[item.status] ||
        typeof item.visible !== 'boolean' ||
        (item.command !== undefined && typeof item.command !== 'string')
      ) {
        throw new Error('任务面板条目响应不完整');
      }
    }
  }

  return value as TaskPanelView;
}
