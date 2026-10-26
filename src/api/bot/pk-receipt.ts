export type PKReceipt = {
  pkRulesVersion: number;
  pkEventId: number;
  won: boolean;
  actorSide: 'A' | 'B';
  pkState: string;
  pkDeliveryState: string;
  counterDeadline: string;
};

export function parsePKReceipt(data: Record<string, unknown>): PKReceipt | undefined {
  if (data.pkRulesVersion === undefined) {
    return;
  }
  if (
    data.pkRulesVersion !== 1 ||
    !Number.isSafeInteger(data.pkEventId) ||
    Number(data.pkEventId) <= 0 ||
    typeof data.won !== 'boolean' ||
    !['A', 'B'].includes(String(data.actorSide)) ||
    !['waiting', 'counter_won', 'counter_lost'].includes(String(data.pkState)) ||
    !['none', 'pending', 'restored', 'delivered'].includes(String(data.pkDeliveryState)) ||
    typeof data.counterDeadline !== 'string' ||
    !Number.isFinite(Date.parse(data.counterDeadline))
  ) {
    throw new Error('PK结算回执状态不完整');
  }

  return {
    pkRulesVersion: 1,
    pkEventId: Number(data.pkEventId),
    won: data.won,
    actorSide: data.actorSide as 'A' | 'B',
    pkState: String(data.pkState),
    pkDeliveryState: String(data.pkDeliveryState),
    counterDeadline: data.counterDeadline
  };
}

export function pkOwnershipText(pk: PKReceipt): string {
  if (pk.pkDeliveryState === 'restored') {
    return '物品已归还原主。';
  }
  if (pk.pkDeliveryState === 'delivered') {
    return '物品已交付打劫者。';
  }
  if (pk.pkDeliveryState === 'pending') {
    return pk.pkState === 'counter_lost' ? '物品已确定归打劫者，待交付。' : '物品暂存中。';
  }

  return '本次无暂存物品。';
}
