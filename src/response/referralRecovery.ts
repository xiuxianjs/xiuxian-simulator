import type { RecoveryTip } from './adventureRecovery';

/** Overview/rule commands may materialize eligibility receipts; none of these tips auto-claim. */
export function referralRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (!operation.startsWith('referral.')) {
    return [];
  }
  if (operation === 'referral.bind') {
    if (/格式错误|请输入邀请码|不能绑定自己的|对应的玩家不存在/.test(text)) {
      return [
        {
          label: '查看本人邀请信息',
          command: '/邀请码',
          description: '请邀请人提供其真实、完整的小写tt-开头邀请码；此页展示的是本人的邀请码，不能用自己的码绑定，也不能把礼包码当邀请码'
        }
      ];
    }
    if (/注册30天内|绑定邀请码已过期/.test(text)) {
      return [
        {
          label: '查看本人邀请功能',
          command: '/邀请码',
          description: '绑定门槛约束新人的注册时间，提升境界或更换码不能延长窗口；仍可核对本人邀请信息，再决定是否邀请其他新人'
        }
      ];
    }
    if (/已经绑定过/.test(text)) {
      return [
        {
          label: '核对本人账号',
          command: '/我的信息',
          description: '已绑定不能通过更换邀请码再次绑定；保留原回执，需要核对绑定对象时联系管理员，邀请码页展示本人对外的码而非已绑定对象'
        }
      ];
    }

    return [
      {
        label: '先核对本人状态',
        command: '/我的信息',
        description: '本次绑定未获完整确认，关系或礼包可能已经写入；先核对当前账号、原回执及奖励，持续异常时联系管理员核对绑定记录，不自动换码重绑'
      }
    ];
  }
  if (operation === 'referral.claim') {
    if (/快照异常|缺少可恢复快照|奖励配置已失效/.test(text)) {
      return [
        {
          label: '核对邀请奖励记录',
          command: '/我的邀请',
          description: '保留原反馈并联系管理员核对已达成奖励快照；继续提升境界、VIP或重新邀请不能修复历史奖励数据，不将当前配置替代已达成奖励'
        }
      ];
    }
    if (/暂无可领取/.test(text)) {
      return [
        {
          label: '查看道友达成进度',
          command: '/我的邀请',
          description: '核对被邀请道友当前境界、待领取记录及后续目标；成长条件约束被邀请道友，邀请人提升自己不能替对方达标，未达成时反复领取不会增加奖励'
        }
      ];
    }

    return [
      {
        label: '先核对领取记录',
        command: '/我的邀请',
        description: '本次领取未获完整确认，先核对待领取和已领取记录及原回执；失败不能证明奖励未到账，不自动重领或更换请求'
      }
    ];
  }
  if (operation === 'referral.invitees') {
    return [
      {
        label: '查看邀请首页',
        command: '/我的邀请 1',
        description: '核对第一页与当前总人数，空页或查询失败不代表绑定记录丢失；没有后续成长档位也不等于已达成的待领取记录失效'
      }
    ];
  }
  if (/暂无.*奖励配置/.test(text)) {
    return [
      {
        label: '核对当前邀请记录',
        command: '/我的邀请',
        description: '当前规则页没有可展示的配置，不能据此判断历史已达成记录失效；按道友当前待领取与已领取记录核对，不凭空承诺新档位或奖励'
      }
    ];
  }

  return [
    {
      label: '核对当前邀请记录',
      command: '/我的邀请',
      description: '本次未取得完整邀请面板，不能认定人数或待领取记录归零；邀请码及规则页可能已同步达成记录，稍后手动核对，不自动连续请求或领取'
    }
  ];
}
