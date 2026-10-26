/** Render existing server requirements without deriving eligibility in the bot. */
export function formatRealmRequirementDetails(value: unknown, promotion = false): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  const requirements = value as Record<string, unknown>;
  const next = requirements.nextRealm as { name?: unknown } | null | undefined;

  if (!next || typeof next.name !== 'string') {
    return [];
  }
  const lines = [`${promotion ? '晋级' : '突破'}目标：${next.name}`];

  if (requirements.materialsHidden === true) {
    return [...lines, '开启渡劫后查看准备要求'];
  }
  const materials = requirements.materials;

  if (!Array.isArray(materials)) {
    lines.push('材料明细暂不可用');

    return lines;
  }
  if (materials.length === 0) {
    lines.push('无需材料');

    return lines;
  }
  for (const material of materials) {
    if (
      !material ||
      typeof material.itemName !== 'string' ||
      !Number.isSafeInteger(material.currentQuantity) ||
      !Number.isSafeInteger(material.requiredQuantity) ||
      material.currentQuantity < 0 ||
      material.requiredQuantity < 0
    ) {
      return [...lines.slice(0, 1), '材料明细暂不可用'];
    }
    const missing = Math.max(0, material.requiredQuantity - material.currentQuantity);

    lines.push(`${material.itemName}：${material.currentQuantity} / ${material.requiredQuantity}（${missing > 0 ? '欠缺' : ''}）`);
  }
  if (promotion) {
    lines.push('晋级仅计未锁定材料');
  }

  return lines;
}

/** Display the server's settled probability inputs without recomputing the chance. */
export function formatFoundationProbability(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  const probability = value as Record<string, unknown>;
  const rates = ['finalProbability', 'baseRate', 'pillBonus', 'pityBonus'] as const;

  if (
    !rates.every(key => typeof probability[key] === 'number' && Number.isFinite(probability[key])) ||
    !Number.isSafeInteger(probability.failedCount) ||
    (probability.failedCount as number) < 0
  ) {
    return [];
  }
  const percent = (rate: unknown) => `${Math.round((rate as number) * 10000) / 100}%`;

  return [
    `当前成功率：${percent(probability.finalProbability)}`,
    `基础概率：${percent(probability.baseRate)} · 丹药加成：${percent(probability.pillBonus)} · 失败补偿：${percent(probability.pityBonus)}`,
    `累计失败：${probability.failedCount}次`
  ];
}
