import type { ResourceRecoverySummary } from '@src/api/schemas/resource-recovery';
/** 属性面板由服务端计算，机器人只负责身份传递与结果映射。 */
import { getBackendAttributePanel } from '@src/api/bot/attribute-panel';
import { BackendAPIError } from '@src/api/bot/client';
import { getBackendRobotIdentity } from '@src/api/bot/identity';
import { logger } from 'alemonjs';

export interface AttributePanelAppData {
  mpRecoveryEfficiency?: number;
  mentalRecoveryEfficiency?: number;
  resourceRecovery?: ResourceRecoverySummary;
  daoName: string;
  uid: number;
  realmName: string;
  maxAttributeBonus: number;
  strength: number;
  maxStrength: number;
  intelligence: number;
  maxIntelligence: number;
  constitution: number;
  maxConstitution: number;
  agility: number;
  maxAgility: number;
  luck: number;
  maxLuck: number;
  combatPower: number;
  physicalAttack: number;
  physicalDefense: number;
  magicAttack: number;
  magicDefense: number;
  spiritualPower: number;
  mentalPower: number;
  hp: number;
  speed: number;
  critRate: number;
  critDamage: number;
  antiCritRate: number;
  hitRate: number;
  dodgeRate: number;
  theme: Record<string, unknown> | null;
  access: { canUseMeridian: boolean; canUseSoulArtifact: boolean; canUseSoulPath: boolean };
}

type UpdateResult = { code: 'FAIL'; data: { message: string } } | { code: 'OK'; data: AttributePanelAppData };
export type { UpdateResult };

export default async function App(params: { bid?: string; uid?: number }): Promise<UpdateResult> {
  if (!params.bid?.trim()) {
    return { code: 'FAIL', data: { message: '未找到用户信息，请先踏入仙途' } };
  }
  try {
    const uid = params.uid ?? (await getBackendRobotIdentity(params.bid)).account.playerId;

    if (!uid || uid <= 0) {
      return { code: 'FAIL', data: { message: '未找到用户信息，请先踏入仙途' } };
    }

    return { code: 'OK', data: await getBackendAttributePanel(params.bid, uid) };
  } catch (error) {
    if (error instanceof BackendAPIError && error.status === 404) {
      return { code: 'FAIL', data: { message: '未找到用户信息，请先踏入仙途' } };
    }
    logger.error(error);

    return { code: 'FAIL', data: { message: '更新属性失败，请联系运营' } };
  }
}
