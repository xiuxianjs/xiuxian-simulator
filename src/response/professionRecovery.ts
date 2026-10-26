import type { RecoveryTip } from './adventureRecovery';

type AlchemyExperienceState = { expShielded?: boolean; lowGradeExp?: boolean; expCapped?: boolean; expJustCapped?: boolean };

export function alchemyExperienceReason(result: AlchemyExperienceState): string {
  if (result.expShielded) {
    return '职业等级远高于丹方品级';
  }
  if (result.lowGradeExp) {
    return '低品级丹方，经验减少';
  }

  return result.expCapped || result.expJustCapped ? '当前职业等级经验已满' : '';
}

/** Verified against alchemy access/session, forge preview/order and lingzhi guide services. */
export function professionRecoveryTips(operation: string, text: string): RecoveryTip[] {
  const alchemy = operation.startsWith('alchemy.');
  const forge = operation.startsWith('forge.');
  const lingzhi = operation === 'profession.lingzhi-guide' || operation.startsWith('cave.');

  if (!alchemy && !forge && !lingzhi && operation !== 'profession.replace-tool') {
    return [];
  }
  // Configuration and transport failures do not imply missing player resources.
  if (/未配置|配置.*(?:缺失|无效|异常|错误)|服务.*不可用|信息加载失败|检查.*发生错误/.test(text)) {
    return [];
  }

  if (operation === 'profession.replace-tool') {
    if (/请先完成锻造入门/.test(text)) {
      return [{ label: '查看锻造入门', command: '/锻造指引', description: '先完成锻造入门，再按当前职业阶段选择工具；持有锻造台不代表已经取得装备资格' }];
    }
    if (/锻造职业等级不足/.test(text)) {
      return [
        { label: '核对锻造阶段', command: '/我的锻造', description: '查看职业经验、不同图纸考核和晋升条件；锻造职业阶段与人物境界分别检查，不能只提升境界' }
      ];
    }
    if (/职业阶段尚未开放/.test(text)) {
      return [
        { label: '查看当前职业能力', command: '/我的锻造', description: '该工具所需职业阶段尚未开放，先使用当前阶段可用的工具，不为未开放阶段重复消耗材料' }
      ];
    }
    if (/未找到该职业工具或其已在使用中|职业工具标识不能为空/.test(text)) {
      return [
        { label: '核对天工背包', command: '/储物袋 天工', description: '检查本人持有和已装备工具，从背包选择有效工具编号；已经装备时无需重复替换' },
        { label: '刷新可切换工具', command: '/替换', description: '查看当前可切换列表；没有可用项时核对背包分类、锁定状态和装备条件，不重复提交旧编号' }
      ];
    }
  }

  if (alchemy) {
    if (/你还不是炼丹师|未开始炼丹师指引|炼丹引导已过期|炼丹.*指引已过期/.test(text)) {
      return [
        {
          label: '打开炼丹入门指引',
          command: '/加入炼丹师',
          description: '先查看并完成当前入门指引；已过期时按服务器返回的新步骤重新开始，不反复发送旧炼丹指令'
        }
      ];
    }
    if (/新手指引进行中|当前步骤.*(?:不|未)|当前不在.*步骤/.test(text)) {
      return [{ label: '继续当前炼丹指引', command: '/继续炼丹指引', description: '按当前指引要求继续，不跳过前置步骤；工具与奖励以服务器已发放结果为准' }];
    }
    if (/研习值不足|不支持一键炼丹|当前无法一键炼制|缺少「.*」丹方|未找到丹方|丹方「.*」不存在/.test(text)) {
      return [
        {
          label: '查看可用丹方',
          command: '/丹方',
          description: '核对解锁、研习值及品级限制；研习值不足时先手动炼制，只有完美成丹才累积研习值；不支持一键的品级按手动流程操作'
        }
      ];
    }
    if (/职业等级不足|炼丹经验不足|职业经验不足/.test(text)) {
      return [
        { label: '查看职业成长', command: '/我的职业', description: '核对炼丹等级和当前经验；职业经验与修为不同，达到经验和境界要求后再进阶' },
        { label: '选择适用丹方', command: '/丹方', description: '选择当前已解锁、可炼制且能获得经验的丹方，先核对材料消耗，再决定炼制' }
      ];
    }
    if (/职业.*经验已满|炼丹经验溢出/.test(text)) {
      return [
        {
          label: '先查看炼丹师进阶',
          command: '/炼丹师进阶',
          description: '查看下一等级所需经验和境界；未进阶前超出当前经验上限的部分可能浪费，先核对再决定是否继续炼制'
        }
      ];
    }
    if (/职业等级远高于丹方|低品级丹方.*经验减少/.test(text)) {
      return [
        {
          label: '选择适合等级的丹方',
          command: '/丹方',
          description: '过低品级可能不获得经验或经验减少；查看可用丹方与材料条件，不把重复低阶炼制当作必定有效的升级途径'
        }
      ];
    }
    if (/已达到最高职业等级/.test(text)) {
      return [{ label: '查看可用丹方', command: '/丹方', description: '当前炼丹职业已无下一等级，可按现有能力安排炼制，不再为进阶重复积累职业经验' }];
    }
    if (/没有待开始的炼丹任务|没有待凝丹的炼丹任务|没有进行中的炼丹任务|没有正在融臣/.test(text)) {
      return [
        {
          label: '返回丹方确认流程',
          command: '/丹方',
          description: '当前没有对应阶段的任务；先核对已有结算，再从丹方入口按开始炼制、融臣、融臣结束、凝丹的当前提示继续，不直接重复旧阶段动作'
        }
      ];
    }
    if (/已有进行中的炼丹任务/.test(text)) {
      return [
        {
          label: '查看职业与炼丹入口',
          command: '/我的职业',
          description: '已有任务时不要新开同一炉；按上一条炉次反馈的阶段和时机继续，先保留当前材料与结算状态'
        }
      ];
    }
    if (/材料不足/.test(text)) {
      return [
        {
          label: '核对炼丹材料',
          command: '/储物袋 材料 草药',
          description: '按缺失材料名称与数量核对背包，批量炼制可减少次数；购买前先查看具体来源与是否有货'
        },
        { label: '查看丹方条件', command: '/丹方', description: '查看当前丹方的材料、品级与可用状态，不用提升境界代替补充材料' }
      ];
    }
    if (/丹方名称不能为空|炼制说明|一键炼丹说明|炼丹次数须在/.test(text)) {
      return [{ label: '从丹方选择', command: '/丹方', description: '从有效丹方入口选择名称和允许次数，先看消耗再确认炼制' }];
    }
  }
  if (lingzhi) {
    if (/尚未开始灵药师指引|灵药师指引已过期|灵药师引导进度已变化/.test(text)) {
      return [{ label: '重新打开灵药师指引', command: '/加入灵药师', description: '查看服务器当前步骤；已过期时按新指引继续，不重复提交旧步骤' }];
    }
    if (/已完成灵药师指引/.test(text)) {
      return [{ label: '前往灵田', command: '/灵田', description: '入门已经完成，直接查看当前灵田与物资，无需重新领取入门奖励' }];
    }
  }
  if (forge) {
    if (/约定装备模板已不可用/.test(text)) {
      return [
        {
          label: '核对原委托与退款',
          command: '/锻造委托',
          description: '查看原委托状态；待接单时由委托人决定取消并退回资源，匠师不能代替委托人取消，不重复接单或创建新委托'
        }
      ];
    }
    if (/指定玩家尚未成为锻造师|请指定另一位锻造师|无权.*委托|仅委托者|仅指定匠师/.test(text)) {
      return [
        { label: '查看本人委托', command: '/锻造委托', description: '核对委托人、指定匠师和可执行动作，使用本人有权限的委托；不更换身份或重复确认他人的订单' }
      ];
    }
    if (/同一操作标识不能用于不同|制作预览已过期|委托预览已过期|条件已变化|确认凭据无效|请先生成委托预览|职业阶段已变化/.test(text)) {
      if (operation.startsWith('forge.order-')) {
        return [
          {
            label: '先核对本人委托',
            command: '/锻造委托',
            description: '确认之前是否已创建或交付委托；旧凭据不能重复使用，需要新操作时重新预览图纸、指定匠师与工费后再决定'
          }
        ];
      }

      return [
        { label: '先核对已有记录', command: '/锻造作品', description: '确认之前是否已经制作成功，已有结算不能因预览过期再次扣除' },
        {
          label: '重新查看当前条件',
          command: '/锻造图纸',
          description: '旧凭据不能重复使用；核对当前图纸、材料和工具后重新预览，由你决定是否确认新操作'
        }
      ];
    }
    if (/请先完成锻造入门/.test(text)) {
      return [{ label: '查看锻造指引', command: '/锻造指引', description: '先核对入门境界与免费教学预览，确认完成首件教学作品后再学习和制作普通图纸' }];
    }
    if (/已完成锻造入门|教学制作已完成/.test(text)) {
      return [{ label: '查看已有作品', command: '/锻造作品', description: '先确认入门作品及已发放工具，再从普通图纸继续；不重复确认教学制作' }];
    }
    if (/尚未学习该图纸|尚未掌握约定图纸/.test(text)) {
      return [{ label: '查看锻造学习状态', command: '/我的锻造', description: '核对当前职业阶段可掌握的图纸；从职业面板刷新学习状态，再重新预览对应图纸' }];
    }
    if (/职业等级不足|职业经验不足|职业阶段不满足/.test(text)) {
      return [
        {
          label: '查看可制作图纸',
          command: '/锻造图纸 可制作',
          description: '选择当前已掌握且能制作的图纸，核对预览中的职业经验与成本；满足经验和考核要求后再查看晋升'
        }
      ];
    }
    if (/阶段作品考核尚未完成/.test(text)) {
      return [
        { label: '查看待考核图纸', command: '/锻造图纸 考核', description: '按当前阶段未完成的不同考核图纸制作作品；同一图纸重复制作不能替代不同图纸考核' }
      ];
    }
    if (/已达到最高锻造阶段/.test(text)) {
      return [{ label: '查看当前锻造能力', command: '/我的锻造', description: '当前没有下一阶段，可按已开放图纸安排制作，不为未开放阶段重复消耗材料刷经验' }];
    }
    if (/缺少符合品阶的|缺少约定的锻造工具/.test(text)) {
      return [
        { label: '查看职业工具', command: '/储物袋 天工', description: '核对已装备工具的职业、类型和品阶；使用背包中的替换入口选择符合要求的工具，再重新预览' }
      ];
    }
    if (/不足或已锁定|材料不足或已锁定/.test(text)) {
      return [
        { label: '核对锻造材料', command: '/锻造图纸', description: '在图纸详情逐项核对需要、可用、上架和锁定数量及来源；锁定或上架材料不等于可用材料' },
        { label: '查看材料背包', command: '/储物袋 材料', description: '补足真正缺少的材料；需要使用已锁定或上架材料时，由你先确认解锁或下架' }
      ];
    }
    if (/制作成本与工费所需灵石不足|灵石不足/.test(text)) {
      return [{ label: '查看当前资产', command: '/我的信息', description: '同时核对制作成本与委托工费，不只比较工费；补足后再重新预览，不自动重复创建委托' }];
    }
    if (/图纸未开放|图纸不存在|委托不存在|玩家编号或页码无效|页码超出范围/.test(text)) {
      return [
        {
          label: '返回当前有效列表',
          command: operation.startsWith('forge.order') ? '/锻造委托' : '/锻造图纸',
          description: '从本人当前可见的列表选择有效编号和可用操作，不继续提交旧编号'
        }
      ];
    }
  }

  return [];
}
