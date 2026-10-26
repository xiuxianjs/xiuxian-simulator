/**
 * 任务面板 Tab 注册表常量
 * 定义所有 Tab 的 key、名称、指令参数名、排序权重
 */

/** Tab 注册项 */
export interface TabRegistryItem {
  /** 唯一标识 */
  key: string;
  /** 显示名称 */
  name: string;
  /** 指令参数名（用于解析用户输入） */
  commandAlias: string[];
  /** 排序权重（越小越靠前） */
  sortOrder: number;
}

/** Tab 注册表 */
export const TAB_REGISTRY: TabRegistryItem[] = [
  { key: 'checkin', name: '签到', commandAlias: ['签到', 'checkin'], sortOrder: 1 },
  { key: 'cultivation', name: '修炼', commandAlias: ['修炼', 'cultivation'], sortOrder: 2 },
  { key: 'activity', name: '活跃', commandAlias: ['活跃', 'activity'], sortOrder: 3 },
  { key: 'dungeon', name: '副本', commandAlias: ['副本', 'dungeon'], sortOrder: 4 },
  { key: 'guild', name: '宗门', commandAlias: ['宗门', 'guild'], sortOrder: 5 },
  { key: 'master', name: '师门', commandAlias: ['师门', 'master'], sortOrder: 6 },
  { key: 'companion', name: '道侣', commandAlias: ['道侣', 'companion'], sortOrder: 7 },
  { key: 'event', name: '活动', commandAlias: ['活动', 'event'], sortOrder: 8 }
];

/** Tab key → 注册项映射 */
export const TAB_KEY_MAP = new Map(TAB_REGISTRY.map(tab => [tab.key, tab]));
