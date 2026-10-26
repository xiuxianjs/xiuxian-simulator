import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import type { RecoveryTip } from './adventureRecovery';

export function soulPathRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (!/^soul-path\.(?:state|compare|nurture|supply|(?:choose|switch|advance|reroll)-preview|confirm)$/.test(operation)) {
    return [];
  }
  if (operation === 'soul-path.state' || operation === 'soul-path.compare') {
    if (/道途名称无效/.test(text)) {
      return [
        {
          label: '查看当前道途与可选名称',
          command: '/元婴道途',
          description: '不附名称查看当前道途，再按玄法、炼体或御器查看详情；查看详情不会替你选择或切换道途'
        }
      ];
    }

    return [
      {
        label: '核对人物状态',
        command: '/我的信息',
        description: '先核对当前境界与人物状态；神魂查询失败不代表道途、进度或材料已清空，不据此重新立道或重复消耗'
      },
      {
        label: '重新查看神魂面板',
        command: '/元婴神魂',
        description: '稍后重新查询当前状态，持续异常保留原反馈联系运营；查询结果以服务端为准，不把暂时无法计算当作零加成或战斗已失效'
      }
    ];
  }
  if (/组队匹配|匹配副本队伍/.test(text)) {
    return [
      { label: '核对当前匹配', command: '/匹配状态', description: '先核对当前匹配阶段，由你决定等待或结束匹配；不要反复调整神魂，也不自动取消或离队' },
      { label: '核对当前队伍', command: '/我的队伍', description: '已进入匹配副本队伍时先查看队伍状态，结束当前流程后再核对神魂操作条件' }
    ];
  }
  if (/请先选择.*道途/.test(text)) {
    return [
      {
        label: '查看道途选择',
        command: '/元婴道途',
        description: '先查看各道途与选择条件，通过实际预览和确认立道；不把重新温养当作选择道途，也不代选或跳过确认'
      }
    ];
  }
  if (/维护中/.test(text)) {
    return [{ label: '核对神魂当前状态', command: '/元婴神魂', description: '按原提示保留已有进度，维护期间不反复温养或切换；恢复后重新核对面板与原结果' }];
  }
  if (/凭证|确认操作类型|确认操作缺少/.test(text)) {
    return [
      {
        label: '核对当前神魂与原回执',
        command: '/元婴神魂',
        description: '先核对当前道途、温养和原确认结果；凭证失效不证明操作从未执行，不重复旧确认，也不使用他人凭证'
      },
      {
        label: '重新查看道途预览',
        command: '/元婴道途',
        description: '从本人当前状态重新选择操作并核对新预览，费用、风险与有效期以新预览为准；返回页面不会自动确认或取消旧凭证'
      }
    ];
  }
  if (/切换冷却/.test(text)) {
    return [
      {
        label: '核对道途冷却',
        command: '/元婴道途',
        description: '以原提示的可切换时刻为准，冷却结束后重新预览并检查费用；重开页面或重复确认不会解除冷却，不代替当前道途'
      }
    ];
  }
  if (/感悟不足|道途熟练不足/.test(text)) {
    return [
      {
        label: '核对当前节点需求',
        command: '/元婴神魂',
        description: '对照原提示的感悟、当前道途熟练与持有量；温养可积累进度，但需先核对材料、方向和次数，不自动温养或重复突破'
      },
      {
        label: '查看温养与材料规则',
        command: '/神魂材料来源',
        description: '按当前材料来源和温养规则安排进度，不把人物境界或购买无关材料当作补足道途感悟/熟练'
      }
    ];
  }
  if (/首发节点已全部圆融/.test(text)) {
    return [
      {
        label: '查看现有道途节点',
        command: '/元婴道途',
        description: '当前道途已到原提示的开放节点上限，先查看现有节点与其他道途进度，不为重复突破继续收集本节点材料'
      }
    ];
  }
  if (operation !== 'soul-path.nurture' && operation !== 'soul-path.supply' && /重选|保底感悟|最近一次温养/.test(text)) {
    return [
      {
        label: '核对最近温养与重选资格',
        command: '/元婴神魂',
        description: '只按当前可重选结果和次数决定；保底结果不可重选，不能重复温养伪造资格，重选可能变差且需收回旧额外材料，先保留原材料与回执'
      },
      { label: '查看材料与温养规则', command: '/神魂材料来源', description: '先核对当前材料、权益和已用次数，再决定是否重新预览，不自动退还、补领或购买权益' }
    ];
  }
  if (operation !== 'soul-path.nurture' && operation !== 'soul-path.supply') {
    return [
      {
        label: '核对当前道途与确认结果',
        command: '/元婴道途',
        description: '先核对当前道途、节点和原回执，再重新查看对应预览；未知结果不证明未消耗或未生效，不直接重放旧凭证'
      },
      { label: '核对神魂与材料', command: '/元婴神魂', description: '核对当前稳定、感悟、熟练及持有材料，持续异常保留原反馈联系运营，不自动温养、切换或重选' }
    ];
  }
  if (/次数.*用尽|基础次数已用尽/.test(text)) {
    return [
      {
        label: '核对温养次数与资格',
        command: '/元婴神魂',
        description: '基础次数和额外低风险资格分别核对；基础次数用尽不等于还能出窍，不根据旧按钮推断额外次数，按面板仍可用的类型与次数决定，确已耗尽再等待恢复'
      },
      {
        label: '查看材料与温养规则',
        command: '/神魂材料来源',
        description: '按当前规则安排后续材料，次数不足不靠重复提交、改补给方向或继续购买材料解决，不自动继续消耗'
      }
    ];
  }

  return [
    {
      label: '核对神魂与原结果',
      command: '/元婴神魂',
      description: /稳定不足/.test(text)
        ? '先核对稳定、次数与材料，再考虑定魂后出窍；定魂也会消耗材料和次数，不直接重复出窍或自动代为温养'
        : '先核对当前道途、稳定、次数与原回执；失败不证明材料未消耗或设置未生效，结果不明时不重复温养、重选或补领'
    },
    {
      label: '查看材料来源与补给规则',
      command: '/神魂材料来源',
      description: '按当前面板核对神魂露与方向材料；补给方向只影响后续符合条件的结算材料，不立即发材料，也不追加当天领取次数'
    }
  ];
}

/** Failure navigation must not replay a saved confirmation token. */
export function withoutSoulConfirmationActions(reply: RobotMiddlewareReply): RobotMiddlewareReply {
  const confirmation = (command: string) => /^[!！/#＃]?确认神魂(?:\s|$)/.test(command.trim());
  const blocks = reply.blocks?.map(block => ({
    ...block,
    ...(block.inlineButtons ? { inlineButtons: block.inlineButtons.filter(button => !confirmation(button.command)) } : {})
  }));

  return {
    ...reply,
    buttons: reply.buttons.filter(button => !confirmation(button.command)),
    advice: reply.advice.filter(tip => !confirmation(tip.command)),
    ...(blocks ? { blocks } : {})
  };
}
