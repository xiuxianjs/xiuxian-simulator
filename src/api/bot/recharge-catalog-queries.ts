import { requestBackend } from './client';
import type { RechargeCatalogQueryData } from '../schemas/recharge-catalog-query';
function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error('充值目录数据不完整');
  }

  return v as Record<string, unknown>;
}
function number(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error('充值目录数值不完整');
  }

  return v;
}
function text(v: unknown): string {
  if (typeof v !== 'string') {
    throw new Error('充值目录文本不完整');
  }

  return v;
}
function array(v: unknown): unknown[] {
  if (!Array.isArray(v)) {
    throw new Error('充值目录列表不完整');
  }

  return v;
}
export async function getBackendRechargeCatalog(bid: string | undefined, uid: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendRechargeCatalog(await requestBackend(bid, 'get_players_id_recharge_catalog', { path: { id: uid } }));
}

export function parseBackendRechargeCatalog(value: unknown) {
  const raw = record(value);

  for (const value of array(raw.packages)) {
    const p = record(value);

    for (const key of ['id', 'priceAmount', 'grantSpiritStone', 'grantSpiritCrystal', 'grantSpiritMilk', 'boughtCount', 'priceYuan']) {
      number(p[key]);
    }
    for (const key of ['name', 'packageType', 'grantItemsJson', 'grantEquipmentsJson', 'grantSkillsJson']) {
      text(p[key]);
    }
    if (p.description !== null) {
      text(p.description);
    }
    if (
      typeof p.resolvedLimitPeriod !== 'string' ||
      !['daily', 'weekly', 'monthly', 'lifetime', 'unlimited'].includes(p.resolvedLimitPeriod) ||
      typeof p.doubleAvailable !== 'boolean'
    ) {
      throw new Error('充值目录状态不完整');
    }
    text(p.limitText);
    text(p.doubleText);
    if (array(p.rewardParts).some(value => typeof value !== 'string')) {
      throw new Error('充值目录奖励文案不完整');
    }
  }
  const names = record(raw.rewardNames);

  for (const key of ['items', 'equipments', 'skills']) {
    for (const name of Object.values(record(names[key]))) {
      text(name);
    }
  }
  const sponsor = record(raw.sponsor);

  for (const key of ['totalYuan', 'thresholdYuan', 'remainingYuan']) {
    number(sponsor[key]);
  }
  if (typeof sponsor.hasThemePermission !== 'boolean') {
    throw new Error('充值赞助状态不完整');
  }
  const benefitView = record(raw.benefitView);

  if (!text(benefitView.sponsorIntro).trim() || !text(benefitView.seclusionPassFallbackLine).trim()) {
    throw new Error('充值权益文案不完整');
  }
  for (const key of ['monthCardPrivilegeLines', 'seclusionPassPrivilegeLines']) {
    const lines = array(benefitView[key]);

    if (lines.length === 0 || lines.some(value => typeof value !== 'string' || !value.trim())) {
      throw new Error('充值权益文案不完整');
    }
  }
  const activityPackages = array(raw.activityPackages).map(value => {
    const group = record(value);

    return {
      eventTitle: text(group.eventTitle),
      subActivityId: number(group.subActivityId),
      subTitle: text(group.subTitle),
      packages: array(group.packages).map(value => {
        const p = record(value);
        const rewardTextParts = array(p.rewardTextParts);

        if (rewardTextParts.some(part => typeof part !== 'string')) {
          throw new Error('充值目录活动奖励描述不完整');
        }

        return {
          tierLevel: number(p.tierLevel),
          rechargeAmountFen: number(p.rechargeAmountFen),
          rechargeAmountYuan: number(p.rechargeAmountYuan),
          roundedYuanText: text(p.roundedYuanText),
          limitPerUser: number(p.limitPerUser),
          limitText: text(p.limitText),
          boughtCount: number(p.boughtCount),
          rewardTextParts: rewardTextParts as string[]
        };
      })
    };
  });
  const data = raw as unknown as RechargeCatalogQueryData;

  return { ...data, activityPackages };
}
