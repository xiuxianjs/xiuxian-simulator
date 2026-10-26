import type { RecoveryTip } from './adventureRecovery';

const caveCommandStateTips = (): RecoveryTip[] => [
  {
    label: '核对本次回执与当前灵田',
    command: '/灵田',
    description: '先核对回执中的已完成项目、地块与当前作物；刷新失败不代表操作回滚，结果未知时也不能断定未执行，不重放整批开垦、播种、收割或加速'
  },
  {
    label: '核对当前材料与收获',
    command: '/储物袋',
    description: '按原回执核对消耗与收获，作物成熟时间以最新面板为准；不重复购买或补领，持续异常保留原反馈联系运营'
  }
];

/** Read-only recovery paths for the cave service's own plot and crop refusals. */
export function caveRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (operation.startsWith('cave-formations.')) {
    if (operation === 'cave-formations.list') {
      return [
        {
          label: '核对当前灵田',
          command: '/灵田',
          description: '阵法查询失败或暂无生效阵法时，先核对灵田当前状态；空列表不证明阵盘丢失，不据此重复激活、购买或移除'
        },
        {
          label: '查看持有阵盘',
          command: '/储物袋 道具 其它 洞府阵法',
          description: '背包阵盘与已生效阵法分别核对；持续查询异常保留原反馈联系运营，不把查询失败当作阵法已失效'
        }
      ];
    }
    if (operation === 'cave-formations.activate' && /用法：|关键词不能为空|未找到可激活|不是可激活|不是有效的洞府阵盘/.test(text)) {
      return [
        {
          label: '核对可用阵盘',
          command: '/储物袋 道具 其它 洞府阵法',
          description: '从本人背包核对阵盘完整名称或模板编号，再按原用法激活；别名可识别也需实际持有阵盘，灵田序号不能替代模板编号，不代选默认阵盘'
        },
        { label: '核对生效阵法', command: '/洞府阵法', description: '移除先查看当前生效的阵法类别与名称；同类操作可能影响该类别当前阵法，不盲目重放旧名称' }
      ];
    }
    if (/你当前没有【/.test(text)) {
      return [
        {
          label: '核对阵盘库存',
          command: '/储物袋 道具 其它 洞府阵法',
          description: '按原缺失名称核对持有阵盘；每次激活都会消耗阵盘，同类刷新或替换重新计时，持续时间不与旧阵叠加'
        },
        { label: '查询万宝楼', command: '/商店 万宝楼', description: '查询需要的阵盘是否在售，先核对库存和价格再决定购买，不保证有货或自动补充' }
      ];
    }
    if (/用法：|关键词不能为空|未找到可移除|没有生效中的/.test(text)) {
      return [
        {
          label: '核对当前生效阵法',
          command: '/洞府阵法',
          description: '核对当前阵法类别、名称与剩余时间；已失效或已移除时无需重复移除，移除不会返还已用阵盘，不为移除操作重新购买阵盘'
        }
      ];
    }

    return [
      {
        label: '核对阵法与原回执',
        command: '/洞府阵法',
        description: '先核对当前生效阵法、剩余时间及原回执；结果未知不证明未消耗或未生效，不直接重复激活或移除'
      },
      {
        label: '核对阵盘库存',
        command: '/储物袋 道具 其它 洞府阵法',
        description: '核对当前持有量与原操作；服务或配置异常不靠继续购买解决，持续异常保留原反馈联系运营'
      }
    ];
  }
  if (/^cave\.(?:view|visit|nearby|logs)$/.test(operation)) {
    if (/尚未开始灵药师指引|灵药师尚未入门/.test(text)) {
      return [
        {
          label: '核对灵药师指引',
          command: '/我的职业',
          description: '先查看本人职业与指引进度，再按原入口继续灵药师指引；职业进度与人物境界分别核对，不通过购买灵种或重复开垦代替入门'
        }
      ];
    }
    if (/请输入目标UID|未找到目标道友|目标参数无效/.test(text)) {
      return [
        {
          label: '核对访问对象',
          command: '/我的好友',
          description: '从当前列表核对目标UID或真实提及对象，再查看该道友；不使用示例编号，也不把未找到目标当作本人灵田丢失'
        }
      ];
    }
    if (/未找到这块灵田/.test(text)) {
      return [
        { label: '核对当前地块编号', command: '/灵田', description: '从当前灵田面板重新选择地块和已开放操作；旧详情编号不代表地块仍可用，不直接开垦或购买物资' }
      ];
    }
    if (/当前只显示访问概览|可见地块列表为空/.test(text)) {
      return [
        {
          label: '核对关系与可见范围',
          command: '/我的好友',
          description: '按服务返回的关系权限查看原目标；不能查看地块不代表目标没有灵田，隐息导致灵气不可见也不等于零产出，不自动加好友、改变关系或偷药绕过权限'
        },
        { label: '返回本人灵田', command: '/灵田', description: '目标未返回可查看地块时，先安排本人灵田；不把目标的可见范围当成本人的境界、材料或收获条件' }
      ];
    }
    if (/附近灵田列表为空/.test(text)) {
      return [
        {
          label: '从好友核对目标',
          command: '/我的好友',
          description: '附近为空仅表示本次列表未返回目标，不等于全服无人或本人没有灵田；可按当前好友UID查看，不自动提交协作或偷药'
        }
      ];
    }
    if (/当前页没有灵田记录/.test(text)) {
      return [
        {
          label: '核对当前灵田与原回执',
          command: '/灵田',
          description: '当前页未返回记录不证明之前操作未发生、未消耗或已返还；先核对当前作物与原回执，不重放批量操作补领'
        }
      ];
    }
    if (/查询结果未获完整确认|获取.*(?:洞府|灵田|记录).*失败/.test(text)) {
      return [
        {
          label: '核对人物与查询条件',
          command: '/我的信息',
          description: '核对本人当前境界和原查询目标；读取失败不证明灵田、库存或职业进度已清空，不据此重复领取、购买或改变关系'
        },
        {
          label: '核对职业与原操作进度',
          command: '/我的职业',
          description: '查看本人职业和已有指引进度，稍后重新查看；持续异常保留原反馈联系运营，不将配置或服务异常归因于材料不足'
        }
      ];
    }

    return [];
  }
  const ownCommand = /^cave\.(?:cultivate|plant|water|worm|weed|harvest|upgrade|accelerate)$/.test(operation);

  if (ownCommand && /结果未获完整确认|无法刷新灵田|无法读取下一次播种选项|灵田状态未获完整确认/.test(text)) {
    return caveCommandStateTips();
  }
  if (!operation.startsWith('cave.') || /数据异常|未配置|配置缺失|数据库升级|响应不完整/.test(text)) {
    return ownCommand ? caveCommandStateTips() : [];
  }
  const social = operation === 'cave.collaborate' || operation === 'cave.steal' || operation === 'cave.companion-tend-all';

  if (social) {
    if (/自己的灵田请直接操作|不能对自己的灵田/.test(text)) {
      return [{ label: '查看本人灵田', command: '/灵田', description: '目标是本人，直接从自己的灵田选择照料或收割入口，无需使用对他人的协作或偷药动作' }];
    }
    if (/当前没有道侣/.test(text)) {
      return [
        {
          label: '核对当前道侣关系',
          command: '/我的道侣',
          description: '照料道侣灵田需要当前仍有效的道侣关系；先查看关系状态，不重复提交旧道侣的代收割或自动建立关系'
        }
      ];
    }
    if (/道侣之间不能互相偷药/.test(text)) {
      return [
        { label: '核对当前道侣关系', command: '/我的道侣', description: '核对当前关系与可用互动；道侣可按实际需求照料或代收割，不通过解除关系绕过偷药限制' }
      ];
    }
    if (/只有好友或道侣|好友不能代为收割/.test(text)) {
      return [
        {
          label: '核对协作关系',
          command: '/我的好友',
          description: '核对本人和目标的好友/道侣关系；好友只能照料，收割由主人或道侣执行，不重复提交无权限的代收割'
        }
      ];
    }
    if (/你今日成功偷药次数已达上限/.test(text)) {
      return [{ label: '查看本人灵田安排', command: '/灵田', description: '本人今日成功次数已用尽，等待每日额度恢复；切换目标或补材料不能增加今日次数' }];
    }
    if (/对方今日已被成功偷药过|今日已对该道友发起过偷药/.test(text)) {
      return [
        {
          label: '核对已有互动记录',
          command: '/灵田记录',
          description: '本次受目标当日保护或本人对该目标的当日尝试限制；等待每日限制恢复，不重复尝试同一目标，也不把失败当成未发生过尝试'
        }
      ];
    }
    if (/对方当前没有.*(?:异常灵田|成熟灵植)|当前没有可收割的成熟灵植|收割：暂无成熟灵植/.test(text)) {
      return [
        {
          label: '核对目标与当前状态',
          command: operation === 'cave.companion-tend-all' ? '/我的道侣' : '/我的好友',
          description: '这是目标灵田的作物或照料状态；查看原目标当前异常和成熟情况，暂不重复操作，不让本人补材料或提升境界代替目标条件'
        }
      ];
    }
    if (/格式错误|灵田互动参数无效/.test(text)) {
      return [{ label: '核对互动对象', command: '/我的好友', description: '从当前列表核对目标 UID，按原格式选择地块和动作，不使用示例编号反复提交' }];
    }
    if (/操作失败，请稍后重试/.test(text)) {
      return [
        {
          label: '核对本次已完成结果',
          command: operation === 'cave.companion-tend-all' ? '/我的道侣' : '/灵田记录',
          description: '先保留并核对已完成项目及原回执；部分失败不代表整批回滚，不自动重放整批照料或代收割'
        }
      ];
    }

    return [];
  }
  if (operation === 'cave.tend-all' && /操作失败，请稍后重试/.test(text)) {
    return [
      { label: '核对已完成的灵田操作', command: '/灵田', description: '保留已完成照料和收割结果，部分失败不等于整批回滚；先检查当前灵田，不自动重放整批操作' }
    ];
  }
  if (/小绿瓶不足/.test(text)) {
    return [
      { label: '核对小绿瓶数量', command: '/我的信息', description: '小绿瓶是个人资源，先查看当前持有数量；按实际可用数量安排，不只按背包物品判断' },
      { label: '查看灵田加速条件', command: '/灵田', description: '核对该轮剩余加速额度和成熟时间，补充资源不能绕过本轮上限' }
    ];
  }
  if (/材料不足|灵种数量不足|灵肥不足/.test(text)) {
    return [
      { label: '核对灵田与消耗', command: '/灵田', description: '核对地块、所需材料和当前可用数量；批量操作先确认总消耗，按实际需要补足，不重复提交整批操作' },
      { label: '查看现有物资', command: '/储物袋', description: '按原提示的缺失名称和数量核对背包，购买前查看具体来源及是否有货' }
    ];
  }
  if (/灵药师阶段无法继续升级/.test(text)) {
    return [
      {
        label: '核对灵药师成长',
        command: '/我的职业',
        description:
          '查看灵药师阶段及可用灵田品阶；收割成熟灵植可积累职业经验，是否还能进阶以职业面板为准。职业成长与人物境界不同，不只提升人物境界或反复购买灵土'
      }
    ];
  }
  if (/尚未解锁|当前没有可开垦的灵田/.test(text)) {
    return [{ label: '查看地块解锁状态', command: '/灵田', description: '从当前面板核对已解锁和可开垦地块及职业条件，未解锁的编号不能直接开垦' }];
  }
  if (/尚未开垦|已经开垦完成|当前没有可升级的灵田/.test(text)) {
    return [
      { label: '核对地块状态', command: '/灵田', description: '先查看指定地块是否已开垦及当前品阶，按面板提供的可用操作继续，不重复开垦或升级不可用地块' }
    ];
  }
  if (/已种有|没有可播种的空闲灵田/.test(text)) {
    return [
      { label: '查看作物与空闲地块', command: '/灵田', description: '已种作物不能被新播种覆盖；查看成熟时间和空闲地块，成熟后自行决定收割，再安排下一轮播种' }
    ];
  }
  if (/没有可收割的成熟灵植/.test(text)) {
    return [{ label: '查看成熟状态', command: '/灵田', description: '查看当前作物和成熟时间；未成熟时先按实际异常照料，成熟后再收割，不连续重复领取' }];
  }
  if (/没有可照料的未成熟作物|没有可处理的对应异常灵田/.test(text)) {
    return [
      { label: '查看当前照料需求', command: '/灵田', description: '只处理面板当前存在的干旱、虫害或杂草；没有对应异常无需重复照料，成熟作物可按面板收割' }
    ];
  }
  if (/本轮普通加速次数已用完|本轮最多可使用.*加速道具/.test(text)) {
    return [
      {
        label: '查看本轮加速状态',
        command: '/灵田',
        description: '本轮普通加速额度已用尽，购买更多道具不能增加额度；查看成熟时间，其他方式能否使用以当前预览能力为准'
      }
    ];
  }
  if (/24小时内已使用立即催熟/.test(text)) {
    return [{ label: '核对催熟冷却', command: '/灵田', description: '查看该地块的下次催熟时间；等待冷却恢复，不通过补充灵石或重复催熟绕过限制' }];
  }
  if (/冻结阵法生效中/.test(text)) {
    return [{ label: '查看生效阵法', command: '/洞府阵法', description: '核对冻结阵法和有效期；是否解除由你决定，解除后再查看加速预览，不自动移除阵法' }];
  }
  if (/没有可加速的(?:未成熟)?灵植|没有可加速的未成熟灵植/.test(text)) {
    return [
      { label: '核对作物生长状态', command: '/灵田', description: '先查看是否有已播种且未成熟的作物；空地先安排播种，成熟作物查看收割入口，无需再购买加速物资' }
    ];
  }
  if (/未识别该灵种名称/.test(text)) {
    return [{ label: '查看可用灵种', command: '/播种', description: '从服务器当前灵种列表选择有效名称，核对数量和可播种地块后再决定播种' }];
  }
  if (/灵田参数格式错误|未找到对应灵田地块|(?:灵田操作|播种灵田)参数无效|请指定灵田编号|请选择使用/.test(text)) {
    return [
      { label: '从当前灵田选择', command: '/灵田', description: '从当前面板选择有效地块编号和可用动作；加速先查看该地块预览，再按实际可用方式和数量决定' }
    ];
  }

  return [];
}

/** Command may return a successful envelope containing an acceleration refusal or a partial receipt. */
export function caveAccelerationReceiptTips(text: string, count: string | null = null, accelerator: string | null = null): RecoveryTip[] {
  const partial = /（(.+)，实际消耗 \d+ 次）$/.exec(text);

  if (partial) {
    const tips: RecoveryTip[] = [];
    const reasons = partial[1];

    if (reasons.includes('已达加速次数上限')) {
      tips.push({
        label: '核对本轮已用额度',
        command: '/灵田',
        description: '保留本次实际消耗和缩短时间；普通加速已到本轮上限，购买更多同类道具不能补做剩余请求，其他方式以新预览为准'
      });
    }
    for (const reason of ['灵肥不足', '小绿瓶不足']) {
      if (reasons.includes(reason)) {
        tips.push(...caveRecoveryTips('cave.accelerate', reason));
      }
    }
    if (reasons.includes('作物即将成熟')) {
      tips.push({
        label: '查看最新成熟状态',
        command: '/灵田',
        description: '本次只消耗实际需要的次数；作物即将成熟，不为凑满原请求继续购买或重复加速，先核对成熟时间和收割入口'
      });
    }
    if (!tips.length) {
      tips.push(...caveCommandStateTips());
    }

    return tips.filter((tip, index) => tips.findIndex(other => other.command === tip.command && other.description === tip.description) === index);
  }
  if (
    /^(当前没有可加速|该灵植数据异常|该灵种本轮最多可使用|灵肥不足|小绿瓶不足|本轮普通加速次数已用完|灵石不足|冻结阵法生效中|该地块24小时内已使用立即催熟|请选择使用【)/.test(
      text
    )
  ) {
    if (/^灵石不足/.test(text)) {
      return [
        {
          label: '核对灵石与当前报价',
          command: '/我的信息',
          description: '核对本人可用灵石，再查看原地块的新加速报价和可用次数；减少数量不能绕过本轮额度、催熟冷却或冻结阵法'
        }
      ];
    }

    return caveRecoveryTips('cave.accelerate', text);
  }
  if (Number(count) > 1 && (accelerator === 'spiritStone' || accelerator === 'ripen') && /^第\d+块灵田(?:缩短\d+分钟|已成熟，可前往收获)/.test(text)) {
    return [
      {
        label: '核对实际加速结果',
        command: '/灵田',
        description: '本次以回执实际缩短时间、灵石消耗和成熟状态为准，不能把请求次数当作全部已完成；先查看最新额度和成熟情况，不推测未返回的停止原因或重复补做'
      }
    ];
  }

  return [];
}
