export type TaskPanelItemView = {
  label: string;
  statusText: string;
  status: 'ACTIONABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'UNAVAILABLE' | 'ERROR';
  priority: 10 | 20 | 30 | 40 | 50;
  visible: boolean;
  command?: string;
  actionLabel?: string;
  options?: Array<{ label: string; command: string }>;
};

export type TaskPanelTabView = {
  tabKey: 'checkin' | 'activity' | 'cultivation' | 'dungeon' | 'guild' | 'master' | 'companion' | 'event' | 'auto';
  tabName: string;
  visible: boolean;
  hasActionable: boolean;
  items: TaskPanelItemView[];
};

export type TaskPanelView = {
  tabs: TaskPanelTabView[];
  defaultTabKey: TaskPanelTabView['tabKey'];
  selection?: { tabKey: TaskPanelTabView['tabKey'] | null };
};
