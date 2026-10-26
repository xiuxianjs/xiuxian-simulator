import type { RecoveryTip } from './adventureRecovery';

/** Membership recovery follows TeamService; navigation never changes membership. */
export function teamRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (
    ![
      'teams.create',
      'teams.apply',
      'teams.application-approve',
      'teams.application-reject',
      'teams.leave',
      'teams.disband',
      'teams.invitation-accept',
      'teams.invite',
      'teams.kick',
      'teams.leadership',
      'teams.position',
      'teams.invitation-cancel',
      'teams.invitation-reject',
      'teams.realm',
      'teams.overview',
      'teams.info',
      'teams.list',
      'teams.applications',
      'teams.my-applications',
      'teams.invitations',
      'teams.battle-records',
      'teams.battle-detail',
      'teams.application-cancel'
    ].includes(operation)
  ) {
    return [];
  }
  if (/服务未启用|响应不完整|服务不可用|服务未配置/.test(text)) {
    return [];
  }
  const review = operation === 'teams.application-approve' || operation === 'teams.application-reject';
  const managing = review || operation === 'teams.invite';

  if (operation === 'teams.battle-detail' && /记录不存在|无权查看该队伍战斗记录|recordId必须为正整数|队伍战斗详情参数无效/.test(text)) {
    return [
      {
        label: '查看本人可见战报',
        command: '/队伍战斗记录',
        description: '从本人带队或参与的历史战报选择真实记录编号；当前加入该队伍不等于参与了历史战斗，不能靠转让队长取得旧战报权限'
      }
    ];
  }
  if (operation === 'teams.info' && /队伍不存在|队伍信息参数无效/.test(text)) {
    return [{ label: '查看当前队伍', command: '/队伍列表', description: '从现存队伍列表核对真实编号；旧编号失效不能判定为本人已经离队' }];
  }
  if (operation === 'teams.list' && /^暂无队伍(?:\n|$)/.test(text)) {
    return [{ label: '核对本人队伍', command: '/我的队伍', description: '当前列表没有队伍，可先核对本人是否已入队，再决定等待新队伍或自行创建' }];
  }
  if ((operation === 'teams.list' || operation === 'teams.battle-records') && /本页暂无|page 必须为正整数|列表参数无效|战斗记录参数无效/.test(text)) {
    return [
      {
        label: '返回第一页',
        command: operation === 'teams.list' ? '/队伍列表 1' : '/队伍战斗记录 1',
        description: '当前页没有可显示条目，请从第一页重新核对；空页不等于所有记录都不存在'
      }
    ];
  }
  if (operation === 'teams.battle-records' && /暂无队伍战斗记录/.test(text)) {
    return [
      { label: '查看本人队伍', command: '/我的队伍', description: '这里仅显示本人带队或参与的历史战报；核对当前队伍，未参与的其他队伍战报不会出现在本人记录中' }
    ];
  }
  if (operation === 'teams.application-cancel' && /没有待审核|申请记录不存在或已处理|applicationId必须为正整数/.test(text)) {
    return [
      {
        label: '核对当前队伍和申请',
        command: '/我的队伍',
        description: '取消申请只影响本人待审核申请，不会退出已经加入的队伍；先核对当前成员身份及原审核结果'
      },
      { label: '查看本人待审核申请', command: '/我的队伍申请', description: '核对当前申请编号；旧编号失效不等于本次取消成功，已通过的申请不能用取消申请退队' }
    ];
  }
  if (operation === 'teams.invite' && /受邀者境界不足/.test(text)) {
    return [
      { label: '核对队伍门槛', command: '/我的队伍', description: '核对队伍要求，并与受邀者确认其境界；不足的是受邀者的境界，提升邀请人自身境界不能替对方达标' }
    ];
  }
  if (operation === 'teams.invite' && /玩家已经在队伍中/.test(text)) {
    return [
      { label: '核对当前队伍成员', command: '/我的队伍', description: '已在队伍中的是受邀者，先核对成员并与对方确认当前队伍；邀请人离队不能解除对方的入队限制' }
    ];
  }
  if (operation === 'teams.invite' && /对方已关闭队伍邀请/.test(text)) {
    return [{ label: '查看好友', command: '/我的好友', description: '先与对方确认入队意愿；只有对方可决定是否开启接收邀请，修改你自己的接收设置无效' }];
  }
  if (operation === 'teams.invite' && /已邀请该玩家|队伍待处理邀请已达上限/.test(text)) {
    return [
      {
        label: '核对队伍成员',
        command: '/我的队伍',
        description: '已发出的邀请等待受邀者处理；受邀者可在自己的“我的队伍邀请”中查看。需要撤销时，使用原邀请回执中的编号；本人的邀请收件箱不包含已发出的邀请'
      }
    ];
  }
  if (/你还未加入队伍|你当前没有加入任何队伍/.test(text)) {
    return [{ label: '查看可加入队伍', command: '/队伍列表', description: '先查看现有队伍和入队条件，加入后再按本人权限管理成员' }];
  }
  if (/目标成员不在队伍中|目标不在队伍中|不能转让给自己|不能踢出自己|该成员已经在此位置|位置(?:序号)?必须在1-6之间|队员编号无效|目标编号无效/.test(text)) {
    return [
      {
        label: '核对成员与位置',
        command: '/我的队伍',
        description: '从当前成员列表核对真实UID、队长和位置；转让与踢出须选择其他成员，位置使用1至6的整数，已在目标位置时无需再次移动'
      }
    ];
  }
  if (/不能邀请自己/.test(text)) {
    return [{ label: '查看好友', command: '/我的好友', description: '选择愿意入队的其他道友，使用其真实UID或直接 @对方，再发出邀请' }];
  }
  if (operation === 'teams.realm' && /境界不存在|本次未取消境界门槛/.test(text)) {
    return [
      {
        label: '核对现有境界门槛',
        command: '/我的队伍',
        description: '核对当前门槛。设置时使用已存在的完整境界名称；取消未生效时以查询结果为准，暂勿按无门槛状态邀请或审核'
      }
    ];
  }
  if (operation === 'teams.invitation-cancel' && /邀请不存在或已处理|邀请编号无效/.test(text)) {
    return [
      {
        label: '核对当前队伍',
        command: '/我的队伍',
        description: '结合原邀请回执和当前成员核对结果；撤销使用本队待处理邀请编号，队伍编号不能代替邀请编号。本人邀请收件箱只显示收到的邀请'
      }
    ];
  }
  if (/申请者境界不足/.test(text)) {
    return [
      {
        label: '核对申请人与门槛',
        command: '/我的队伍',
        description: '不足的是申请人的境界，核对当前队伍门槛并与申请人确认；提升队长自身境界不能替申请人达标'
      },
      { label: '刷新待审核申请', command: '/队伍申请', description: '刷新列表确认申请是否仍待审核；本次拒绝不代表申请已自动清除' }
    ];
  }
  if (/申请者已加入其他队伍/.test(text)) {
    return [{ label: '刷新待审核申请', command: '/队伍申请', description: '先与申请人确认其当前队伍和入队意愿，再刷新申请；本次拒绝不代表申请已删除' }];
  }
  if (/玩家已经在队伍中/.test(text)) {
    return [{ label: '查看本人队伍', command: '/我的队伍', description: '先核对当前成员和队长身份；已有队伍时不能重复创建或加入，是否离队由你决定' }];
  }
  if (/只有队长可以|你不是队长/.test(text)) {
    return [{ label: '核对当前队长', command: '/我的队伍', description: '核对当前队长身份，请当前队长处理审核、邀请或成员管理等需要队长权限的操作' }];
  }
  if (/队伍人数已满/.test(text)) {
    return [
      {
        label: managing ? '核对当前成员' : '查看其他队伍',
        command: managing ? '/我的队伍' : '/队伍列表',
        description: managing
          ? operation === 'teams.invite'
            ? '核对当前成员；有空位后再邀请，是否调整成员由队长决定'
            : '核对当前成员与待审核申请；有空位后再审核，是否调整成员由队长决定'
          : '核对现有人数和境界门槛，选择仍可加入的队伍，或等待目标队伍出现空位'
      }
    ];
  }
  if (/已申请该队伍|待审核队伍申请已达上限/.test(text)) {
    return [
      {
        label: '查看本人待审核申请',
        command: '/我的队伍申请',
        description: '查看待审核申请与编号，已发送的申请等待队长处理；达到上限时可自行选择不再需要的申请取消'
      }
    ];
  }
  if (/队伍申请不存在或已处理/.test(text)) {
    return [{ label: '刷新待审核申请', command: '/队伍申请', description: '从当前待审核列表选择有效申请编号；旧申请失效不代表本次已经同意' }];
  }
  if (/队伍邀请不存在或已处理/.test(text)) {
    return [
      { label: '查看本人队伍邀请', command: '/我的队伍邀请', description: '查看当前待处理邀请和编号，再核对本人队伍；旧邀请不可用不等于本次已经入队' },
      { label: '核对是否已经入队', command: '/我的队伍', description: '结合当前成员状态和原回执，确认是否已加入目标队伍' }
    ];
  }
  if (/teamId必须为正整数/.test(text)) {
    return [{ label: '选择有效队伍', command: '/队伍列表', description: '核对真实队伍编号、人数与境界门槛，再按列表中的队伍编号申请' }];
  }
  if (/applicationId必须为正整数/.test(text)) {
    return [{ label: '选择有效申请', command: '/队伍申请', description: '队伍编号与申请编号不同，从当前待审核列表选择申请编号' }];
  }
  if (/invitationId必须为正整数/.test(text)) {
    return [{ label: '选择有效邀请', command: '/我的队伍邀请', description: '从本人待处理邀请选择邀请编号，不能用队伍编号代替邀请编号' }];
  }

  return [];
}
