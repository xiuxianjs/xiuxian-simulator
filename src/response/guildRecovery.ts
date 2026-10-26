import type { RecoveryTip } from './adventureRecovery';

/** Preserve the member/applicant distinction in guild membership and role refusals. */
export function guildRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (!operation.startsWith('guild.')) {
    return [];
  }
  if (operation.startsWith('guild.storyline-')) {
    if (/今日宗门主线已全部通关|当前宗门尚未解锁第.*关奖励|奖励已领取|当前没有可领取的宗门主线奖励|关卡序号必须是/.test(text)) {
      return [
        {
          label: '核对宗门主线奖励',
          command: '/宗门主线',
          description: '查看当前已解锁、已领取与可领取关卡；已领取不能重复到账，未解锁奖励不能靠重复领取开放，先按实际进度安排'
        }
      ];
    }
    if (/今日宗门主线挑战次数已达上限/.test(text)) {
      return [
        {
          label: '查看当前主线进度',
          command: '/宗门主线',
          description: '本人今日挑战次数已用尽，等待每日次数恢复；其他成员的累计伤害仍以宗门当前进度为准，不自动重试或切换身份'
        },
        { label: '核对本人挑战记录', command: '/宗门主线记录', description: '核对已结算次数、伤害与原回执，次数用尽不代表已经提交的伤害未计入' }
      ];
    }
    if (/配置缺失|配置不存在|关卡血量异常/.test(text)) {
      return [
        {
          label: '核对主线当前状态',
          command: '/宗门主线记录',
          description: '当前关卡或配置异常不能靠补材料和重复挑战解除；先保留原回执并核对已有记录，等待状态恢复，不重新发起同一结算'
        }
      ];
    }
  }
  if (operation.startsWith('guild.shop') && /商店数据异常，请宗主或副宗主刷新商店/.test(text)) {
    return [
      {
        label: '核对宗门商店状态',
        command: '/我的宗门',
        description: '先由具备权限的宗主或副宗主核对异常并决定是否刷新；保留原兑换回执，不按旧商品编号重试，也不自动扣贡献刷新'
      }
    ];
  }
  if (/未初始化|未配置|配置不存在|配置异常|数据异常/.test(text)) {
    return [];
  }
  if (/升级配置不可达/.test(text)) {
    return [
      {
        label: '核对宗门等级与配置',
        command: '/我的宗门',
        description: '当前等级的资源容量无法容纳下一等级所需费用，需要核对升级配置；继续攒资源或补个人余额不能解除容量限制，不重复提交升级'
      }
    ];
  }
  if (/宗门(?:等级|灵脉|商店)已达上限/.test(text)) {
    return [
      {
        label: '查看当前宗门能力',
        command: '/我的宗门',
        description: '当前没有可继续升级的下一等级，按已开放能力安排；继续积累资源不能自行开放新等级，不反复消耗尝试'
      }
    ];
  }
  if (/(?:灵脉|商店)等级已达到当前宗门等级上限/.test(text)) {
    return [
      {
        label: '核对宗门等级上限',
        command: '/我的宗门',
        description: '先核对宗门等级允许的灵脉/商店上限，再由有权限成员查看宗门升级条件；补充材料不能直接绕过当前等级限制'
      }
    ];
  }
  if (/宗门灵脉未解锁|宗门灵脉尚未开启/.test(text)) {
    return [
      {
        label: '查看灵脉开放条件',
        command: '/我的宗门',
        description: '核对宗门等级和灵脉开放状态，由有权限成员决定建设；未开放时不能直接升级灵脉，不自动扣除资源'
      }
    ];
  }
  if (operation.startsWith('guild.red-packet-')) {
    const mine = operation === 'guild.red-packet-recycle';

    if (mine && /没有执行该操作的权限/.test(text)) {
      return [
        {
          label: '查看本人发出的红包',
          command: '/我发的红包',
          description: '只有原发送者可以回收该红包，宗门职位不能替代发送者身份；从本人列表核对目标，不重试他人的回收操作'
        }
      ];
    }
    if (/你没有红包道具/.test(text)) {
      return [
        { label: '核对红包道具', command: '/储物袋', description: '发送需消耗红包道具，先核对持有数量；余额充足不能替代道具，购买前查看实际来源与是否有货' }
      ];
    }
    if (operation === 'guild.red-packet-send' && /余额不足|贡献点不足/.test(text)) {
      return [
        {
          label: '核对发送资金',
          command: /贡献点/.test(text) ? '/宗门日常' : '/我的信息',
          description: '发送前需要持有份数乘以每份金额的全额；发送者自动领一份在扣款之后，不能只准备净支出，也不自动更换货币'
        },
        { label: '先核对已发记录', command: '/我发的红包', description: '先确认此前是否已发送成功，再决定是否调整份数与每份金额；不因请求失败自动重复发送' }
      ];
    }
    if (/无效的(?:货币类型|份数|金额)|红包货币、份数或金额无效/.test(text)) {
      return [{ label: '查看发红包用法', command: '/发红包', description: '核对当前支持的货币、份数和每份金额及总额；从用法重新选择，不直接使用无效参数发送' }];
    }
    if (/红包尚未过期/.test(text)) {
      return [
        {
          label: '核对本人红包到期时间',
          command: '/我发的红包',
          description: '仅未领取的剩余余额在符合到期条件后可回收；按原红包到期时间等待，不提前回收或反复提交'
        }
      ];
    }
    if (/红包已回收/.test(text)) {
      return [{ label: '核对原回收记录', command: '/我发的红包', description: '核对红包回收状态及此前到账回执；已回收不能再次退款，不用重复请求增加返还' }];
    }
    if (/红包不存在|红包已过期|红包已被领完|已领取过此红包|红包 ?ID 无效|请输入有效的红包编号/.test(text)) {
      return [
        {
          label: mine ? '核对本人红包' : '查看当前红包',
          command: mine ? '/我发的红包' : '/宗门红包',
          description: mine
            ? '核对本人红包的到期、已领金额和回收状态；已领完没有剩余可退，不按旧编号反复回收'
            : '从本宗门当前列表核对有效编号、到期与领取状态；已领取、领完或失效不能重复到账，先保留原回执'
        }
      ];
    }
  }
  if (/贡献点不足/.test(text)) {
    return [
      {
        label: '查看贡献与日常',
        command: '/宗门日常',
        description: '核对现有贡献及尚未完成的签到、已可结算采矿等任务；这些有效结算可获得贡献，先查看当前资格，不把重复领取当作贡献来源'
      },
      { label: '查看周常与奖励', command: '/宗门周常', description: '查看当前进度与可领取奖励；祭祀和兑换有消耗，先核对成本与收益，不为补贡献盲目反复兑换' }
    ];
  }
  if (/宗门商店未开放|宗门商店未解锁|宗门商店尚未开启|锻造耗材位需宗门商店二级解锁/.test(text)) {
    return [
      {
        label: '核对宗门商店等级',
        command: '/我的宗门',
        description: '查看宗门等级、商店等级和开放条件；本人境界不能替代宗门等级，已升级时由有权限成员核对刷新后的商品，不自动升级或刷新扣费'
      }
    ];
  }
  if (/商店暂无商品|今日商店刷新次数已用尽/.test(text)) {
    return [
      {
        label: '核对商店当前状态',
        command: '/我的宗门',
        description: '查看当前宗门及商店开放情况；无商品时由宗主或副宗主决定是否刷新，今日刷新次数用尽则等待恢复，不自动重复扣贡献刷新'
      }
    ];
  }
  if (/该商品已经兑换|宗门商品不存在|商品编号无效/.test(text)) {
    return [
      {
        label: '重新查看宗门商品',
        command: '/宗门商店',
        description: '核对当前库存、已兑换标记和本次列表编号，刷新后编号可能变化；不要按旧编号重复兑换，不把重试当作额外购买'
      }
    ];
  }
  if (/宗门灵石不足|宗门资源不足/.test(text)) {
    return [
      {
        label: '查看宗门资源',
        command: '/我的宗门',
        description: '核对宗门资源与本次所需支出，这是宗门资金条件，不等同本人灵石余额；不自动扣个人资产或重放领取/升级'
      },
      {
        label: '查看有效资源任务',
        command: '/宗门日常',
        description: '资格允许时，签到增加宗门声望、采矿结算补充宗门灵石；先核对任务状态与宗门容量，已完成或未到结算时间时不能重复获得'
      }
    ];
  }
  if (/宗门灵脉未开放|当前灵脉等级无法采矿/.test(text)) {
    return [
      { label: '核对灵脉开放条件', command: '/我的宗门', description: '查看宗门等级与灵脉状态；由具备权限的成员决定建设，不能只补充个人材料或反复开始采矿' }
    ];
  }
  if (/你今天已经签到过了|今日已完成祭祀祖师/.test(text)) {
    return [
      {
        label: '查看今日剩余任务',
        command: '/宗门日常',
        description: '本项今日已完成，先核对结算和其他未完成任务；等待下一周期，不重复签到或祭祀，不额外消耗祭祀货币'
      }
    ];
  }
  if (operation === 'guild.worship' && /不足，祭祀需要消耗/.test(text)) {
    return [
      { label: '核对当前资产', command: '/我的信息', description: '按原提示核对祭祀货币及所需数量，不用其他货币余额代替该项消耗' },
      { label: '查看祭祀方案', command: '/祭祀祖师', description: '先查看各方案的真实消耗与今日资格，再决定是否使用可负担的方案，不自动改用另一种货币' }
    ];
  }
  if (/当前职位没有宗门俸禄/.test(text)) {
    return [
      { label: '核对职位与俸禄资格', command: '/我的宗门', description: '查看当前职位资格，无俸禄的职位不能靠补材料或重复领取获得；不自动任命或承诺升职' }
    ];
  }
  if (/本周活跃度未达|本周俸禄已领取/.test(text)) {
    return [
      {
        label: '查看本周进度与俸禄',
        command: '/宗门周常',
        description: '核对本周活跃与领取状态；未达标时查看签到、采矿和兑换等有效任务及消耗，已领取则等待下一周期，不重复发放'
      }
    ];
  }
  if (operation.startsWith('guild.milestone-') && /活跃度不足|奖励已领取|没有可领取的|里程碑不存在或未启用|Invalid parameter milestoneId/.test(text)) {
    return [
      {
        label: '查看日活奖励状态',
        command: '/宗门日常',
        description: '从当前面板查看日活进度、奖励编号与已领取状态；已领取不能重复领取，未达标先完成仍有效的任务'
      },
      { label: '查看周活奖励状态', command: '/宗门周常', description: '周活与日活条件分别计算，按原奖励所属周期核对，不能用另一周期的活跃代替' }
    ];
  }
  if (/申请人处于退出宗门冷却期|申请人已加入其他宗门/.test(text)) {
    return [
      {
        label: '核对审核结果',
        command: '/宗门审核',
        description: '限制属于申请人；服务端已按当前状态自动拒绝该申请，先查看剩余待审列表，不重复审核旧申请，也不让审核者退宗或提升境界代替申请人条件'
      }
    ];
  }
  if (/宗门人数已满/.test(text)) {
    return operation === 'guild.apply'
      ? [{ label: '查看其他宗门', command: '/宗门列表', description: '目标宗门当前没有空位，可查看其他宗门或等待名额变化；提升本人境界不能增加该宗门名额' }]
      : [
          {
            label: '核对成员与容量',
            command: '/宗门成员列表',
            description: '查看当前成员与宗门容量；审核入口可能已将本次申请拒绝，先核对审核结果，不反复同意旧申请，也不自动踢人腾位'
          }
        ];
  }
  if (/待审核申请已达上限|已经申请过该宗门/.test(text)) {
    return [
      {
        label: '查看本人申请',
        command: '/我的申请',
        description: '核对已提交且仍待审核的申请，等待原申请处理；确需调整时由你决定撤回哪条，不自动取消或重复申请'
      }
    ];
  }
  if (/申请记录不存在或已处理|取消宗门申请参数无效/.test(text)) {
    return [{ label: '刷新本人申请', command: '/我的申请', description: '从本人当前申请记录选择有效编号，已处理记录不能再次取消，先核对最终状态' }];
  }
  if (/未找到该玩家的待审核申请|不能审核自己的入宗申请/.test(text)) {
    return [
      { label: '刷新待审核列表', command: '/宗门审核', description: '选择本宗门当前待审核的其他玩家，核对申请是否仍有效；不能审核本人，不猜测或重复提交旧目标' }
    ];
  }
  if (/尚未加入宗门|(?:还没有|还未|没有)加入(?:任何)?宗门/.test(text)) {
    return [{ label: '查看可申请宗门', command: '/宗门列表', description: '先查看宗门要求与名额，再决定提交申请；提交后仍需审核，申请成功不等于已成为成员' }];
  }
  if (/(?:已经|已)加入宗门/.test(text)) {
    return [{ label: '查看当前宗门', command: '/我的宗门', description: '核对本人当前归属与职位，已有成员身份无需重复创建或申请，不为重试自动退出当前宗门' }];
  }
  if (/宗门名称(?:需为|只能包含|已存在|包含不适当)/.test(text)) {
    return [
      {
        label: '查看现有宗门名称',
        command: '/宗门列表',
        description: '核对现有名称，按原提示选择符合长度和字符要求的合适名称；名称被占用或不适当时由你重新命名，不自动创建或随机替换名称'
      }
    ];
  }
  if (/宗主转让冷却中|本周已经请过假|正在请假中/.test(text)) {
    return [
      {
        label: '核对当前宗门状态',
        command: '/我的宗门',
        description: '按原提示的剩余时间、请假有效期或下次开放日期等待，再核对可用操作；不重复提交或用换目标绕过冷却'
      }
    ];
  }
  if (/只有宗主|没有执行该操作的权限|只能任命比自己/.test(text)) {
    return [
      {
        label: '核对本人宗门职位',
        command: '/我的宗门',
        description: '查看本人职位与当前权限要求，让具备权限的成员自行决定；任命时还须核对目标及可授予职位，不通过重复提交或提升人物境界绕过权限'
      }
    ];
  }
  if (/职位未开放/.test(text)) {
    return [
      { label: '查看宗门等级条件', command: '/我的宗门', description: '职位开放由宗门等级决定，核对宗门等级及可用职位；本人境界或灵石不能直接替代宗门等级条件' }
    ];
  }
  if (/名额已满|目标成员不在.*宗门|不能转让给自己|不能踢出自己|宗门中没有其他成员|没有可继任成员|没有合适的继任者|没有合适的代理人/.test(text)) {
    return [
      {
        label: '核对宗门成员状态',
        command: '/宗门成员列表',
        description: '从本宗门当前成员核对目标、职位名额与继任/代理资格；没有合适成员时不能强行转让或请假，不自动踢人、退宗或解散'
      }
    ];
  }
  if (/不允许被更新职位|已经是弟子，无需卸任|已经是.*(?:宗主|长老|弟子)/.test(text)) {
    return [
      {
        label: '查看成员当前职位',
        command: '/宗门成员列表',
        description: '核对成员现职与当前参赛等限制；已达目标状态无需重做，受限时先等待限制解除，不自动退赛或换人执行'
      }
    ];
  }
  if (/编号无效，请输入/.test(text) && operation === 'guild.leadership-transfer') {
    return [
      {
        label: '刷新转让候选列表',
        command: '/宗主转让',
        description: '重新查看服务端当前候选列表；候选序号不等同玩家 UID，先核对姓名和职位，再由你决定是否发起新的转让预览'
      }
    ];
  }
  if (/职位(?:【.*】)?不存在/.test(text)) {
    return [{ label: '查看当前可用职位', command: '/宗门改职', description: '从当前可用职位和成员选择有效职务名称，不继续提交不存在的职位' }];
  }

  return [];
}
