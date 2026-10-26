import type { RecoveryTip } from './adventureRecovery';

/** Navigation derived from the skill-book and soul-artifact services, without replaying writes. */
export function cultivationRecoveryTips(operation: string, text: string): RecoveryTip[] {
  const soul = operation.startsWith('soul-artifacts.');
  const skill = operation.startsWith('skill-books.');

  if ((!soul && !skill) || /未配置|配置.*(?:异常|无效|错误)|响应不完整|服务.*不可用/.test(text)) {
    return [];
  }
  if (soul) {
    if (/需要 \d+ 个同名.*本命物/.test(text)) {
      return [
        {
          label: '核对升品材料',
          command: '/储物袋 本命',
          description: '需要同名且同品的其他本命物；已装备、锁定或上架的实例不计入可消耗材料，先核对数量和状态，再自行决定解锁或下架'
        }
      ];
    }
    if (/该本命物已升品|已达最高品级/.test(text)) {
      return [{ label: '查看已有本命物', command: '/储物袋 本命', description: '核对目标当前品级与升品状态；该目标不能再次升品时不要继续收集材料或重复提交' }];
    }
    if (/当前已炼化该本命物/.test(text)) {
      return [{ label: '查看当前本命物', command: '/本命物信息', description: '已经炼化，无需重复操作；直接查看当前能力及可用培养入口' }];
    }
    if (/未找到(?:该|指定)本命物/.test(text)) {
      return [{ label: '刷新本命物背包', command: '/储物袋 本命', description: '从本人当前背包选择有效实例编号，核对目标是否仍然持有，不继续提交旧编号' }];
    }
    if (/洗涤石不足/.test(text)) {
      return [
        { label: '核对洗涤材料', command: '/储物袋', description: '查看洗涤石当前持有数量，先补足需要的数量，不重复消耗生成预览' },
        { label: '查询材料出售', command: '/珍宝楼', description: '查询是否有洗涤石出售，核对价格和数量后再决定购买，不保证当前有货' }
      ];
    }
    if (/洗涤结果待确认/.test(text)) {
      return [
        {
          label: '先核对当前本命物',
          command: '/本命物信息',
          description: '先回看上一条洗涤预览，再决定保留或放弃；放弃不返还洗涤石，不要再次洗涤覆盖待确认结果'
        }
      ];
    }
    if (/所有可用词条已达洗涤上限|当前没有可(?:新增|替换|升级)的词条/.test(text)) {
      return [
        {
          label: '查看当前洗涤词条',
          command: '/本命物信息',
          description: '核对当前已显现词条和洗涤上限；本次没有可用成长结果，不以补充洗涤石或反复洗涤替代上限条件'
        }
      ];
    }
    if (/没有待(?:确认|取消)的本命物洗涤结果|待确认的本命物已不存在|当前没有可洗涤的成长结果/.test(text)) {
      return [
        {
          label: '核对本命物当前状态',
          command: '/本命物信息',
          description: '旧结果当前不可继续，先检查最新面板和已有结算；需要再次洗涤时重新核对材料与消耗，不反复确认旧结果'
        }
      ];
    }
  }
  if (skill) {
    if ((operation === 'skill-books.reset' || operation === 'skill-books.reroll') && /操作繁忙|功法.*失败，请稍后再试/.test(text)) {
      return [
        {
          label: '先核对功法当前状态',
          command: '/我的功法',
          description: '先查看当前功法并保留原预览和结算回执；结果尚未明确时不重复消耗材料或再次确认，等待当前操作结束后再核对'
        }
      ];
    }
    if (/换词符不足/.test(text)) {
      return [
        { label: '核对换词符', command: '/储物袋', description: '先核对换词符持有数量，再选择已学功法的有效词条；预览会消耗换词符，放弃不返还，不重复生成预览' }
      ];
    }
    if (/使用中的功法不能重制/.test(text)) {
      return [{ label: '查看功法装备状态', command: '/我的功法', description: '先核对当前使用的功法，由你决定换下后再预览重制；不要用重复重制代替更换装备' }];
    }
    if (/词条|换词结果|重制结果/.test(text) && /无法识别|没有激活|没有可替换|没有可重制|待确认|待取消|已作废/.test(text)) {
      return [
        {
          label: '核对功法与原预览',
          command: '/我的功法',
          description: '核对已学编号、激活词条和当前状态；已有预览先回看原结果再决定保留或取消，失效结果不能继续确认，不自动重新消耗材料'
        }
      ];
    }
    if (/功法不存在或未学习|找不到ID为 .* 的已学功法|功法未学习|该功法已经在使用中|类型不匹配/.test(text)) {
      return [
        { label: '核对已学功法', command: '/我的功法', description: '从本人已学功法查看有效编号、类型和装备状态；不同类型不能互相替代，已经装备时无需重复切换' }
      ];
    }
    if (/功法已被锁定|功法状态已变化/.test(text)) {
      return [
        { label: '核对功法背包', command: '/储物袋 功法', description: '先检查目标与锁定状态，确需分解时自行决定解锁并重新核对确认内容，不重复执行旧分解' }
      ];
    }
  }

  return [];
}
