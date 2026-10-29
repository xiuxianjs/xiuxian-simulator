import { confirmationReferenceSchema as reference, validateConfirmationReference as validateReference } from './confirmation';
import { mutation, replySchema } from './mutation';
import { boolean, fields, integer, list, number, object, text } from './schema';
import { parseAlchemyV2Reply } from '../api/bot/alchemy-v2';
import { forgeStatFields, parseForgeOverview, parseForgePreview, parseForgeResult } from '../api/schemas/forge';

const positive = { type: 'integer' as const, minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const empty = object({});

function alchemyReply(value: unknown) {
  const reply = parseAlchemyV2Reply(value);
  const buttons = [...reply.buttons, ...(reply.blocks ?? []).flatMap(block => block.inlineButtons ?? [])];
  const confirmations = buttons.flatMap(button => {
    const match = button.command.match(/^\/炼丹 确认 (r1_[a-z0-9]+_a_[a-z0-9]+_[a-f0-9]{24})$/);

    return match ? [{ reference: match[1], label: button.label }] : [];
  });

  return { reply, confirmations };
}
const alchemy = object({ reply: replySchema, confirmations: list(object({ reference: text, label: text })) });
const stats = Object.fromEntries(Object.keys(forgeStatFields).map(key => [key, number]));

export const forgeMaterialSchema = object({ ...fields(text, 'source name'), ...fields(integer, 'itemId required available listed'), locked: boolean });
const attribute = object({ ...fields(text, 'key name unit'), min: number, max: number });

export const forgeRecipeSchema = object(
  {
    attributes: list(attribute),
    ...fields(boolean, 'tradeable canEquip earlyCraft learned assessment completed canCraft'),
    ...fields(integer, 'id requiredLevel craftRequiredLevel spiritStoneCost toolGrade'),
    ...fields(text, 'name grade type requiredRealm reason toolType'),
    equipment: object({ id: integer, name: text, ...stats }),
    materials: list(forgeMaterialSchema)
  },
  ['craftRequiredLevel', 'earlyCraft']
);
const tutorialTool = { ...fields(integer, 'templateId gradeLevel permission'), ...fields(text, 'name type grade') };
const preview = object(
  {
    token: reference,
    expiresAt: integer,
    tutorial: boolean,
    recipe: forgeRecipeSchema,
    expGained: integer,
    assessmentNew: boolean,
    tutorialTool: object(tutorialTool)
  },
  ['tutorialTool']
);

export const forgeResultSchema = object(
  {
    ...fields(integer, 'crafterId craftId recipeId expGained spiritStoneCost'),
    ...fields(text, 'currentEquipment name crafter createdAt'),
    ...fields(boolean, 'canEquip assessmentNew tutorial replayed'),
    comparisons: list(object({ ...fields(text, 'key name unit'), ...fields(number, 'value current delta') })),
    equipment: object({ ...fields(integer, 'id equipmentId userId permission'), crafterName: text, ...stats }, ['crafterName']),
    materials: list(forgeMaterialSchema),
    tutorialTool: object({ ...tutorialTool, instanceId: integer, equipped: boolean })
  },
  ['tutorialTool']
);

export const forgeOverviewSchema = object({
  ...fields(boolean, 'available joined canAdvance canJoin'),
  ...fields(text, 'reason title advanceReason nextTitle entryRealm'),
  ...fields(integer, 'level exp expRequired assessmentDone assessmentRequired'),
  recipes: list(forgeRecipeSchema)
});

export const craftingActions = {
  get_alchemy_dashboard: mutation(
    '查看炼丹当前状态与功能入口；服务端可能处理入门状态，返回原始业务提示及可确认引用，不自动执行按钮。',
    'alchemy.v2',
    empty,
    alchemy,
    () => '/炼丹',
    alchemyReply
  ),
  enroll_alchemist: mutation(
    '按现有入门流程加入炼丹师或恢复入门引导；服务端处理资格及原有入门奖励，不自动继续其他按钮。',
    'alchemy.v2',
    empty,
    alchemy,
    () => '/炼丹 入门',
    alchemyReply
  ),
  get_alchemy_recipes: mutation<{ page: number }>(
    '查看指定页炼丹丹方；返回服务端说明及预览入口，不立即炼制。',
    'alchemy.v2',
    object({ page: { type: 'integer', minimum: 1, maximum: 2147483647 } }),
    alchemy,
    input => `/炼丹 丹方 ${input.page}`,
    alchemyReply,
    () => ({})
  ),
  preview_alchemy: mutation<{ recipeId: number; count: number }>(
    '预览指定丹方 1..1000 炉的材料、消耗及条件；返回绑定原预览的服务端确认引用，必须先向用户说明并取得确认。',
    'alchemy.v2',
    object({ recipeId: positive, count: { type: 'integer', minimum: 1, maximum: 1000 } }),
    alchemy,
    input => `/炼丹 预览 ${input.recipeId} ${input.count}`,
    alchemyReply,
    () => ({})
  ),
  confirm_alchemy: mutation<{ reference: string }>(
    '用户明确确认原预览后，使用原 r1_a 引用提交炼丹或天工获取。保留原操作编号、用户绑定和过期校验；失败不能重新预览后自动确认。',
    'alchemy.v2',
    object({ reference }),
    alchemy,
    input => `/炼丹 确认 ${input.reference}`,
    alchemyReply,
    () => ({}),
    input => validateReference(input.reference, 'a')
  ),
  get_forge_overview: mutation(
    '查看锻造等级、图纸、材料库存、学习和制作资格；不保存或制作装备，服务端保留准入。',
    'forge.overview',
    empty,
    forgeOverviewSchema,
    () => '/我的锻造',
    parseForgeOverview
  ),
  preview_forge: mutation<{ recipeId: number }>(
    '预览指定锻造图纸的材料、费用、属性范围和原确认引用；不消耗制作材料。请先向用户说明并取得确认。',
    'forge.preview',
    object({ recipeId: positive }),
    preview,
    input => `/打造 ${input.recipeId}`,
    parseForgePreview,
    input => ({ recipeId: input.recipeId, tutorial: false })
  ),
  preview_forge_tutorial: mutation(
    '预览加入锻造师的入门制作与工具奖励；取得用户确认后再用原引用调用 confirm_forge。',
    'forge.preview',
    empty,
    preview,
    () => '/加入锻造师',
    parseForgePreview,
    () => ({ recipeId: 0, tutorial: true })
  ),
  confirm_forge: mutation<{ reference: string }>(
    '用户明确确认原预览后，使用原 r1_f 引用打造；服务端校验原材料、图纸和预览有效期，返回实际装备及重放标记。不得重建最新预览后自动提交。',
    'forge.confirm',
    object({ reference }),
    forgeResultSchema,
    input => `/确认打造 ${input.reference}`,
    parseForgeResult,
    input => ({ token: input.reference }),
    input => validateReference(input.reference, 'f')
  )
};
