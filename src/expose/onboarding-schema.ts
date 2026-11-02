import { boolean, integer, list, object, text } from './schema';

export const onboardingSchema = object(
  {
    status: { type: 'string', enum: ['absent', 'active', 'soft', 'completed', 'exited'] },
    phase: text,
    version: integer,
    title: { ...text, description: '默认系统气泡标题；兼容历史 NPC 标题，不代表 AI 必须扮演该 NPC。' },
    lines: { ...list(text), description: '无 AI 时可直接展示的完整引导。AI 可用当前机器人人格解释，保留条件与限制，不编造世界事件或游戏结果。' },
    feedback: { ...list(text), description: '服务端实际反馈；不得把未结算预估说成已入账，或因表达失败重做操作。' },
    actions: {
      ...list(object({ label: text, command: text })),
      description: '服务端当前允许的动作，不代表玩家已授权；执行时原样使用 command 和对应 version。'
    },
    entries: {
      ...list(object({ label: text, command: text })),
      description: '可选引导导航，使用当前 version 通过教学动作执行。milestone-handoff 的 actions 则是原玩法入口，需调用对应玩法能力，不再提交为教学动作。'
    },
    branchMenu: object({ lines: list(text), items: list(object({ id: text, name: text, description: text, command: text, learned: boolean })) }),
    choiceBound: boolean
  },
  ['choiceBound', 'branchMenu', 'entries']
);
