import { requestBackend } from './client';
import type { SkillBookSwitchOption } from '../schemas/skill-book-switch-options';

const skillTypes = new Set<SkillBookSwitchOption['skillType']>(['战技', '被动技', '神通']);

function option(value: unknown, skillType: SkillBookSwitchOption['skillType']): SkillBookSwitchOption {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('功法切换列表接口格式不完整');
  }
  const row = value as Record<string, unknown>;

  if (
    !Number.isSafeInteger(row.id) ||
    (row.id as number) <= 0 ||
    typeof row.name !== 'string' ||
    row.skillType !== skillType ||
    !skillTypes.has(row.skillType as SkillBookSwitchOption['skillType']) ||
    (row.status !== 2 && row.status !== 3) ||
    typeof row.isInUse !== 'boolean' ||
    typeof row.canSwitch !== 'boolean'
  ) {
    throw new Error('功法切换列表接口返回不完整');
  }

  return { id: row.id as number, name: row.name, skillType, status: row.status, isInUse: row.isInUse, canSwitch: row.canSwitch };
}

/** Reads the exact visible, unpaged choices for one switch command type. */
export async function getBackendSkillBookSwitchOptions(
  bid: string | undefined,
  uid: number,
  skillType: SkillBookSwitchOption['skillType']
): Promise<SkillBookSwitchOption[]> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  const data: unknown = await requestBackend(bid, 'get_players_id_skill_books_switch_options', { path: { id: uid }, query: { skillType } });

  if (!Array.isArray(data)) {
    throw new Error('功法切换列表接口缺少列表');
  }

  return data.map(value => option(value, skillType));
}

export function parseSkillBookSwitchOptions(data: unknown, skillType: SkillBookSwitchOption['skillType']): SkillBookSwitchOption[] {
  if (!Array.isArray(data)) {
    throw new Error('功法切换列表接口缺少列表');
  }

  return data.map(value => option(value, skillType));
}
