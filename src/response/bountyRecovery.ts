import type { RobotMiddlewareReply } from '@src/api/bot/middleware-entry';
import type { RecoveryTip } from './adventureRecovery';

const currentBoard = (description: string): RecoveryTip[] => [{ label: '核对当前悬赏', command: '/悬赏榜', description }];

export function bountyRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (!['bounty.list', 'bounty.publish', 'bounty.accept', 'bounty.claim'].includes(operation)) {
    return [];
  }
  // The shared growth path is for the actor. Target gates and relative gaps
  // below must not be turned into an instruction to keep raising actor realm.
  if (/你的境界过低，需达到筑基期/.test(text)) {
    return [];
  }
  if (operation === 'bounty.publish' && /规则加载失败/.test(text)) {
    return [
      {
        label: '核对发布规则',
        command: '/悬赏',
        description: '规则查询未返回可用结果，先重新核对规则入口；持续失败时保留原反馈联系运营，不按旧费率或默认金额提交发布'
      }
    ];
  }
  if (/目标境界过低|目标注册不满|目标行踪隐匿|目标仍在受袭保护|目标不存在|目标玩家不存在|境界差距超过/.test(text)) {
    return currentBoard(
      '核对目标当前状态，选择符合双方境界与保护条件的可用悬赏；对方保护期或双方阶段差距不能靠反复接赏解除，不自动绕过保护或认定只需提高本人境界'
    );
  }
  if (/注册不满7天/.test(text)) {
    return [
      {
        label: '核对本人状态',
        command: '/我的信息',
        description: '按服务端注册时间和保护规则核对本人资格，到期后再参与；提升境界或补充元力不能提前解除新手保护，不按客户端猜测剩余秒数'
      }
    ];
  }
  if (/账号状态异常/.test(text)) {
    return [
      {
        label: '核对账号状态',
        command: '/我的信息',
        description: '保留原账号限制反馈，先核对本人状态；持续异常时联系运营，补充灵晶、元力或提升境界不能替代账号资格'
      }
    ];
  }
  if (/灵晶不足|货币不足/.test(text) && operation === 'bounty.publish') {
    return [
      {
        label: '核对发布规则',
        command: '/悬赏',
        description: '按实际人数、每人最低赏金和手续费核对总支出，可重新选择自己能负担且符合规则的金额；不承诺能退还手续费'
      },
      { label: '核对本人灵晶', command: '/我的信息', description: '核对当前可用灵晶后再决定是否发布，不自动购买货币或重新提交悬赏' }
    ];
  }
  if (/每人赏金至少|赏金上限|允许完成人数|输入数值过大/.test(text)) {
    return [
      {
        label: '查看发布规则',
        command: '/悬赏',
        description: '按服务端返回的赏金、人数、手续费和有效期核对参数；每人赏金由扣费后的赏金池分配，不能只比较总金额与每人下限，不生成默认金额的发布操作'
      }
    ];
  }
  if (/最多同时发布|已有对该目标的悬赏/.test(text)) {
    return currentBoard('对照原发布回执编号核对本人已有活跃悬赏、目标与有效期，不重复扣费发布；当前入口没有撤销能力，不承诺主动撤销或立即退款');
  }
  if (/今日接赏次数已达上限/.test(text)) {
    return [
      {
        label: '查看待领赏金',
        command: '/领赏',
        description: '今日接赏额度已用完，换目标或补元力不能增加当日额度；可核对已有待领赏金，等待服务端日期窗口恢复后再参与'
      }
    ];
  }
  if (/今日对该目标的接赏已达上限/.test(text)) {
    return currentBoard('该目标今日额度已用完，可在本人总次数仍允许时核对其他合规目标；补元力不能增加对该目标的次数，不自动发起战斗');
  }
  if (/元力不足/.test(text)) {
    return [
      { label: '核对当前元力', command: '/我的信息', description: '对照原提示所需元力核对当前值，同时检查本人和目标的当日接赏次数，补元力不能恢复已用次数' },
      { label: '核对持有丹药', command: '/储物袋 道具 丹药', description: '查看是否持有可用元力丹及服用条件，按实际缺口决定用量，不默认连续服用或自动接赏' }
    ];
  }
  if (/已有待挑战|已有悬赏记录/.test(text)) {
    return [
      {
        label: '核对已有战斗记录',
        command: '/打劫记录',
        description: '先核对这笔已保存的悬赏战斗状态，不重复接取；可使用该编号的继续接赏入口发起新战斗，仍需核对当前资格、元力和次数，不会自动续战'
      },
      { label: '核对已有待领赏金', command: '/领赏', description: '若已有获胜完成记录，从待领列表确认赏金；不能把待挑战记录当作已经获胜或必定可领取' }
    ];
  }
  if (text === '暂无待领取') {
    return currentBoard('待领列表只包含本人已完成且尚未领取的赏金；未获胜或已领取记录不在这里，可核对当前有效悬赏与参与条件，不因列表为空重复领奖');
  }
  if (/请先接取悬赏|悬赏已结算/.test(text)) {
    return [
      {
        label: '核对已有待领赏金',
        command: '/领赏',
        description: '先核对是否已经完成或领取；没有有效待挑战记录时不会自动重新接取，可从当前悬赏榜重新核对状态'
      },
      ...currentBoard('核对悬赏当前状态和参与资格，已失效的继续接赏入口不用于重复结算旧战斗')
    ];
  }
  if (/已完成过该悬赏|不可重复接取|没有可领取|已领取|暂无待领取/.test(text)) {
    return [
      {
        label: '核对待领赏金',
        command: '/领赏',
        description: '先核对本人待领取记录与原完成状态，未接赏、未获胜和已经领取是不同情况；没有待领记录不证明资产丢失，不重复挑战或领奖'
      }
    ];
  }
  if (
    /不能悬赏自己|不能接取自己|你是悬赏目标|有效的目标UID|悬赏目标无效|悬赏编号无效|格式：|Invalid parameter page|已过期|已结束|名额已满|名额已被|悬赏不存在|本页无记录/.test(
      text
    )
  ) {
    return currentBoard('从当前可见榜单核对悬赏编号、目标和剩余名额，悬赏编号不是玩家UID；名额、有效期或身份限制已变化时重新选择合规目标，不自动重放旧操作');
  }
  if (text === '当前没有进行中的悬赏') {
    return [
      {
        label: '核对已有待领赏金',
        command: '/领赏',
        description: '活跃榜单只显示当前可见悬赏，隐匿或到期记录可能不在榜单；已完成待领赏金独立查询，不因榜单为空就推断无法领取'
      }
    ];
  }
  if (text === '接赏战败') {
    return [
      {
        label: '核对装备',
        command: '/我的装备',
        description: '保留本次实际战斗消耗和修为回执，先核对穿戴属性与套装，再决定后续培养；不对同一笔悬赏立即重复发起战斗'
      },
      { label: '核对在用功法', command: '/我的功法', description: '查看在用功法与战斗记录中的表现，按实际资格选择培养，不把战败当作完全没有结算' }
    ];
  }
  if (operation === 'bounty.list') {
    return currentBoard('榜单查询未成功不证明所有悬赏已经结束；重新核对当前页码，持续失败时保留原反馈联系运营');
  }
  if (operation === 'bounty.publish') {
    return [
      {
        label: '核对发布状态',
        command: '/悬赏榜',
        description: '发布结果未获完整确认，先对照原编号、目标和活跃列表核对；隐匿或到期会影响可见性，未看到不证明没有发布，不自动重复扣费'
      },
      { label: '核对本人灵晶', command: '/我的信息', description: '对照原回执核对本人资产，持续异常时保留原指令联系运营；不自行认定已扣费、未扣费或必定退款' }
    ];
  }

  return [
    ...(operation === 'bounty.accept'
      ? [{ label: '核对已有战斗', command: '/打劫记录', description: '接赏结果未获完整确认，先查看已有战斗记录，不立即重放同一笔战斗或把未确认当作未消耗' }]
      : []),
    {
      label: '核对待领与完成状态',
      command: '/领赏',
      description: '操作结果未获完整确认，先核对已有待领取记录；提交或提交后缓存异常不证明没有结算，不自动重发悬赏、战斗或领奖'
    },
    {
      label: '核对本人资产',
      command: '/我的信息',
      description: '对照原回执核对灵晶、元力和实际收益，不自行认定已扣费、未扣费或必定退款；持续异常时保留原指令联系运营'
    }
  ];
}

/** Only an authoritative pending-acceptance refusal can offer a new fight. */
export function withBountyContinuation(operation: string, args: Record<string, unknown>, reply: RobotMiddlewareReply): RobotMiddlewareReply {
  if (operation !== 'bounty.accept' || args.continueBattle === true || reply.rawLines || !/已有待挑战的悬赏/.test(reply.text)) {
    return reply;
  }
  const id = typeof args.bountyId === 'string' && /^\d+$/.test(args.bountyId) ? Number(args.bountyId) : NaN;

  if (!Number.isSafeInteger(id) || id <= 0) {
    return reply;
  }
  const command = `/继续接赏 ${id}`;

  if (reply.advice.some(tip => tip.command === command)) {
    return reply;
  }

  return {
    ...reply,
    advice: [
      ...reply.advice,
      { command, description: '继续接赏会发起一场新的战斗，服务端重新检查资格，并按本次结算消耗元力和次数；先核对已有记录与当前状态，再自行决定' }
    ]
  };
}
