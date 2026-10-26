import type { RecoveryTip } from './adventureRecovery';

/** Match admission and snapshot recovery; the worker owns grouping and settlement. */
export function teamMatchRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (!operation.startsWith('team-match.')) {
    return [];
  }
  if (/未配置|未启用|响应不完整|数据不完整/.test(text)) {
    return [];
  }
  const list = operation === 'team-match.start-mainline' ? '/查看主线' : '/查看秘境';

  if (/玩家已经在队伍中/.test(text)) {
    return [{ label: '核对现有队伍', command: '/我的队伍', description: '查看当前队伍和目标；已有队伍不能再发起匹配，是否离队由你决定' }];
  }
  if (/已在匹配中/.test(text)) {
    return [
      { label: '查看当前匹配', command: '/匹配状态', description: '先核对当前目标和等待阶段，继续等待或从状态页自行取消后再选择目标；重复发起不会更换现有匹配' }
    ];
  }
  if (/境界过高/.test(text)) {
    return [{ label: '选择适合当前境界的目标', command: list, description: '当前目标有境界上限，继续提升境界不能解除这项限制；查看其他符合当前境界的目标' }];
  }
  if (/单人秘境/.test(text)) {
    return [{ label: '查看秘境玩法', command: '/查看秘境', description: '该目标不支持组队匹配，查看其单人挑战入口，或选择支持组队且符合条件的其他秘境' }];
  }
  if (
    /关卡 .*不存在|请提供章节关卡号|章节关卡号格式不正确|匹配主线参数无效|请提供秘境ID|秘境ID必须|匹配秘境参数无效|匹配编号超出支持范围|匹配目标不能为空|mode 与 targetId|主线章节和关卡必须同时提供/.test(
      text
    )
  ) {
    return [
      {
        label: '从实际目标列表选择',
        command: list,
        description:
          operation === 'team-match.start-mainline'
            ? '从主线列表核对真实章节号和关卡号，按“匹配主线 章节号-关卡号”输入；示例编号不代表已开放目标'
            : '从当前秘境列表核对真实编号及组队条件，再按“匹配秘境 秘境编号”输入；不能用章节关卡号代替秘境编号'
      }
    ];
  }
  if (/未查到有效匹配记录|本次未取消有效匹配记录|匹配记录格式无效/.test(text)) {
    return [
      {
        label: '核对是否已经组队',
        command: '/我的队伍',
        description: '结合当前队伍和服务端通知确认结果；没有有效快照不代表匹配失败，也不能证明异常队列记录已经清除，不据此重复发起匹配'
      }
    ];
  }
  if (/^已取消匹配：/.test(text)) {
    return [
      { label: '查看当前队伍', command: '/我的队伍', description: '本次取消的是等待中的匹配，不会解散已经形成的队伍；先核对当前成员状态，再决定后续玩法' }
    ];
  }
  if (/已达到提示时限/.test(text)) {
    return [
      {
        label: '核对当前队伍和结果',
        command: '/我的队伍',
        description: '快照中的等待秒数不代表已经组队、失败或完成战斗；核对当前队伍及服务端通知后再决定是否取消等待'
      }
    ];
  }

  return [];
}
