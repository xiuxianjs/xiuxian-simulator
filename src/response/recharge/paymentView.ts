import { Format } from 'alemonjs';
import type { parseBackendNormalPaymentSettlement } from '@src/api/bot/sponsor-payment';

// 结算回执目前主要下发模板编号和数量；有真实名称才展示名称，绝不使用套餐预览冒充到账。
function receiptAssetLines(label: string, assets: unknown[]): string[] {
  const rows = assets.map(value => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {}));
  const validQuantity = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

  if (rows.every(row => typeof row.name === 'string' && row.name.trim() && validQuantity(row.quantity))) {
    return rows.map(row => `${String(row.name).trim()} ×${row.quantity}`);
  }
  if (rows.every(row => validQuantity(row.quantity))) {
    return [`${label} ×${rows.reduce((sum, row) => sum + Number(row.quantity), 0)}（${rows.length}种，详情见储物袋）`];
  }

  return [`${label} ×${rows.length}种`];
}

export const buildRechargeSuccessContent = (payResult?: Awaited<ReturnType<typeof parseBackendNormalPaymentSettlement>>) => {
  const successMd = Format.createMarkdown();

  if (!payResult) {
    successMd.addText('订单已完成，可查看到账奖励。');

    return successMd;
  }

  const packageMilk = payResult.packageRewards?.spiritMilk ?? 0;
  const bonusMilk = payResult.bonusSpiritMilk;
  const totalMilk = packageMilk + bonusMilk;
  const hasPackageRewards = Boolean(
    payResult.packageRewards &&
    (payResult.packageRewards.spiritMilk > 0 ||
      payResult.packageRewards.spiritStone > 0 ||
      payResult.packageRewards.spiritCrystal > 0 ||
      payResult.packageRewards.items.length > 0 ||
      payResult.packageRewards.equipments.length > 0 ||
      payResult.packageRewards.skills.length > 0)
  );
  const hasDetail =
    totalMilk > 0 ||
    hasPackageRewards ||
    Boolean(payResult.vipUpgrade) ||
    payResult.newcomerDayGranted !== null ||
    payResult.monthCardExtended ||
    payResult.seclusionPassActivated;

  if (!hasDetail) {
    successMd.addText('订单已完成，可查看到账奖励。');

    return successMd;
  }

  if (totalMilk > 0) {
    successMd.addText(`道晶 +${totalMilk}`);

    if (bonusMilk > 0) {
      successMd.addText(`（套餐 ${packageMilk} + 首充双倍 ${bonusMilk}）`);
    }

    successMd.addNewline();
  }

  if (payResult.vipUpgrade) {
    successMd.addText(`VIP：${payResult.vipUpgrade.oldLevel} → ${payResult.vipUpgrade.newLevel}`);
    successMd.addNewline();
  }

  if (payResult.newcomerDayGranted) {
    successMd.addText(`新人返利第${payResult.newcomerDayGranted}天奖励已发放`);
    successMd.addNewline();
  }

  if (payResult.monthCardExtended) {
    successMd.addText('月卡已激活/续期');
    successMd.addNewline();
  }

  if (payResult.seclusionPassActivated) {
    successMd.addText('金手指已激活/续期');
    successMd.addNewline();
  }

  if (payResult.packageRewards) {
    const pr = payResult.packageRewards;

    if (pr.spiritStone > 0) {
      successMd.addText(`灵石 +${pr.spiritStone}`);
      successMd.addNewline();
    }

    if (pr.spiritCrystal > 0) {
      successMd.addText(`灵晶 +${pr.spiritCrystal}`);
      successMd.addNewline();
    }

    if (pr.items.length > 0) {
      for (const line of receiptAssetLines('物品', pr.items)) {
        successMd.addText(line).addNewline();
      }
    }

    if (pr.equipments.length > 0) {
      for (const line of receiptAssetLines('装备', pr.equipments)) {
        successMd.addText(line).addNewline();
      }
    }

    if (pr.skills.length > 0) {
      for (const line of receiptAssetLines('功法', pr.skills)) {
        successMd.addText(line).addNewline();
      }
    }
  }

  return successMd;
};
