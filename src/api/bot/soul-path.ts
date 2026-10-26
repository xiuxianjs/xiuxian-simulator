import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

export type SoulPathKey = 'xuan_fa' | 'lian_ti' | 'yu_qi';
export type SoulNurtureDirection = 'ding_hun' | 'yang_po' | 'wu_dao' | 'chu_qiao';

export type BackendSoulPathState = {
  stability: number;
  insight: number;
  lowYieldStreak: number;
  pathKey: SoulPathKey | null;
  pathName: string | null;
  pathProficiency: number;
  unlockedNodes: string[];
  pathSwitchAvailableAt: string | null;
  effectsMaintenance: boolean;
  panel: BackendSoulPanel;
  paths: BackendSoulPathDetail[];
};
export type BackendSoulNode = {
  key: string;
  name: string;
  description: string;
  unlocked: boolean;
  requirementText: string;
  requiredInsight: number;
  requiredProficiency: number;
  canAdvance: boolean;
};
export type BackendSoulPathDetail = {
  key: SoulPathKey;
  name: string;
  proficiency: number;
  stage: string;
  active: boolean;
  unlockedNodes: string[];
  nodes: BackendSoulNode[];
};
export type BackendSoulPanel = {
  realmName: string;
  pathStage: string;
  dailyNurtureText: string;
  materials: Array<{ name: string; quantity: number }>;
  materialSourceLines: string[];
  nurtureRuleLines: string[];
  dailyDungeonClaimed: boolean;
  dailyMaterialDirectionName: string;
  nextNode: BackendSoulNode | null;
  canReroll: boolean;
  actionUnavailable: string;
  nurtureUnavailable: string;
  nurtureOptions: Array<{ name: string; costText: string; reserveWarning: string; baseText: string }>;
  switchCooldownActive: boolean;
  allComplete: boolean;
};
export type BackendSoulPathAction = {
  message: string;
  pathKey: SoulPathKey;
  pathName: string;
  nodeName: string;
  pathSwitchAvailableAt: string | null;
};
export type BackendSoulNurture = {
  direction: SoulNurtureDirection;
  directionName: string;
  tier: string;
  tierName: string;
  stabilityBefore: number;
  stabilityAfter: number;
  insightGained: number;
  proficiencyGained: number;
  extraItems: Array<{ name: string; quantity: number }>;
  dailyNurtureCount: number;
  dailyNurtureLimit: number;
  usedMonthCardExtra: boolean;
  dailyNurtureProgressText: string;
  rerollable: boolean;
};
export type BackendSoulSupplyDirection = { direction: SoulNurtureDirection | null; directionName: string; message: string };

type Row = Record<string, unknown>;
const row = (value: unknown, message: string): Row => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Row;
};
const integer = (value: unknown, message: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(message);
  }

  return value;
};
const text = (value: unknown, message: string): string => {
  if (typeof value !== 'string') {
    throw new Error(message);
  }

  return value;
};
const pathKey = (value: unknown): value is SoulPathKey => value === 'xuan_fa' || value === 'lian_ti' || value === 'yu_qi';
const direction = (value: unknown): value is SoulNurtureDirection => value === 'ding_hun' || value === 'yang_po' || value === 'wu_dao' || value === 'chu_qiao';
const nullableText = (value: unknown, message: string): string | null => {
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new Error(message);
};
const stateError = '神魂状态响应不完整';
const boolean = (value: unknown): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(stateError);
  }

  return value;
};
const strings = (value: unknown): string[] => {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new Error(stateError);
  }

  return [...value];
};
const array = <T>(value: unknown, parse: (item: unknown) => T): T[] => {
  if (!Array.isArray(value)) {
    throw new Error(stateError);
  }

  return value.map(parse);
};
const parseSoulNode = (value: unknown): BackendSoulNode => {
  const data = row(value, stateError);

  return {
    key: text(data.key, stateError),
    name: text(data.name, stateError),
    description: text(data.description, stateError),
    unlocked: boolean(data.unlocked),
    requirementText: text(data.requirementText, stateError),
    requiredInsight: integer(data.requiredInsight, stateError),
    requiredProficiency: integer(data.requiredProficiency, stateError),
    canAdvance: boolean(data.canAdvance)
  };
};

function requireBid(bid: string | undefined) {
  if (!bid?.trim()) {
    throw new Error('操作缺少平台身份');
  }

  return bid;
}

export function parseSoulPathState(value: unknown): BackendSoulPathState {
  const data = row(value, '神魂状态响应不完整');
  const panel = row(data.panel, stateError);

  if (!Array.isArray(data.unlockedNodes) || !data.unlockedNodes.every(node => typeof node === 'string')) {
    throw new Error('神魂状态响应不完整');
  }
  if (data.pathKey !== null && !pathKey(data.pathKey)) {
    throw new Error('神魂状态响应不完整');
  }

  return {
    stability: integer(data.stability, '神魂状态响应不完整'),
    insight: integer(data.insight, '神魂状态响应不完整'),
    lowYieldStreak: integer(data.lowYieldStreak, '神魂状态响应不完整'),
    pathKey: data.pathKey,
    pathName: nullableText(data.pathName, '神魂状态响应不完整'),
    pathProficiency: integer(data.pathProficiency, '神魂状态响应不完整'),
    unlockedNodes: [...data.unlockedNodes],
    pathSwitchAvailableAt: nullableText(data.pathSwitchAvailableAt, '神魂状态响应不完整'),
    effectsMaintenance: boolean(data.effectsMaintenance),
    panel: {
      realmName: text(panel.realmName, stateError),
      pathStage: text(panel.pathStage, stateError),
      dailyNurtureText: text(panel.dailyNurtureText, stateError),
      materials: array(panel.materials, item => {
        const material = row(item, stateError);

        return { name: text(material.name, stateError), quantity: integer(material.quantity, stateError) };
      }),
      materialSourceLines: strings(panel.materialSourceLines),
      nurtureRuleLines: strings(panel.nurtureRuleLines),
      dailyDungeonClaimed: boolean(panel.dailyDungeonClaimed),
      dailyMaterialDirectionName: text(panel.dailyMaterialDirectionName, stateError),
      nextNode: panel.nextNode === null ? null : parseSoulNode(panel.nextNode),
      canReroll: boolean(panel.canReroll),
      actionUnavailable: text(panel.actionUnavailable, stateError),
      nurtureUnavailable: text(panel.nurtureUnavailable, stateError),
      nurtureOptions: array(panel.nurtureOptions, item => {
        const option = row(item, stateError);

        return {
          name: text(option.name, stateError),
          costText: text(option.costText, stateError),
          reserveWarning: text(option.reserveWarning, stateError),
          baseText: text(option.baseText, stateError)
        };
      }),
      switchCooldownActive: boolean(panel.switchCooldownActive),
      allComplete: boolean(panel.allComplete)
    },
    paths: array(data.paths, item => {
      const path = row(item, stateError);

      if (!pathKey(path.key)) {
        throw new Error(stateError);
      }

      return {
        key: path.key,
        name: text(path.name, stateError),
        proficiency: integer(path.proficiency, stateError),
        stage: text(path.stage, stateError),
        active: boolean(path.active),
        unlockedNodes: strings(path.unlockedNodes),
        nodes: array(path.nodes, parseSoulNode)
      };
    })
  };
}

function parseAction(value: unknown): BackendSoulPathAction {
  const data = row(value, '道途选择响应不完整');

  if (!pathKey(data.pathKey)) {
    throw new Error('道途选择响应不完整');
  }

  return {
    message: text(data.message, '道途选择响应不完整'),
    pathKey: data.pathKey,
    pathName: text(data.pathName, '道途选择响应不完整'),
    nodeName: text(data.nodeName, '道途选择响应不完整'),
    pathSwitchAvailableAt: nullableText(data.pathSwitchAvailableAt, '道途选择响应不完整')
  };
}

export function parseSoulNurture(value: unknown): BackendSoulNurture {
  const data = row(value, '神魂温养响应不完整');

  if (!direction(data.direction) || !Array.isArray(data.extraItems)) {
    throw new Error('神魂温养响应不完整');
  }

  return {
    direction: data.direction,
    directionName: text(data.directionName, '神魂温养响应不完整'),
    tier: text(data.tier, '神魂温养响应不完整'),
    tierName: text(data.tierName, '神魂温养响应不完整'),
    stabilityBefore: integer(data.stabilityBefore, '神魂温养响应不完整'),
    stabilityAfter: integer(data.stabilityAfter, '神魂温养响应不完整'),
    insightGained: integer(data.insightGained, '神魂温养响应不完整'),
    proficiencyGained: integer(data.proficiencyGained, '神魂温养响应不完整'),
    extraItems: data.extraItems.map(item => {
      const fact = row(item, '神魂温养响应不完整');

      return { name: text(fact.name, '神魂温养响应不完整'), quantity: integer(fact.quantity, '神魂温养响应不完整') };
    }),
    dailyNurtureCount: integer(data.dailyNurtureCount, '神魂温养响应不完整'),
    dailyNurtureLimit: integer(data.dailyNurtureLimit, '神魂温养响应不完整'),
    dailyNurtureProgressText: text(data.dailyNurtureProgressText, '神魂温养响应不完整'),
    usedMonthCardExtra:
      typeof data.usedMonthCardExtra === 'boolean'
        ? data.usedMonthCardExtra
        : (() => {
            throw new Error('神魂温养响应不完整');
          })(),
    rerollable:
      typeof data.rerollable === 'boolean'
        ? data.rerollable
        : (() => {
            throw new Error('神魂温养响应不完整');
          })()
  };
}

export async function getBackendSoulPathState(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<BackendSoulPathState> {
  return parseSoulPathState(await requestBackend(requireBid(bid), 'get_players_id_soul_path', { path: { id: uid }, requestId: request?.requestId }));
}
export async function chooseBackendSoulPath(
  bid: string | undefined,
  uid: number,
  value: SoulPathKey,
  request?: BackendRequestContext
): Promise<BackendSoulPathAction> {
  return parseAction(
    await requestBackend(requireBid(bid), 'post_players_id_soul_path_choose', { path: { id: uid }, body: { pathKey: value }, ...writeContext(request) })
  );
}
export async function nurtureBackendSoulPath(
  bid: string | undefined,
  uid: number,
  value: SoulNurtureDirection,
  request?: BackendRequestContext
): Promise<BackendSoulNurture> {
  return parseSoulNurture(
    await requestBackend(requireBid(bid), 'post_players_id_soul_path_nurture', { path: { id: uid }, body: { direction: value }, ...writeContext(request) })
  );
}
export async function setBackendSoulSupplyDirection(
  bid: string | undefined,
  uid: number,
  value: SoulNurtureDirection | null,
  request?: BackendRequestContext
): Promise<BackendSoulSupplyDirection> {
  return parseSoulSupplyDirection(
    await requestBackend(requireBid(bid), 'put_players_id_soul_path_supply_direction', {
      path: { id: uid },
      body: { direction: value },
      ...writeContext(request)
    })
  );
}

export function parseSoulSupplyDirection(value: unknown): BackendSoulSupplyDirection {
  const data = row(value, '神魂补给响应不完整');

  if (data.direction !== null && !direction(data.direction)) {
    throw new Error('神魂补给响应不完整');
  }

  return { direction: data.direction, directionName: text(data.directionName, '神魂补给响应不完整'), message: text(data.message, '神魂补给响应不完整') };
}
