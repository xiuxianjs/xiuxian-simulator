import type { RecoveryTip } from './adventureRecovery';

export function pillConfirmationRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (operation.startsWith('peiyuan.')) {
    const description = /参数错误/.test(text)
      ? '确认或取消培元丹均不附参数；先回看原预览，再决定使用原确认或取消按钮，不自动处理当前预览'
      : /没有待确认/.test(text)
        ? '当前没有待确认预览，可能已过期或已处理；先核对属性及原回执，不反复确认，也不自动补服丹药'
        : '先核对当前属性与原预览回执，失败提示不证明确认或取消一定未执行，结果不明时不重放原操作';

    return [
      { label: '核对属性与原预览', command: '/属性面板', description },
      {
        label: '核对培元丹',
        command: '/储物袋 道具 丹药',
        description: '培元丹在生成预览时扣除，取消或超时不返还；先核对持有数量，不把未确认结果当作丹药未扣除'
      }
    ];
  }
  if (operation === 'mingwu.confirm') {
    return [
      {
        label: '核对当前功法',
        command: '/我的功法',
        description: '明悟丹确认会实际消耗丹药，只适用当前已装备功法；模板编号应取自明悟丹选择面板，不能用已学实例编号替代，先核对原选择与熟练度'
      },
      {
        label: '核对明悟丹',
        command: '/储物袋 道具 丹药',
        description: '核对数量、原回执与今日剩余次数，结果不明时不再次确认；只打开明悟丹选择面板不会扣丹，选择后确认才按实际服用结算'
      },
      {
        label: '重新查看功法选择',
        command: '/服用 明悟丹 1',
        description:
          '只打开当前已装备功法选择面板，不在这一步扣丹；面板提供功法模板编号，不用已学实例编号替代；先核对原确认结果，再决定新的功法与用量，不自动重复原确认'
      }
    ];
  }

  return [];
}
