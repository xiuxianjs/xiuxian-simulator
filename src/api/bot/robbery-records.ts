import type { RobberyRecordPage, RobberyRecordData } from '../schemas/robbery-records';
export function parseRobberyRecords(value: unknown): RobberyRecordPage {
  const data = value as RobberyRecordPage;

  if (!data || !Array.isArray(data.records) || !Number.isInteger(data.currentPage) || !Number.isInteger(data.totalPages) || !Number.isInteger(data.total)) {
    throw new Error('打劫记录响应不完整');
  }
  for (const row of data.records) {
    parseRobberyRecord(row);
  }

  return data;
}

export function parseRobberyRecord(value: unknown): RobberyRecordData {
  const row = value as RobberyRecordData;

  if (!row || typeof row !== 'object') {
    throw new Error('打劫记录字段不完整');
  }
  for (const key of ['id', 'attackerUid', 'stoneReward', 'crystalReward', 'droppedItemQty', 'targetShaQi'] as const) {
    if (typeof row[key] !== 'number' || !Number.isFinite(row[key])) {
      throw new Error('打劫记录数值不完整');
    }
  }
  if (
    (row.attackerName !== null && typeof row.attackerName !== 'string') ||
    (row.droppedItemName !== null && typeof row.droppedItemName !== 'string') ||
    typeof row.createdAt !== 'string' ||
    typeof row.isWin !== 'boolean' ||
    typeof row.isCounterAttack !== 'boolean' ||
    typeof row.isBounty !== 'boolean' ||
    typeof row.attackerDisplayName !== 'string' ||
    typeof row.typeText !== 'string' ||
    typeof row.resultText !== 'string' ||
    typeof row.lossText !== 'string' ||
    typeof row.dropText !== 'string' ||
    typeof row.canCounterAttack !== 'boolean'
  ) {
    throw new Error('打劫记录字段不完整');
  }
  for (const key of ['pkState', 'pkDeliveryState', 'counterDeadline', 'counterStatusText', 'battleLogId'] as const) {
    if (row[key] !== undefined && typeof row[key] !== 'string') {
      throw new Error('PK战报状态不完整');
    }
  }
  if (row.pkEventId !== undefined && (!Number.isSafeInteger(row.pkEventId) || row.pkEventId < 1)) {
    throw new Error('PK事件编号无效');
  }

  return row;
}
