import type { RecoveryTip } from './adventureRecovery';

/** Admission/relationship navigation follows current MasterService checks. */
export function masterRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (['master.info', 'master.lineage', 'master.ranking'].includes(operation)) {
    if (operation === 'master.lineage' && /师承关系存在循环/.test(text)) {
      return [
        { label: '核对当前师门记录', command: '/我的师门', description: '保留循环错误反馈并联系管理员核对关系记录；查看当前关系，不通过叛离或逐出尝试修复谱系' }
      ];
    }
    if (operation === 'master.info' && /还未建立师承关系/.test(text)) {
      return [
        {
          label: '核对本人拜师资格',
          command: '/我的信息',
          description: '先核对本人境界与师承历史；拜师还需满足当前开放范围、冷却及对方资格，不能只凭没有当前关系判断可立即拜师'
        },
        { label: '参考师德排行', command: '/圣人榜', description: '参考修士UID并核对对方境界、培养名额与收徒意愿，再决定是否申请；榜单不保证对方可收徒' }
      ];
    }
    if (operation === 'master.lineage' && /未形成可追溯的师承谱系|师谱当前仅展示本人/.test(text)) {
      return [
        {
          label: '查看当前关系与历史',
          command: '/我的师门',
          description: '师谱追溯在培养及已出师关系，叛离、逐出历史需在师门面板核对；空谱系或只有本人不代表从未拜师，也不代表可直接重新拜师'
        }
      ];
    }
    if (operation === 'master.ranking' && /暂无上榜修士|未返回本人排名|本人排名未在当前展示范围内/.test(text)) {
      return [
        {
          label: '核对本人师德与培养',
          command: '/我的师门',
          description: '查看本人师德、当前徒弟与累计出师统计；未展示排名不代表师德为零，榜单也不能代替当前培养名额或称号领取条件'
        }
      ];
    }

    return [
      {
        label: '先查看本人信息',
        command: '/我的信息',
        description: '本次未取得完整查询结果，不能据此判断师承已解除、师德归零或排名消失；保留原反馈，稍后手动重查，服务未配置或持续异常时联系管理员'
      }
    ];
  }
  if (
    ![
      'master.apply',
      'master.binding-accept',
      'master.expel',
      'master.rebel',
      'master.teach',
      'master.bless',
      'master.gift',
      'master.teach-all',
      'master.bless-all',
      'master.gift-all',
      'master.graduation-apply',
      'master.graduation-accept',
      'master.graduation-reject',
      'master.title-claim'
    ].includes(operation)
  ) {
    return [];
  }
  if (/未配置|未初始化|响应不完整|查询暂不可用|道具不存在|道具配置缺失/.test(text)) {
    return [];
  }
  const graduationDecision = operation === 'master.graduation-accept' || operation === 'master.graduation-reject';

  if (graduationDecision && /没有来自该修士的出师申请|拜师申请不存在|使用方法：(同意|拒绝)出师/.test(text)) {
    return [
      {
        label: '刷新收到的出师申请',
        command: operation === 'master.graduation-reject' ? '/拒绝出师' : '/同意出师',
        description: '从本人收到的当前出师申请选择徒弟UID，列表序号和申请记录ID不能代替UID；旧申请不可用不代表本次审批成功'
      }
    ];
  }
  if ((operation === 'master.graduation-apply' || operation === 'master.graduation-accept') && /境界未达到出师要求/.test(text)) {
    return graduationDecision
      ? [
          {
            label: '核对徒弟当前出师进度',
            command: '/我的师门',
            description: '需要达标的是这名徒弟的境界，师父提升自己不能替徒弟达标；审核会重新校验当前状态，旧申请不保证仍能通过'
          }
        ]
      : [
          { label: '查看本人出师条件', command: '/我的师门', description: '核对本人境界与出师进度，先确认还欠缺哪些条件；境界达标也不代表培养条件全部完成' },
          {
            label: '推进主线修行',
            command: '/查看主线',
            description: '查看当前关卡的修为奖励与消耗，挑战主线或在满足条件时扫荡已三星关卡，积累修为后核对突破条件'
          },
          { label: '核对突破条件', command: '/我的境界', description: '核对当前修为、材料与突破条件，按当前境界安排晋升，不反复提交未达标的出师申请' }
        ];
  }
  if ((operation === 'master.graduation-apply' || operation === 'master.graduation-accept') && /尚未满足出师条件/.test(text)) {
    return [
      {
        label: '查看具体培养进度',
        command: '/我的师门',
        description: '逐项核对关系天数、活跃天数、累计互动和冲丹完成标记；按当前缺项安排培养，单纯等待或补丹药不保证全部达标'
      }
    ];
  }
  if (operation === 'master.graduation-apply' && /出师申请已存在|已提交出师申请/.test(text)) {
    return [
      {
        label: '核对当前师门',
        command: '/我的师门',
        description: '等待师父在其出师申请列表处理；自己的“同意出师”是收到的申请列表，不能审核自己发出的申请，重复提交不会加快处理'
      }
    ];
  }
  if (graduationDecision && /已确认出师|已拒绝出师申请/.test(text)) {
    return [
      {
        label: '查看当前师门结果',
        command: '/我的师门',
        description: text.includes('已拒绝')
          ? '拒绝的是本条出师申请，师徒关系不会因此结束；核对当前培养进度，再与徒弟确认后续安排'
          : '按服务端回执核对当前出师关系与培养统计，是否出师以实际关系为准，不重复审批旧申请'
      }
    ];
  }
  if (operation === 'master.title-claim') {
    if (/累计出师|尚未达到领取称号条件/.test(text)) {
      return [
        { label: '核对累计出师统计', command: '/我的师门', description: '查看师父累计出师人数与培养进度；当前收徒人数、徒弟境界或师德排名不能代替累计出师条件' }
      ];
    }
    if (/已持有|已领取/.test(text)) {
      return [
        { label: '查看已持有称号', command: '/我的称号', description: '在称号列表核对“桃李满天下”及佩戴状态；已持有时无需重复领取，领取本身不会自动佩戴' }
      ];
    }
    if (/领取失败|操作繁忙|处理中|IDEMPOTENCY_IN_PROGRESS/.test(text)) {
      return [
        {
          label: '先核对称号到账',
          command: '/我的称号',
          description: '本次领取未获得完整确认，先核对现有称号并保留原回执；请求仍在处理中时等待结果，不自动更换请求重复领取'
        }
      ];
    }
  }
  const batch = ['master.teach-all', 'master.bless-all', 'master.gift-all'].includes(operation);
  const preview = operation === 'master.bless-all' ? '/一键赐福' : '/一键赐丹';

  if (batch && /本次共完成 \d+ 次|批量执行未获完整确认/.test(text)) {
    return [
      {
        label: '核对本次逐人结果',
        command: '/我的师门',
        description: '按原回执核对每名徒弟已完成次数与失败原因；前面完成的互动不会因后面失败而撤销，先查看当前互动计数再安排剩余操作，不重放整批'
      },
      ...(operation === 'master.teach-all'
        ? []
        : [
            {
              label: '核对师父当前丹药',
              command: '/储物袋 道具 丹药',
              description: '保留原完成次数和实际消耗，查询剩余库存；没有完整确认时不把预览费用当作已扣数量'
            }
          ])
    ];
  }
  if (/扶持次数或徒弟状态已变化|暂无可执行次数或丹药不足/.test(text)) {
    return [
      { label: '重新预览当前扶持', command: preview, description: '重新核对当前徒弟、剩余次数与丹药消耗；新预览由你决定是否确认，旧计划不能用于绕过状态变化' }
    ];
  }
  if (/今日暂无可执行的扶持|暂无在门下的徒弟/.test(text) || (!batch && /今日次数已满|今日该师徒互动次数已达上限|徒弟已完成培养阶段/.test(text))) {
    return [
      {
        label: '核对师门互动进度',
        command: '/我的师门',
        description: '查看当前徒弟、培养阶段及各项互动计数；等待对应次数恢复或按培养进度安排出师，补丹药不能增加已用完的次数，也不自动提交出师'
      }
    ];
  }
  if (/物品数量不足|丹药不足，未执行任何操作/.test(text)) {
    return [
      {
        label: '核对师父持有丹药',
        command: '/储物袋 道具 丹药',
        description: '核对师父自己的库存：赐福用元力丹，赐丹按当前徒弟阶段与所选丹药核对筑基丹或培元丹；徒弟持有量不能代替师父库存'
      },
      { label: '查询当前商店', command: '/商店 万宝楼', description: '查询需要的丹药是否在售及价格，再决定补充；批量补充后需重新预览，不直接确认旧计划' }
    ];
  }
  if (/使用方法：(传功|赐福|赐丹)/.test(text)) {
    return [{ label: '核对当前徒弟', command: '/我的师门', description: '从本人当前师门确认有效徒弟UID或直接 @目标，再核对该项次数与消耗；不会替你批量执行' }];
  }
  if (/仅炼气二层到金丹圆满可拜师|你已出师，不可再次拜师/.test(text)) {
    return [
      { label: '查看现有师承', command: '/我的师门', description: '核对当前境界与出师记录；超过拜师开放范围或已经出师时，继续提升修为不能重新获得拜师资格' }
    ];
  }
  if (operation === 'master.apply' && /筑基初期及以上方可收徒|仅可收境界低于自己的徒弟/.test(text)) {
    return [
      {
        label: '核对本人境界',
        command: '/我的信息',
        description: '比较你与目标师父的境界：目标师父须达到收徒条件且高于你，提升申请人自己的境界不能代替师父达标'
      },
      { label: '查看师德排行', command: '/圣人榜', description: '可参考其他修士再核对真实UID、境界与收徒意愿；排行不保证对方当前符合收徒资格或还有名额' }
    ];
  }
  if (operation === 'master.binding-accept' && /仅可收境界低于自己的徒弟/.test(text)) {
    return [
      { label: '核对双方当前境界', command: '/我的师门', description: '按当前申请人与本人的真实境界比较，师父必须高于徒弟；旧申请不保证现在仍符合条件' },
      { label: '查看本人修行进度', command: '/我的信息', description: '核对本人境界和修为，再决定修行安排；不能只按最初申请时的境界收徒' }
    ];
  }
  if (/你当前已有师父|已有师承关系|师徒关系已存在|师徒关系不存在/.test(text)) {
    return [
      { label: '核对当前师门', command: '/我的师门', description: '查看当前师父、徒弟及历史关系；已有关系不重复建立，关系失效不代表本次已经成功收徒或解除' }
    ];
  }
  if (/道侣双方不可建立师徒关系/.test(text)) {
    return [
      { label: '核对道侣关系', command: '/我的道侣', description: '当前双方为道侣，不能再建立师徒关系；先核对关系，是否选择其他师父由你决定，不自动解除道侣' }
    ];
  }
  if (/你刚.*师门，需再等待\d+天/.test(text)) {
    return [
      { label: '查看师门历史', command: '/我的师门', description: '按服务端给出的剩余天数等待，再核对拜师资格；提升境界、更换申请对象或重复提交不会跳过等待期' }
    ];
  }
  if (/对方当前可培养徒弟上限为/.test(text)) {
    return [
      {
        label: '查看其他师门参考',
        command: '/圣人榜',
        description: '目标师父当前培养名额已满，等待对方腾出名额或确认其他愿意收徒的师父；提升申请人自己的师德不能增加对方名额'
      }
    ];
  }
  if (/收徒名额已满/.test(text)) {
    return [
      {
        label: '查看本人培养名额',
        command: '/我的师门',
        description: '核对本人师德与在培养的徒弟，按已有师门互动与培养进度安排后续收徒；不把逐出徒弟当作默认恢复步骤'
      }
    ];
  }
  if (/你已向对方发起过拜师申请/.test(text)) {
    return [
      { label: '核对当前师承', command: '/我的师门', description: '等待目标师父在其“同意拜师”列表处理；本人的该列表只显示收到的申请，不是已发送申请列表' }
    ];
  }
  if (/没有来自该修士的拜师申请|拜师申请不存在|使用方法：同意拜师/.test(text)) {
    return [
      {
        label: '刷新收到的拜师申请',
        command: '/同意拜师',
        description: '从本人当前收到的申请选择申请人的UID；列表序号与申请记录ID不能代替徒弟UID，失效的旧申请不能继续同意'
      }
    ];
  }
  if (/叛离师门需要扣除.*修为/.test(text)) {
    return [
      {
        label: '核对当前修为',
        command: '/我的信息',
        description: '按原反馈核对所需扣除与现有修为，再决定是否继续；代价可能随当前境界和培养进度变化，不能把旧金额当作固定报价'
      },
      { label: '查看师门关系与进度', command: '/我的师门', description: '先核对关系和培养进度，再决定继续培养或其他安排；不自动重复叛离扣除' }
    ];
  }
  if (/不能拜自己|使用方法：拜师|未找到.*玩家/.test(text)) {
    return [
      { label: '核对师父人选', command: '/圣人榜', description: '核对其他修士的真实UID、境界及收徒意愿，或直接 @已注册道友；当前拜师接口不能仅凭道号提交' }
    ];
  }
  if (/使用方法：逐出师门/.test(text)) {
    return [{ label: '核对当前徒弟', command: '/我的师门', description: '从本人当前师门核对有效徒弟UID或直接 @对方，再自行决定是否逐出' }];
  }

  return [];
}
