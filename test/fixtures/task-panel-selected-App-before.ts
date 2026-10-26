import { getBackendTaskPanelView } from './task-panel-selected-helper-before';
import type { TaskPanelView } from '../../src/api/schemas/task-panel-view';

export const getAllTabs = (uid: number, bid?: string): Promise<TaskPanelView> => getBackendTaskPanelView(bid, uid);
