import { ExposeError } from 'alemonjs';
import { parseBackendInventory, parseRobotStorageMenu } from '../api/bot/inventory';
import { inventorySchema, projectInventory } from './queries';
import { intentIdSchema, mutation, taskInputSchema, validateIntentId } from './mutation';
import { object, text } from './schema';
import { equipment, books, artifacts, tools, lootboxes } from './bags';
import {
  parseRobotStorageEquipment,
  parseRobotStorageSkillBooks,
  parseSoulArtifactBag,
  parseProfessionToolBag,
  parseBackendLootboxes
} from '../api/bot/queries';

type Input = { taskInput: string; intentId?: string };
function parseTaskInventory(input: Input, category: 'prop' | 'material') {
  const command = input.taskInput
    .trim()
    .replace(/^[!！/#＃]\s*/, '')
    .trim();
  const label = category === 'prop' ? '道具' : '材料';
  const match = command.match(/^(?:我的)?(?:储物袋|背包)\s+(道具|材料)(?:\s+(\S+))?(?:\s+(\d+))?$/u);

  if (match?.[1] !== label) {
    throw new ExposeError('INVALID_INPUT', '任务指令与背包分类不匹配');
  }
  const args = [match[2], match[3]].filter((value): value is string => value !== undefined);
  const subtypes =
    category === 'prop' ? ['丹药', '丹方', '礼物', '其它', 'pill', 'danfang', 'gift', 'other'] : ['草药', '经验材料', '其它', 'herb', 'exp', 'other'];

  if (args.length) {
    const subtype = subtypes.includes(args[0]);
    const page = subtype ? args[1] : args[0];

    if ((!subtype && args.length > 1) || (page !== undefined && (!/^\d+$/u.test(page) || Number(page) < 1 || Number(page) > 2147483647))) {
      throw new ExposeError('INVALID_INPUT', '背包分类或页码无效');
    }
  }

  return { command: `/${command}`, args };
}
function taskInventory(category: 'prop' | 'material') {
  const label = category === 'prop' ? '道具' : '材料';

  return mutation<Input>(
    `执行连锁任务中的背包${label}查看步骤，返回库存实例、锁定状态和任务推进回执。子分类和页码从任务指令读取；服务端先推进任务再查询，新操作使用新 intentId，同次重试沿用原编号。`,
    category === 'prop' ? 'storage.props' : 'storage.materials',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    inventorySchema,
    input => parseTaskInventory(input, category).command,
    data => projectInventory(parseBackendInventory(data)),
    input => ({ args: parseTaskInventory(input, category).args }),
    input => {
      validateIntentId(input.intentId);
      parseTaskInventory(input, category);
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  );
}
function parseTaskEquipment(input: Input, label: '装备' | '功法' | '天工' | '本命' | '礼盒') {
  const command = input.taskInput
    .trim()
    .replace(/^[!！/#＃]\s*/, '')
    .trim();
  const match = command.match(/^(?:我的)?(?:储物袋|背包)\s+(装备|功法|天工|本命|礼盒)(?:\s+(\S+))?(?:\s+(\d+))?$/u);

  if (match?.[1] !== label) {
    throw new ExposeError('INVALID_INPUT', '任务指令与背包分类不匹配');
  }
  const args = [match[2], match[3]].filter((value): value is string => value !== undefined);
  const firstIsPage = args.length > 0 && /^\d+$/u.test(args[0]);
  const page = firstIsPage ? args[0] : args[1];

  if (
    args[0] === '操作' ||
    (firstIsPage && args.length > 1) ||
    ((label === '本命' || label === '礼盒') && args.length > 0 && !firstIsPage) ||
    (page !== undefined && (!/^\d+$/u.test(page) || Number(page) < 1 || Number(page) > 2147483647))
  ) {
    throw new ExposeError('INVALID_INPUT', '背包分类或页码无效');
  }

  return { command: `/${command}`, args };
}
function taskEquipment(category: 'equipment' | 'skill-books' | 'profession-tools' | 'soul-artifacts' | 'lootboxes') {
  const configs = {
    equipment: { label: '装备', schema: equipment, parse: parseRobotStorageEquipment },
    'skill-books': { label: '功法', schema: books, parse: parseRobotStorageSkillBooks },
    'profession-tools': { label: '天工', schema: tools, parse: parseProfessionToolBag },
    'soul-artifacts': { label: '本命', schema: artifacts, parse: parseSoulArtifactBag },
    lootboxes: { label: '礼盒', schema: lootboxes, parse: parseBackendLootboxes }
  } as const;
  const { label, schema, parse } = configs[category];

  return mutation<Input>(
    `执行连锁任务中的背包${label}查看步骤，返回实例、状态和任务推进回执。分类与页码从任务指令读取；服务端先推进任务再查询，新操作使用新 intentId，同次重试沿用原编号。`,
    `storage.${category}`,
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    schema,
    input => parseTaskEquipment(input, label).command,
    data => parse(data),
    input => ({ args: parseTaskEquipment(input, label).args }),
    input => {
      validateIntentId(input.intentId);
      parseTaskEquipment(input, label);
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  );
}
export const taskInventoryActions = {
  execute_task_inventory_menu: mutation<Input>(
    '执行连锁任务中的背包或储物袋菜单步骤；该入口仅返回菜单回执及任务推进，不返回库存，后续使用具体背包查询。服务端先推进任务再打开菜单；新操作使用新 intentId，同次重试沿用原编号。',
    'storage.menu',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    object({ message: text }),
    input => `/${input.taskInput
        .trim()
        .replace(/^[!！/#＃]\s*/, '')
        .trim()}`,
    parseRobotStorageMenu,
    () => ({}),
    input => {
      validateIntentId(input.intentId);
      if (
        !/^(?:我的)?(?:储物袋|背包|纳戒)$/u.test(
          input.taskInput
            .trim()
            .replace(/^[!！/#＃]\s*/, '')
            .trim()
        )
      ) {
        throw new ExposeError('INVALID_INPUT', '任务步骤不是明确的背包菜单指令');
      }
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  execute_task_prop_inventory: taskInventory('prop'),
  execute_task_material_inventory: taskInventory('material'),
  execute_task_equipment_inventory: taskEquipment('equipment'),
  execute_task_skill_book_inventory: taskEquipment('skill-books'),
  execute_task_profession_tool_inventory: taskEquipment('profession-tools'),
  execute_task_soul_artifact_inventory: taskEquipment('soul-artifacts'),
  execute_task_lootbox_inventory: taskEquipment('lootboxes')
};
