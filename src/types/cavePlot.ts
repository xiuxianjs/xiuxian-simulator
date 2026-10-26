/**
 * 灵田（洞府）共享类型定义
 *
 * 仅承载客户端与服务端之间流转的地块 DTO，不包含任何运行期逻辑。
 * 灵田规则与数据由 Go 服务端作为唯一解释方；展示层与本类型定义共用这里的结构，
 * 不再依赖任何本地玩法模型。
 */

// 取值与服务端 `user_cave_plots` 表的状态常量保持一致；客户端不再持有该表定义。
export type CavePlotState = 'cultivated' | 'unlockable' | 'locked';

export type CavePlantSeedOption = {
  seedName: string;
  cropName: string;
  matureHours: number;
  quantity: number;
};

export type CavePlotOverviewItem = {
  plotIndex: number;
  plotState: CavePlotState;
  title: string;
  detail: string;
  actionLabel?: string;
  actionCommand?: string;
  actions?: Array<{ label: string; command: string }>;
};

export type CavePlotVisitOverview = {
  ownerUid: number;
  ownerName: string;
  relation: 'self' | 'friend' | 'companion' | 'stranger';
  relationLabel: string;
  canViewPlots: boolean;
  canCollaborate: boolean;
  canSteal: boolean;
  auraText: string;
  auraDetailLines?: string[];
  summary: string;
  stolenStatusText: string;
  cultivatedCount: number;
  plantedCount: number;
  matureCount: number;
  plots: CavePlotOverviewItem[];
  recentLogs: string[];
};
