import { getBackendTaskPanelView } from '@src/api/bot/task-panel-view';
import type { TaskPanelView } from '@src/api/schemas/task-panel-view';

export const getAllTabs = (uid: number, bid?: string, selectedTab?: string): Promise<TaskPanelView> => {
  return getBackendTaskPanelView(bid, uid, selectedTab ? { tabKey: selectedTab } : {});
};
