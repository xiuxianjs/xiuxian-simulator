import { requestBackend } from './client';
import type { TaskPanelView, TaskPanelTabView } from '../schemas/task-panel-view';

const keys = new Set(['checkin', 'activity', 'cultivation', 'dungeon', 'guild', 'event', 'auto']);
const robotKeys = new Set([...keys, 'master', 'companion']);
const priorityByStatus: Record<string, number> = { ACTIONABLE: 10, IN_PROGRESS: 20, COMPLETED: 30, UNAVAILABLE: 40, ERROR: 50 };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function validateItems(items: unknown[]): void {
  for (const item of items) {
    if (
      !record(item) ||
      typeof item.label !== 'string' ||
      typeof item.statusText !== 'string' ||
      typeof item.status !== 'string' ||
      !(item.status in priorityByStatus) ||
      item.priority !== priorityByStatus[item.status] ||
      typeof item.visible !== 'boolean' ||
      (item.command !== undefined && typeof item.command !== 'string') ||
      (item.actionLabel !== undefined && typeof item.actionLabel !== 'string') ||
      (item.options !== undefined &&
        (!Array.isArray(item.options) ||
          item.options.some(option => !record(option) || typeof option.label !== 'string' || typeof option.command !== 'string')))
    ) {
      throw new Error('任务面板条目响应不完整');
    }
  }
}

/** The Go view owns tab eligibility, item status, order and default selection. */
export async function getBackendTaskPanelView(bid: string | undefined, uid: number, selected?: { tabKey?: string }): Promise<TaskPanelView> {
  if (!bid) {
    throw new Error('任务面板查询缺少平台身份');
  }
  if (selected?.tabKey && !keys.has(selected.tabKey)) {
    throw new Error('任务面板 Tab 参数无效');
  }
  const value: unknown = await requestBackend(bid, 'get_players_id_task_panel_view', {
    path: { id: uid },
    ...(selected
      ? {
          query: {
            view: 'selected' as const,
            ...(selected.tabKey ? { tab: selected.tabKey as Exclude<TaskPanelTabView['tabKey'], 'master' | 'companion'> } : {})
          }
        }
      : {})
  });

  return parseTaskPanelView(value, selected);
}

export function parseRobotTaskPanel(value: unknown) {
  if (!record(value) || typeof value.requestedTab !== 'string' || (value.requestedTab && !robotKeys.has(value.requestedTab))) {
    throw new Error('任务面板选择响应不完整');
  }

  return { ...parseTaskPanelView(value.view, { tabKey: value.requestedTab || undefined }, true), requestedTab: value.requestedTab };
}

export function parseTaskPanelView(value: unknown, selected?: { tabKey?: string }, robot = false): TaskPanelView {
  // Keep old seven-category receipts compatible during a backend-first rollout.
  const expectedKeys = robot && record(value) && Array.isArray(value.tabs) && value.tabs.length === robotKeys.size ? robotKeys : keys;

  if (
    !record(value) ||
    !Array.isArray(value.tabs) ||
    value.tabs.length !== expectedKeys.size ||
    typeof value.defaultTabKey !== 'string' ||
    !expectedKeys.has(value.defaultTabKey)
  ) {
    throw new Error('任务面板视图响应不完整');
  }
  const seen = new Set<string>();
  const projected = Boolean(selected && value.selection !== undefined);

  for (const tab of value.tabs) {
    if (
      !record(tab) ||
      typeof tab.tabKey !== 'string' ||
      !expectedKeys.has(tab.tabKey) ||
      seen.has(tab.tabKey) ||
      typeof tab.tabName !== 'string' ||
      typeof tab.visible !== 'boolean' ||
      typeof tab.hasActionable !== 'boolean' ||
      !Array.isArray(tab.items)
    ) {
      throw new Error('任务面板 Tab 响应不完整');
    }
    seen.add(tab.tabKey);
    // Full and old-server fallback preserve original per-tab error precedence.
    if (!projected) {
      validateItems(tab.items);
    }
  }

  if (projected) {
    const selection = value.selection;
    let target = selected?.tabKey ?? value.defaultTabKey;
    const requested = value.tabs.find(tab => tab.tabKey === target);

    if (!requested || requested.visible === false) {
      target = value.tabs.find(tab => tab.visible !== false)?.tabKey ?? null;
    }
    if (!record(selection) || selection.tabKey !== target) {
      throw new Error('任务面板选择响应不完整');
    }
    for (const tab of value.tabs) {
      if (tab.tabKey !== target && tab.items.length !== 0) {
        throw new Error('任务面板选择响应不完整');
      }
    }
  }

  if (projected) {
    for (const tab of value.tabs) {
      validateItems(tab.items);
    }
  }

  return value as TaskPanelView;
}
