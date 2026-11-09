import type { RobotBusinessOperation } from '@src/api/bot/robot-business';
import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';

type Rewrite = readonly [pattern: RegExp, replacement: string];

const storage: Rewrite[] = [
  [/^未找到名为"/, '未找到匹配物品，或该物品已处于目标状态'],
  [/^(?:装备|功法)类型"/, '未找到匹配类型'],
  [/^该类型下没有可(?:锁定|解锁)的.*（/, '该类型下没有可操作的物品'],
  [/^未知的分类：/, '请选择可用分类']
];
const proposal: Rewrite[] = [[/^没有来自「/, '没有匹配的道侣申请']];
const dungeon: Rewrite[] = [[/^未找到秘境「/, '未找到匹配秘境']];

// Old servers and replay receipts can carry player parameters inside free-form
// failure reasons. Replace only known wire messages for their owning operation.
const legacyFeedback: Partial<Record<RobotBusinessOperation, Rewrite[]>> = {
  'lootboxes.open': [[/^未找到名为【/, '未找到匹配礼盒']],
  'items.consume': [[/^未找到"/, '未找到匹配道具']],
  'dungeon.detail': dungeon,
  'dungeon.challenge': dungeon,
  'seclusion.command': [[/^未找到秘境「/, '未找到匹配秘境或境界不足']],
  'storage.lock': storage,
  'storage.unlock': storage,
  'companion.propose': [[/^未找到「/, '未找到匹配修士，请检查名称、UID 或 @目标']],
  'companion.accept': proposal,
  'companion.reject': proposal,
  'companion.gift': [
    [/^未找到礼物「/, '未找到匹配礼物'],
    [/^未找到「[\s\S]*类别的可赠送物品/, '未找到该类别中可赠送的物品']
  ],
  'friends.block': [[/^未找到名为「/, '未找到匹配玩家，请检查目标']],
  'cave-formations.activate': [[/^【[\s\S]*】不是可激活的阵盘/, '该物品不是可激活的阵盘。']],
  'guild.role-appoint': [[/^职位【/, '未找到匹配职位，请检查职位名称']],
  'guild.red-packet-send': [
    [/^无效的货币类型：/, '请选择货币类型：贡献点 / 灵晶 / 灵石'],
    [/^无效的份数：/, '请选择份数：5 / 10 / 15 / 20 / 25 / 30'],
    [/^无效的金额：/, '请选择金额：100 / 1000 / 10000 / 100000']
  ],
  'equipment.batch-decompose-query': [[/^(?:❌\s*)?无效的品级：/, '请选择有效的装备品级']],
  'skill-books.batch-decompose-query': [[/^(?:❌\s*)?无效的品级：/, '请选择有效的功法品级']],
  'skill-books.wudao': [[/^未知属性：/, '请选择可用悟道属性']]
};

export function cleanLegacyInputFeedback(operation: RobotBusinessOperation, reply: RobotMiddlewareReply): RobotMiddlewareReply {
  const rules = legacyFeedback[operation];

  if (!rules) {
    return reply;
  }
  const storageFailure = rules === storage;
  const clean = (text: string) => {
    const fixed = rules.find(([pattern]) => pattern.test(text.trimStart()))?.[1] ?? text;

    return storageFailure
      ? fixed
          .replace(/(^|\n)未找到名为"[^\n]*/g, '$1未找到匹配物品，或该物品已处于目标状态')
          .replace(/(^|\n)(分类: (?:装备|天工|功法))-[^\n]*/g, '$1$2')
          .replace(/(^|\n)(分类["“](?:装备|天工|功法))-[^\n]*(["”]中没有可(?:锁定|解锁)的物品)/g, '$1$2$3')
      : fixed;
  };
  const cleanButtons = (buttons: RobotMiddlewareReply['buttons']) => storageFailure
      ? buttons.map(button => {
          const category = /^\/储物袋 (装备|天工|功法)\s+\S/.exec(button.command)?.[1];

          return category ? { label: `储物袋${category}`, command: `/储物袋 ${category}` } : button;
        })
      : buttons;

  return {
    ...reply,
    title: clean(reply.title),
    heading: clean(reply.heading),
    text: clean(reply.text),
    buttons: cleanButtons(reply.buttons),
    ...(reply.quote === undefined ? {} : { quote: clean(reply.quote) }),
    ...(reply.rawLines === undefined ? {} : { rawLines: reply.rawLines.map(clean) }),
    ...(reply.blocks === undefined
      ? {}
      : {
          blocks: reply.blocks.map(block => ({
            ...block,
            text: clean(block.text),
            ...(block.inlineButtons === undefined ? {} : { inlineButtons: cleanButtons(block.inlineButtons) })
          }))
        })
  };
}
