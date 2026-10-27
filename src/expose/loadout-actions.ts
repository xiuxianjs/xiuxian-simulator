import { mutation } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';
import { parseBackendEquipmentEquip } from '../api/bot/equipment-equip';
import { parseRobotEquipmentAutoEquip } from '../api/bot/equipment-auto-equip';
import { parseRobotEquipmentUnequipOne } from '../api/bot/equipment-unequip-one';
import { parseBackendSkillBookUnequip } from '../api/bot/skill-book-unequip';
import { parseRobotSkillVisibility } from '../api/bot/skill-visibility';

const nonempty = { type: 'string' as const, minLength: 1 };
const skillType = { type: 'string' as const, enum: ['战技', '被动技', '神通'] };
const equipment = object(
  {
    id: integer,
    ...fields(text, 'name equipmentType grade'),
    ...fields(
      number,
      'physicalAttack physicalAttackPercent magicAttack magicAttackPercent physicalDefense physicalDefensePercent magicDefense magicDefensePercent hp hpPercent speed critRate critDamage'
    )
  },
  ['magicDefensePercent']
);
const visibility = object({ code: { type: 'string', enum: ['UPDATED'] }, bookId: integer, isHidden: boolean, message: text, name: text }, ['name']);
const bookInput = object({ bookId: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER } });

export const loadoutActions = {
  equip_equipment: mutation<{ identifier: string }>(
    '穿戴指定装备实例编号或名称；优先传背包返回的实例编号字符串，服务端检查所有权、状态和境界。',
    'equipment.equip',
    object({ identifier: nonempty }),
    object({ outcome: { type: 'string', enum: ['equipped'] }, equipment }),
    input => `/装备 ${input.identifier}`,
    data => {
      const result = parseBackendEquipmentEquip(data);

      if (result.outcome !== 'equipped') {
        throw new Error('穿戴装备响应未确认成功');
      }

      return result;
    }
  ),
  auto_equip_equipment: mutation(
    '由服务端自动选择并穿戴装备；会改变当前配装，必须逐项检查 results，部分类型可能未装备。',
    'equipment.auto-equip',
    object({}),
    object(
      {
        success: boolean,
        message: text,
        power: number,
        results: list(object({ typeName: text, equipped: boolean, equipmentName: text, reason: text }, ['equipmentName', 'reason']))
      },
      ['power']
    ),
    () => '/一键装备',
    parseRobotEquipmentAutoEquip
  ),
  unequip_equipment: mutation<{ equipmentTypeName: string }>(
    '卸下指定装备类型当前穿戴的装备；类型使用 get_equipped 或背包返回的名称。',
    'equipment.unequip-one',
    object({ equipmentTypeName: nonempty }),
    object({ outcome: { type: 'string', enum: ['unequipped'] }, stage: { type: 'string', enum: ['cache_cleared'] }, instanceId: integer }),
    input => `/卸下 ${input.equipmentTypeName}`,
    parseRobotEquipmentUnequipOne
  ),
  unequip_skill_book: mutation<{ skillType: string }>(
    '换下当前战技、被动技或神通，不遗忘或分解功法。',
    'skill-books.unequip',
    object({ skillType }),
    object({ outcome: { type: 'string', enum: ['unequipped'] }, skillBook: object({ name: text, skillType: text }, ['name', 'skillType']) }),
    input => `/换下${input.skillType}`,
    (data, input) => {
      const result = parseBackendSkillBookUnequip(data);

      if (result.outcome !== 'unequipped' || (result.skillBook?.skillType !== null && result.skillBook?.skillType !== input.skillType)) {
        throw new Error('换下功法响应不完整');
      }

      return result;
    }
  ),
  hide_skill_book: mutation<{ bookId: number }>(
    '隐藏本人已学功法；bookId 是功法实例编号，正在使用的功法由服务端拒绝。',
    'skill-books.hide',
    bookInput,
    visibility,
    input => `/隐藏功法 ${input.bookId}`,
    (data, input) => parseRobotSkillVisibility(data, input.bookId, true),
    input => ({ bookId: String(input.bookId) })
  ),
  show_skill_book: mutation<{ bookId: number }>(
    '恢复显示本人隐藏的已学功法；不自动切换功法。',
    'skill-books.show',
    bookInput,
    visibility,
    input => `/显示功法 ${input.bookId}`,
    (data, input) => parseRobotSkillVisibility(data, input.bookId, false),
    input => ({ bookId: String(input.bookId) })
  )
};
