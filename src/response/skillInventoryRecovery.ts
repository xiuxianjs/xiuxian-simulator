import type { RecoveryTip } from './adventureRecovery';

export function skillInventoryRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (operation === 'skill-books.learned' || operation === 'skill-books.hidden') {
    const hidden = operation === 'skill-books.hidden';

    if (/页码超出范围/.test(text)) {
      return [
        {
          label: '返回列表首页',
          command: hidden ? '/我的隐藏功法 1' : '/我的功法 2',
          description: hidden
            ? '隐藏列表从第1页开始，重新读取当前首页，不沿用已越界的页码'
            : '我的功法第1页是装备槽位，实例列表从第2页开始，重新读取列表首页后再翻页'
        }
      ];
    }
    if (hidden && /暂无隐藏功法/.test(text)) {
      return [
        {
          label: '核对可见已学列表',
          command: '/我的功法',
          description: '隐藏列表为空不代表功法丢失，先核对可见列表与当前装备；不要为凑隐藏列表而重复学习、隐藏或购买'
        }
      ];
    }
    if (/可见列表为空/.test(text)) {
      return [
        {
          label: '核对隐藏列表',
          command: '/我的隐藏功法',
          description: '可见列表为空不等于没有已学实例，先核对隐藏列表与当前装备，再决定是否恢复显示，不自动显示或卸下'
        },
        {
          label: '核对未学秘籍',
          command: '/储物袋 功法',
          description: '储物袋秘籍与已学列表不同，先核对本人持有实例及学习状态；确需学习时重新查看学习比较，不直接确认示例编号'
        }
      ];
    }

    return [
      {
        label: '重新读取当前列表',
        command: hidden ? '/我的隐藏功法' : '/我的功法',
        description: '先重新查询当前显示状态与原反馈，查询失败不证明功法丢失、未学或没有装备，不以学习或改显示状态代替查询'
      },
      {
        label: '核对另一显示列表',
        command: hidden ? '/我的功法' : '/我的隐藏功法',
        description: '可见与隐藏列表分别核对，使用当前实例详情决定下一步，服务持续异常时保留原反馈联系运营'
      }
    ];
  }
  if (operation === 'skill-books.wudao') {
    if (/缺少道具[：:]悟道石|悟道石不足/.test(text)) {
      return [
        { label: '核对悟道石', command: '/储物袋', description: '先核对悟道石持有数量与原消耗回执，悟道每次消耗1个；结果不明时不直接重复选择属性' },
        { label: '查询悟道石出售', command: '/珍宝楼', description: '查询是否有悟道石出售，核对价格与需要数量后再决定，不保证当前有货，也不自动购买' }
      ];
    }
    if (/已无可悟道|已达到模板约定上限|已无法提升|当前值为0/.test(text)) {
      return [
        {
          label: '核对功法与其他可选属性',
          command: '/我的功法',
          description: '悟道提升已显现属性的上限，受模板上限和当前属性条件限制；查看当前功法与其他可选属性，不以提升人物境界或补石代替模板上限'
        }
      ];
    }

    return [
      {
        label: '核对已学功法与当前上限',
        command: '/我的功法',
        description: '使用本人已学实例编号，属性以当前悟道候选为准；未知结果先核对当前上限与原回执，不把准备面板当作已扣石或提升成功'
      },
      {
        label: '核对悟道石与原结算',
        command: '/储物袋',
        description: '先核对持有数量和实际结算；配置、服务或传输异常不证明缺石或未消耗，持续异常保留原反馈联系运营，不直接重放消耗'
      }
    ];
  }
  if (operation === 'skill-books.proficiency') {
    if (/熟练点不足/.test(text)) {
      return [
        {
          label: '核对熟练点与当前进度',
          command: '/我的功法',
          description: '对照原回执核对熟练点和功法熟练度，投入次数不保证等量成功；已成功的提升不需重做，结果不明时不重复投入全部点数'
        },
        {
          label: '查看比试用法',
          command: '/比试',
          description: '按比试提示选择对手并核对消耗，实际熟练点奖励以结算为准；明悟丹直接提升符合条件的已装备功法熟练度，最多至60%，不会补充熟练点'
        }
      ];
    }
    if (/熟练度已达圆满/.test(text)) {
      return [
        {
          label: '查看其他功法进度',
          command: '/我的功法',
          description: '该功法已达100%熟练度，无需继续投入熟练点；查看其他已学功法，不用补充点数或明悟丹突破此上限'
        }
      ];
    }

    return [
      {
        label: '核对参悟目标和实际结果',
        command: '/我的功法',
        description: '使用本人已学实例编号或完整名称，最后一项为完整正整数熟练点数或“全部”“所有”；先核对当前熟练度、点数及原回执，结果未知不直接重复投入'
      }
    ];
  }
  if (operation === 'skill-books.batch-learn') {
    if (/取消/.test(text) && !/参数错误/.test(text)) {
      return [
        { label: '核对当前已学功法', command: '/我的功法', description: '取消只结束本次选择，不会撤销已经执行的学习；先核对原结果，不把取消当作回滚或返还' },
        {
          label: '重新查看可学候选',
          command: '/一键学习功法',
          description: '重新打开当前候选预览，仍需你明确确认；它没有固定的限时待确认清单，确认时会重新选择'
        }
      ];
    }

    return [
      {
        label: '核对本次学习与同技能冲突',
        command: '/我的功法',
        description: /同技能/.test(text)
          ? '批量学习跳过已有同技能功法，不会替换、返还或继承；先核对当前已学与装备，确需替换时从秘籍背包查看单本学习比较，不直接重复整批确认'
          : '先核对已学列表与逐本实际结果，部分成功不会因其他条目失败而显示为全部成功；结果不明时不直接重复确认，也不把异常当作未学习'
      },
      {
        label: '核对当前秘籍与保护状态',
        command: '/储物袋 功法',
        description: '核对本人未学实例、锁定和当前数据，批量会按每个技能选择当前最高品级候选；先保护要保留的秘籍，重新预览后再决定，不自动解锁、购买或分解'
      }
    ];
  }
  if (operation === 'skill-books.hide' || operation === 'skill-books.show') {
    if (/使用中的功法无法隐藏/.test(text)) {
      return [
        {
          label: '核对正在使用的功法',
          command: '/我的功法',
          description: '先确认当前装备与功法类型，确需隐藏时自行决定是否换下；不会自动卸下，隐藏也不会分解或返还材料'
        }
      ];
    }

    return [
      {
        label: '核对已学实例与装备',
        command: '/我的功法',
        description: '从本人已学列表核对完整正整数实例编号、类型与装备状态，不用模板编号、页内序号或附加确认文字；隐藏/显示不会重新学习功法'
      },
      {
        label: '核对隐藏列表',
        command: '/我的隐藏功法',
        description: '已隐藏的实例从隐藏列表核对，显示后回到已学列表；已达到目标状态无需重复提交，结果未明时先核对两处列表与原回执'
      }
    ];
  }
  if (operation === 'skill-books.unequip') {
    return [
      {
        label: '核对当前使用的功法',
        command: '/我的功法',
        description: /当前没有使用中的/.test(text)
          ? '该类型当前没有可换下的在用功法，无需重复换下；查看其他类型与已学功法，不以重新购买或重复学习代替装备状态'
          : '先核对当前装备类型和原回执；换下指令不接实例编号或确认参数，换下不等于分解，结果未获确认时不直接重复换下或自动切换其他功法'
      }
    ];
  }
  if (operation === 'skill-books.batch-decompose-query' || operation === 'skill-books.batch-decompose') {
    if (operation === 'skill-books.batch-decompose' && !/没有符合条件|暂无可分解/.test(text)) {
      return [
        {
          label: '核对原范围与当前背包',
          command: '/储物袋 功法',
          description: '分解会删除实例；先核对目标、锁定和已学状态，结果不明时不重复确认或补分解其他功法'
        },
        {
          label: '核对原返还与经验材料',
          command: '/储物袋 材料 经验材料',
          description: '以服务器实际分解数量和返还回执为准，失败提示不证明未删除或未返还，不重复提交补领'
        }
      ];
    }

    return [
      {
        label: '核对可分解的功法',
        command: '/储物袋 功法',
        description: '先核对本人背包、锁定和已学状态；只处理未锁定且未学习的实例，不自动解锁或换下要保留的功法'
      },
      {
        label: '重新查看分解范围',
        command: '/一键分解功法',
        description: '只打开当前可选品级，新预览仍需你确认；确认时重新筛选当前范围，取消或超时后不沿用旧确认，品级配置不一致时保留原回执联系运营'
      }
    ];
  }
  if (!['skill-books.learn', 'skill-books.decompose', 'skill-books.batch-upgrade'].includes(operation)) {
    return [];
  }
  if (/参数错误|ID必须|次数必须|第二个参数/.test(text)) {
    return [
      {
        label: '核对功法实例与用法',
        command: operation === 'skill-books.batch-upgrade' ? '/我的功法' : '/储物袋 功法',
        description: '学习和分解使用本人背包实例编号，升级使用本人已学实例；编号和次数使用完整正整数，不用模板编号或页内序号，也不附多余参数'
      }
    ];
  }
  if (operation === 'skill-books.learn') {
    if (/该功法已经学习/.test(text)) {
      return [
        { label: '查看已学功法', command: '/我的功法', description: '该实例已学，无需再购买或重复学习；从已学列表核对类型和装备状态，再选择当前需要的功法' }
      ];
    }
    if (/功法正在使用中，无法替换/.test(text)) {
      return [
        {
          label: '核对当前装备',
          command: '/我的功法',
          description: '先核对使用中的同技能功法，再自行决定是否按原提示换下；换下后重新比较目标与返还，不直接重复确认，也不自动卸下'
        }
      ];
    }
    if (/当前待学功法品级低于已学功法/.test(text)) {
      return [
        {
          label: '查看已学品级',
          command: '/我的功法',
          description: '当前待学品级更低，确认文字不能绕过此限制；先核对已有功法，不为重复学习继续购买同一低品级秘籍'
        },
        {
          label: '核对可学秘籍',
          command: '/储物袋 功法',
          description: '对照原比较选择其他符合条件的秘籍实例；是否可学由服务器重新检查，不以提升人物境界替代功法品级条件'
        }
      ];
    }
    if (/锁定/.test(text)) {
      return [
        { label: '核对保护状态', command: '/储物袋 功法', description: '先核对实例与锁定原因，确需学习时自行决定是否解锁；不会自动解锁、分解或替换原功法' }
      ];
    }

    return [
      {
        label: '核对秘籍背包',
        command: '/储物袋 功法',
        description: '核对本人持有实例、保护状态和当前详情，数据未就绪时重新打开背包；未找到不等于秘籍被消耗，不重复购买或提交旧编号'
      },
      {
        label: '核对当前已学功法',
        command: '/我的功法',
        description: '学习替换与切换已学功法不同，先回看原比较、旧功法与返还；结果不明时不直接再次确认，失败提示不证明替换未执行'
      }
    ];
  }
  if (operation === 'skill-books.decompose') {
    return [
      {
        label: '核对背包实例与原返还',
        command: '/储物袋 功法',
        description: '核对目标是否仍持有及保护状态；分解会删除实例，结果不明时不重复提交或分解其他实例'
      },
      { label: '核对功法残页', command: '/储物袋 材料 经验材料', description: '先核对原返还回执和当前经验材料，失败提示不证明分解或返还未发生，不重复提交补领' }
    ];
  }

  return [
    {
      label: '核对已学功法进度',
      command: '/我的功法',
      description: '先查看当前升级等级、属性及原回执，部分成功以服务器实际次数和消耗为准，不自动重复整批请求'
    },
    {
      label: '核对升级材料',
      command: '/储物袋 材料 经验材料',
      description: '核对功法经验材料，选择可负担的次数；配置或传输失败不证明缺少材料，持续异常时保留原反馈联系运营'
    },
    { label: '核对灵石', command: '/我的信息', description: '对照实际消耗核对当前资产，结果未确认时不直接继续原数量升级' }
  ];
}
