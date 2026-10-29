import { parseForgeOverview } from '../api/schemas/forge';
import { parseProfessionRobotTools } from '../api/bot/profession-robot-tools';
import { parseProfessionToolReplace } from '../api/bot/profession-tool-replace';
import { forgeOverviewSchema } from './crafting-actions';
import { mutation, observation } from './mutation';
import { fields, integer, list, object, text } from './schema';

const empty = object({});
const toolId = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };

export const professionActions = {
  learn_forge_recipes: mutation(
    '按当前锻造职业状态学习符合条件的图纸，返回服务端最新图纸和职业状态。',
    'forge.learn',
    empty,
    forgeOverviewSchema,
    () => '/学习锻造图纸',
    parseForgeOverview
  ),
  advance_forge_profession: mutation<{ expectedLevel: number }>(
    '按查询得到的原职业阶段申请锻造进阶；阶段变化时服务端拒绝，结果与资格以服务端为准。',
    'forge.advance',
    object({ expectedLevel: { type: 'integer', minimum: 0, maximum: 2147483647 } }),
    forgeOverviewSchema,
    input => `/锻造进阶 ${input.expectedLevel}`,
    parseForgeOverview,
    input => ({ expectedLevel: input.expectedLevel })
  ),
  get_replaceable_profession_tools: observation(
    '查询当前可切换的天工工具实例；切换时服务端重新校验归属、境界与职业条件。',
    'profession.replace-tool',
    empty,
    object({ code: text, data: object({ tools: list(object({ id: integer, ...fields(text, 'name typeName grade'), isLocked: integer })) }) }),
    () => '/切换',
    data => {
      const result = parseProfessionRobotTools(data);

      if (result.code !== 'LIST') {
        throw new Error('天工候选回执不匹配');
      }

      return result;
    },
    () => ({ identifier: null })
  ),
  replace_profession_tool: mutation<{ userToolId: number }>(
    '切换到本人指定天工工具实例，替换同类型当前工具；服务端校验归属和资格。',
    'profession.replace-tool',
    object({ userToolId: toolId }),
    object({ ...fields(integer, 'toolId userToolId gradeLevel'), ...fields(text, 'toolName typeName gradeName message') }),
    input => `/切换 ${input.userToolId}`,
    (data, input) => {
      if (!data || typeof data !== 'object' || (data as { mode?: unknown }).mode !== 'replace') {
        throw new Error('天工切换回执不完整');
      }
      const result = parseProfessionToolReplace((data as { result: unknown }).result);

      if (result.userToolId !== input.userToolId) {
        throw new Error('天工切换实例不匹配');
      }

      return result;
    },
    input => ({ identifier: String(input.userToolId) })
  )
};
