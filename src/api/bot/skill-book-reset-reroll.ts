import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type SkillBook = { id: number; name: string; skillType?: string; grade: string; realm: string };
type RerollAttribute = { label: string; currentText: string; maxText: string };
type RerollPending = {
  userSkillBookId: number;
  sourceLabel: string;
  targetLabel: string;
  skillBookName: string;
  gradeName: string;
  realmName: string;
  targetPool: 'zero' | 'active';
  targetWasActive: boolean;
  sourceCurrentText: string;
  sourceMaxText: string;
  targetCurrentText: string;
  targetMaxText: string;
};
type ResetPending = {
  userSkillBookId: number;
  skillBookName: string;
  skillType: string;
  gradeName: string;
  realmName: string;
  refundExp: number;
  refundSpiritStone: number;
  upgradeCount: number;
  affectedAttrs: string[];
};
type RefundItem = { name: string; quantity: number; expValue: number };

export type BackendSkillBookRerollResult =
  | { success: true; mode: 'list'; skillBook: SkillBook; ownedCount: number; availableAttrs: RerollAttribute[] }
  | { success: true; mode: 'preview'; skillBook: SkillBook; ownedCount: number; pending: RerollPending };
export type BackendSkillBookResetResult = {
  success: true;
  message: string;
  skillBook: { id: number; name: string; skillType: string };
  refundInfo: { exp: number; spiritStone: number; upgradeCount: number; affectedAttrs: string[]; items?: RefundItem[] };
  pendingData?: ResetPending;
};

function row(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}
function text(value: unknown, message: string): string {
  if (typeof value !== 'string') {
    throw new Error(message);
  }

  return value;
}
function integer(value: unknown, message: string, positive = false): number {
  if (!Number.isInteger(value) || (positive && (value as number) <= 0)) {
    throw new Error(message);
  }

  return value as number;
}
function bool(value: unknown, message: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }

  return value;
}
function stringList(value: unknown, message: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(message);
  }

  return value as string[];
}
function book(value: unknown, withType = false): SkillBook {
  const data = row(value, '功法操作响应缺少功法信息');
  const skillType = data.skillType === undefined ? undefined : text(data.skillType, '功法操作响应缺少功法类型');

  if (withType && !skillType) {
    throw new Error('功法操作响应缺少功法类型');
  }

  return {
    id: integer(data.id, '功法操作响应缺少功法ID', true),
    name: text(data.name, '功法操作响应缺少功法名称'),
    ...(skillType === undefined ? {} : { skillType }),
    grade: text(data.grade, '功法操作响应缺少品级'),
    realm: text(data.realm, '功法操作响应缺少境界')
  };
}
function rerollPending(value: unknown): RerollPending {
  const data = row(value, '换词响应缺少待确认结果');
  const pendingBook = book(data.skillBook);
  const targetPool = data.targetPool;

  if (targetPool !== 'zero' && targetPool !== 'active') {
    throw new Error('换词响应的目标池无效');
  }

  return {
    userSkillBookId: integer(data.userSkillBookId, '换词响应缺少功法ID', true),
    sourceLabel: text(data.sourceLabel, '换词响应缺少源词条'),
    targetLabel: text(data.targetLabel, '换词响应缺少目标词条'),
    skillBookName: pendingBook.name,
    gradeName: pendingBook.grade,
    realmName: pendingBook.realm,
    targetPool,
    targetWasActive: bool(data.targetWasActive, '换词响应缺少目标词条状态'),
    sourceCurrentText: text(data.sourceCurrentText, '换词响应缺少源词条数值'),
    sourceMaxText: text(data.sourceMaxText, '换词响应缺少源词条上限'),
    targetCurrentText: text(data.targetCurrentText, '换词响应缺少目标词条数值'),
    targetMaxText: text(data.targetMaxText, '换词响应缺少目标词条上限')
  };
}
function resetPending(value: unknown): ResetPending {
  const data = row(value, '重制响应缺少待确认结果');
  const pendingBook = book(data.skillBook, true);

  return {
    userSkillBookId: integer(data.userSkillBookId, '重制响应缺少功法ID', true),
    skillBookName: pendingBook.name,
    skillType: pendingBook.skillType as string,
    gradeName: pendingBook.grade,
    realmName: pendingBook.realm,
    refundExp: integer(data.refundExp, '重制响应缺少经验返还'),
    refundSpiritStone: integer(data.refundSpiritStone, '重制响应缺少灵石返还'),
    upgradeCount: integer(data.upgradeCount, '重制响应缺少重制等级'),
    affectedAttrs: stringList(data.affectedAttrs, '重制响应缺少词条列表')
  };
}
function refundItems(value: unknown): RefundItem[] {
  if (!Array.isArray(value)) {
    throw new Error('重制响应缺少残页返还');
  }

  return value.map(item => {
    const data = row(item, '重制响应的残页返还无效');

    return {
      name: text(data.name, '重制响应的残页名称无效'),
      quantity: integer(data.quantity, '重制响应的残页数量无效', true),
      expValue: integer(data.expValue, '重制响应的残页经验无效', true)
    };
  });
}

function requireBid(bid: string | undefined): string {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return bid;
}

export async function previewBackendSkillBookReroll(
  bid: string | undefined,
  uid: number,
  skillBookId: number,
  sourceLabel: string | undefined,
  request?: BackendRequestContext
): Promise<BackendSkillBookRerollResult> {
  return parseSkillBookRerollPreview(
    await requestBackend(requireBid(bid), 'post_players_id_skill_books_skillBookId_reroll', {
      path: { id: uid, skillBookId },
      body: sourceLabel ? { sourceLabel } : {},
      ...writeContext(request)
    })
  );
}

export function parseSkillBookRerollPreview(value: unknown): BackendSkillBookRerollResult {
  const data = row(value, '换词响应不完整');
  const currentBook = book(data.skillBook);
  const mode = data.mode;

  if (mode === 'list') {
    if (!Array.isArray(data.availableAttrs)) {
      throw new Error('换词响应缺少可替换词条');
    }

    return {
      success: true,
      mode,
      skillBook: currentBook,
      ownedCount: integer(data.ownedCount === undefined ? 0 : data.ownedCount, '换词响应缺少换词符数量'),
      availableAttrs: data.availableAttrs.map(value => {
        const attr = row(value, '换词响应的词条无效');

        return {
          label: text(attr.label, '换词响应的词条名称无效'),
          currentText: text(attr.currentText, '换词响应的词条数值无效'),
          maxText: text(attr.maxText, '换词响应的词条上限无效')
        };
      })
    };
  }
  if (mode !== 'preview') {
    throw new Error('换词响应模式无效');
  }

  return {
    success: true,
    mode,
    skillBook: currentBook,
    ownedCount: integer(data.ownedCount === undefined ? 0 : data.ownedCount, '换词响应缺少换词符数量'),
    pending: rerollPending(data.pending)
  };
}

export async function confirmBackendSkillBookReroll(
  bid: string | undefined,
  uid: number,
  skillBookId: number | undefined,
  request?: BackendRequestContext
): Promise<{ success: true; message: string; pending: RerollPending }> {
  return parseSkillBookRerollConfirm(
    await requestBackend(requireBid(bid), 'post_players_id_skill_books_reroll_confirm', {
      path: { id: uid },
      body: skillBookId ? { skillBookId } : {},
      ...writeContext(request)
    })
  );
}

export function parseSkillBookRerollConfirm(value: unknown): { success: true; message: string; pending: RerollPending } {
  const pending = rerollPending(value);

  return { success: true, message: `已保留换词结果：${pending.sourceLabel} -> ${pending.targetLabel}`, pending };
}

export async function cancelBackendSkillBookReroll(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext
): Promise<{ success: true; message: string; pending: RerollPending }> {
  return parseSkillBookRerollCancel(
    await requestBackend(requireBid(bid), 'post_players_id_skill_books_reroll_cancel', {
      path: { id: uid },
      ...writeContext(request)
    })
  );
}

export function parseSkillBookRerollCancel(value: unknown): { success: true; message: string; pending: RerollPending } {
  const pending = rerollPending(value);

  return { success: true, message: `已放弃换词结果：${pending.sourceLabel} -> ${pending.targetLabel}，换词符不返还`, pending };
}

export async function previewBackendSkillBookReset(
  bid: string | undefined,
  uid: number,
  skillBookId: number,
  request?: BackendRequestContext
): Promise<BackendSkillBookResetResult> {
  return parseSkillBookResetPreview(
    await requestBackend(requireBid(bid), 'post_players_id_skill_books_skillBookId_reset', {
      path: { id: uid, skillBookId },
      ...writeContext(request)
    })
  );
}

export function parseSkillBookResetPreview(value: unknown): BackendSkillBookResetResult {
  const data = row(value, '重制响应不完整');
  const pending = resetPending(data.pending);

  return {
    success: true,
    message: '已生成功法重制预览，请在60秒内确认是否保留',
    skillBook: { id: pending.userSkillBookId, name: pending.skillBookName, skillType: pending.skillType },
    refundInfo: { exp: pending.refundExp, spiritStone: pending.refundSpiritStone, upgradeCount: pending.upgradeCount, affectedAttrs: pending.affectedAttrs },
    pendingData: pending
  };
}

export function parseSkillBookResetConfirm(value: unknown): BackendSkillBookResetResult {
  const data = row(value, '重制响应不完整');
  const pending = resetPending(data.pending);

  return {
    success: true,
    message: `已重制功法「${pending.skillBookName}」`,
    skillBook: { id: pending.userSkillBookId, name: pending.skillBookName, skillType: pending.skillType },
    refundInfo: {
      exp: integer(data.refundExp === undefined ? 0 : data.refundExp, '重制响应缺少经验返还'),
      spiritStone: integer(data.refundSpiritStone === undefined ? 0 : data.refundSpiritStone, '重制响应缺少灵石返还'),
      upgradeCount: integer(data.upgradeCount === undefined ? 0 : data.upgradeCount, '重制响应缺少重制等级'),
      affectedAttrs: stringList(data.affectedAttrs === undefined ? [] : data.affectedAttrs, '重制响应缺少词条列表'),
      items: refundItems(data.items === undefined ? [] : data.items)
    },
    pendingData: pending
  };
}

export async function confirmBackendSkillBookReset(
  bid: string | undefined,
  uid: number,
  skillBookId: number | undefined,
  request?: BackendRequestContext
): Promise<BackendSkillBookResetResult> {
  return parseSkillBookResetConfirm(
    await requestBackend(requireBid(bid), 'post_players_id_skill_books_reset_confirm', {
      path: { id: uid },
      body: skillBookId ? { skillBookId } : {},
      ...writeContext(request)
    })
  );
}

export async function cancelBackendSkillBookReset(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext
): Promise<{ success: true; message: string; pendingData: ResetPending }> {
  return parseSkillBookResetCancel(
    await requestBackend(requireBid(bid), 'post_players_id_skill_books_reset_cancel', { path: { id: uid }, ...writeContext(request) })
  );
}

export function parseSkillBookResetCancel(value: unknown): { success: true; message: string; pendingData: ResetPending } {
  const pendingData = resetPending(value);

  return { success: true, message: `已取消功法重制：${pendingData.skillBookName} 保持原状`, pendingData };
}
