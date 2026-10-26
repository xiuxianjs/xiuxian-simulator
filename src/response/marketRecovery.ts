import type { RecoveryTip } from './adventureRecovery';

/** Recovery navigation for the market's existing server refusal/message contract. */
export function marketRecoveryTips(operation: string, text: string): RecoveryTip[] {
  if (!operation.startsWith('market.') || /服务未启用|规则加载失败|响应不完整|配置.*(?:异常|缺失)/.test(text)) {
    return [];
  }
  if (operation === 'market.purchase' && /目标\d+个，实际购得\d+个，缺货\d+个|系统收回\d+个低价挂单物品/.test(text)) {
    return [
      {
        label: '核对本次交易记录',
        command: '/我的交易记录',
        description: '按原回执核对实际到账、扣款和系统回收；未买齐不等于整笔未发生，不自动补买剩余数量或重放同一购买'
      },
      { label: '查看当前挂单', command: '/珍宝楼', description: '剩余需求先核对当前库存、价格和额度，再自行决定新购买，不用原预览数量替代实际到账数量' }
    ];
  }
  if (/今日购买额度不足/.test(text)) {
    return [
      {
        label: '查看当前购买额度',
        command: '/珍宝楼',
        description: '核对今日已用与剩余额度；按剩余额度决定数量或等待每日恢复，补灵晶不能增加今日额度，不切换挂单绕过限制'
      }
    ];
  }
  if (/灵晶不足/.test(text)) {
    return [
      {
        label: '核对个人灵晶',
        command: '/我的信息',
        description:
          operation === 'market.sell'
            ? '上架需要支付手续费，核对灵晶和当前数量、单价对应的费用；不把售出后收益当作已可支付的手续费，不重复上架扣费'
            : '核对实际需要的灵晶与当前余额，再查看最新价格和数量；不能用灵石余额代替灵晶，不自动重复确认或更换货币'
      }
    ];
  }
  if (/商品仍在公示期/.test(text)) {
    return [{ label: '查看当前公示状态', command: '/珍宝楼', description: '等待原挂单公示结束再核对可购买状态；重复确认、改数量或补资金不能绕过公示期' }];
  }
  if (/上架锁定中/.test(text)) {
    return [
      { label: '核对本人挂单锁定时间', command: '/我的上架', description: '按原提示的剩余秒数和列表状态等待，锁定解除后再决定下架；不重复撤单或自动改价重挂' }
    ];
  }
  if (/上架中的物品最多/.test(text)) {
    return [
      { label: '管理本人上架', command: '/我的上架', description: '核对当前占用的挂单及锁定状态，由你决定是否下架不需要的物品；不自动撤单腾位或反复扣费尝试' }
    ];
  }
  if (/只能下架自己的物品|不能购买自己的挂单/.test(text)) {
    return [
      {
        label: '核对本人挂单',
        command: '/我的上架',
        description: '查看本人所有的挂单；下架仅能操作自己的物品，自己的挂单不能买回，不通过改变身份或重复请求绕过'
      }
    ];
  }
  if (/该上架已下架或已售罄|上架不存在或已删除|挂单资产不存在或状态已变化/.test(text)) {
    const buying = operation === 'market.purchase';

    return [
      {
        label: '核对上架与成交状态',
        command: buying ? '/珍宝楼' : '/我的上架',
        description: buying
          ? '购买目标的挂单或卖家资产状态已变化，先核对当前挂单和原回执；不让买家补充自己的背包代替卖家资产，也不重复确认旧挂单'
          : '先核对旧挂单是否已下架、成交或资产发生变化，保留原回执；不把缺少旧挂单当作物品丢失而重复上架'
      },
      { label: '核对已有交易', command: '/我的交易记录', description: '查看已完成成交，结合本人挂单与原下架回执确认资产去向，再决定新操作，不重复扣款' }
    ];
  }
  if (/库存不足|没有可购买的挂单|挂单不可用/.test(text)) {
    return [
      {
        label: '重新查看可用挂单',
        command: '/珍宝楼',
        description: '库存和挂单状态可能已变化，重新核对现有数量与价格；确需减少数量时由你决定，不沿用旧确认盲目重试'
      }
    ];
  }
  if (/信誉分未达标/.test(text)) {
    return [
      {
        label: '查看交易信誉',
        command: '/信誉分',
        description: '核对当前综合信誉明细与交易资格；信誉限制不能靠解除物品锁定绕过，不承诺充值或反复成交必定解除限制'
      }
    ];
  }
  if (/不可交易|物品被锁定或数量不足|物品分类不匹配/.test(text)) {
    return [
      {
        label: '核对背包物品状态',
        command: '/储物袋',
        description: '核对本人持有数量、分类、装备/学习/锁定状态及交易许可；解锁不保证可交易，是否卸下或解锁由你决定，不自动操作'
      },
      {
        label: '查看当前可上架物品',
        command: '/交易上架',
        description: '从服务器当前可交易列表选择有效背包记录；模板编号与本人实例编号不能混用，不重复提交旧资产'
      }
    ];
  }
  if (/单价须在|单次上架数量最多|独立资产仅支持单件|交易所只允许使用灵晶|数量或单价无效|交易上架参数无效/.test(text)) {
    return [
      {
        label: '重新查看上架规则',
        command: '/交易上架',
        description: '从当前分类和物品入口核对允许单价、数量及灵晶手续费；独立资产按单件处理，不把总价误填为单价，也不自动替你修改价格'
      }
    ];
  }
  if (/缺少唯一标识/.test(text)) {
    return [
      {
        label: '先核对交易记录',
        command: '/我的交易记录',
        description: '当前消息缺少安全提交所需标识，先核对原操作是否已完成；不重复确认、变更数量或另发同一操作绕过标识校验'
      }
    ];
  }
  if (/参数错误|选购参数无效|listingId 必须为正整数|购买数量必须为正整数/.test(text)) {
    return [
      {
        label: '从有效列表选择',
        command: operation === 'market.cancel' ? '/我的上架' : operation === 'market.sell' ? '/交易上架' : '/珍宝楼',
        description: '从当前列表选择正确的挂单或物品编号及允许数量，不直接使用示例编号交易'
      }
    ];
  }

  return [];
}
