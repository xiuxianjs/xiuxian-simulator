export type MoreEntry = {
  label: string;
  command: string;
  description: string;
  visibilityCommand?: string;
  subcategory?: string;
};

export type MoreCategory = {
  name: string;
  displayName?: string;
  description: string;
  parent?: string;
  entries: MoreEntry[];
};

// Only navigation is grouped here. The service continues to own availability.
export const MORE_CATEGORIES: MoreCategory[] = [
  {
    name: '修炼',
    displayName: '修行问道',
    description: '境界、闭关与神魂',
    entries: [
      { label: '境界', command: '/我的境界', description: '查看突破与晋级条件' },
      { label: '闭关', command: '/闭关', description: '积累真气与修为' },
      { label: '经络', command: '/经络', description: '查看经络与冲脉' },
      { label: '神魂', command: '/元婴神魂', description: '道途、温养与材料' },
      { label: '天师宝录', command: '/天师宝录', description: '收集进度与永久属性加成' }
    ]
  },
  {
    name: '挑战',
    displayName: '试剑历练',
    description: '主线、秘境与竞技',
    entries: [
      { label: '主线', command: '/查看主线', description: '选关、挑战、扫荡与宝箱' },
      { label: '秘境', command: '/查看秘境', description: '查看秘境与挑战' },
      { label: '探索秘境', command: '/探索秘境', description: '消耗精力，探寻战利品' },
      { label: '妖塔', command: '/妖塔', description: '进度、挑战与奖励' },
      { label: '凶兽', command: '/凶兽', description: '挑战与奖励' },
      { label: '通天塔', command: '/通天塔', description: '排名挑战与奖励' },
      { label: '排行榜', command: '/排行榜', description: '实力、百业与道友排名' }
    ]
  },
  {
    name: '养成',
    displayName: '修行百艺',
    description: '天赋、装备与生活百艺',
    entries: [
      { label: '天赋', command: '/我的天赋', description: '查看天赋与生效状态' },
      { label: '背包', command: '/储物袋', description: '分类查看与使用物品' },
      { label: '功法', command: '/我的功法', description: '学习、升级与技能配置' },
      { label: '装备', command: '/我的装备', description: '穿戴、比较与分解' },
      { label: '本命物', command: '/我的本命物', description: '升级、升品与洗涤' },
      { label: '灵田', command: '/我的灵田', description: '种植、照料与收获' },
      { label: '职业', command: '/我的职业', description: '炼丹、灵药与锻造' }
    ]
  },
  {
    name: '社交',
    displayName: '道友往来',
    description: '好友、师徒与组队',
    entries: [
      { label: '队伍', command: '/我的队伍', description: '队伍、申请与邀请' },
      { label: '师门', command: '/我的师门', description: '拜师、传功与师徒关系' },
      { label: '好友', command: '/我的好友', description: '好友与申请' },
      { label: '道侣', command: '/我的道侣', description: '誓约、赠礼与双修' },
      { label: '飞信', command: '/飞信', description: '收件与道友传讯' }
    ]
  },
  {
    name: '宗门',
    displayName: '宗门事务',
    description: '宗门日常与组织活动',
    entries: [
      { label: '我的宗门', command: '/我的宗门', description: '日常、建设与成员管理' },
      { label: '宗门大比', command: '/宗门大比', description: '报名、阵容与挑战' },
      { label: '灵脉攻防战', command: '/灵脉攻防战', description: '查看战况与挑战' }
    ]
  },
  {
    name: '交易',
    displayName: '坊市交易',
    // description: '商店、市场与小店', // 小店下架
    description: '商店与市场',
    entries: [
      { label: '商店', command: '/商店', description: '选择商店与购买物品' },
      { label: '交易所', command: '/珍宝楼', description: '分类选购与上架' }
      // { label: '玩家小店', command: '/小店', description: '浏览玩家店铺' } // 小店下架
    ]
  },
  {
    name: '福利',
    displayName: '仙途机缘',
    description: '日常目标、活动与领奖',
    entries: [
      { label: '日常活跃', command: '/日常活跃', description: '查看日常目标与奖励' },
      { label: '成就', command: '/成就', description: '分类进度与领取' },
      { label: '活动', command: '/我的活动', description: '查看活动入口' },
      { label: '邮件', command: '/我的邮件', description: '查看与领取邮件' },
      { label: '礼包码', command: '/礼包码', description: '输入礼包码兑换奖励' },
      { label: '仙缘与供奉', command: '/更多 权益与充值', description: '月卡、充值、返利与邀请奖励', subcategory: '权益与充值' }
    ]
  },
  {
    name: '设置',
    displayName: '修行设置',
    description: '偏好、资料与辅助工具',
    entries: [
      // { label: '我的设置', command: '/我的设置', description: '通知、组队与外观设置' }, // 主题切换下架
      { label: '我的设置', command: '/我的设置', description: '通知与组队设置' },
      { label: '安全中心', command: '/安全中心', description: '密码、邮箱与账号管理' },
      { label: '道友小传', command: '/更多 个人资料', description: '称号、回忆与角色故事', subcategory: '个人资料' },
      { label: '藏经阁', command: '/更多 游戏资料', description: '图鉴、天书、术语与攻略', subcategory: '游戏资料' },
      { label: '反馈', command: '/我的反馈', description: '查看或提交反馈' }
    ]
  },
  {
    name: '个人资料',
    displayName: '道友小传',
    parent: '设置',
    description: '称号、回忆与角色故事',
    entries: [
      { label: '称号', command: '/我的称号', description: '查看与佩戴称号' },
      { label: '回忆', command: '/我的回忆', description: '查看修仙经历' },
      { label: '故事', command: '/我的故事', description: '查看角色故事' }
    ]
  },
  {
    name: '游戏资料',
    displayName: '藏经阁',
    parent: '设置',
    description: '图鉴、天书、术语与攻略',
    entries: [
      { label: '图鉴', command: '/图鉴', description: '免登录网页查询物品、装备、功法等资料' },
      { label: '天书', command: '/天书', description: '查看境界解锁与成长说明' },
      { label: '词典', command: '/词典', description: '查阅游戏术语' },
      { label: '攻略', command: '/攻略', description: '查看修行攻略' }
    ]
  },
  {
    name: '权益与充值',
    displayName: '仙缘与供奉',
    parent: '福利',
    description: '月卡、充值、返利与邀请奖励',
    entries: [
      { label: '权益', command: '/我的权益', description: '月卡、特权与领取' },
      { label: '充值', command: '/充值', description: '充值与返利' },
      { label: '邀请码', command: '/邀请码', description: '分享邀请码、查看邀请与领取奖励' },
      { label: '世界里程碑', command: '/里程碑', description: '全服充值人数进度与奖励' }
    ]
  }
];

export const MORE_PAGE_SIZE = 6;

export default function App(visibleCommands: string[]) {
  const visible = new Set(visibleCommands);
  const isVisible = (entry: MoreEntry, ancestors = new Set<string>()): boolean => {
    if (!entry.subcategory) {
      return visible.has(entry.visibilityCommand ?? entry.command);
    }
    if (ancestors.has(entry.subcategory)) {
      return false;
    }
    const nextAncestors = new Set(ancestors).add(entry.subcategory);

    return MORE_CATEGORIES.find(category => category.name === entry.subcategory)?.entries.some(item => isVisible(item, nextAncestors)) ?? false;
  };
  const categories = MORE_CATEGORIES.map(category => ({
    ...category,
    entries: category.entries.filter(entry => isVisible(entry))
  })).filter(category => category.entries.length > 0);

  return { code: 'OK' as const, data: { categories } };
}

export function parseMoreNavigation(text: string) {
  const normalized = text.trim().replace(/^(!|！|\/|#|＃)?\s*/, '');
  const match = normalized.match(/^(?:更多|折叠|扩展)(?:\s+(\S+))?(?:\s+(\d+))?$/);
  const categoryText = match?.[1] === '资料' ? '个人资料' : match?.[1];
  const category = MORE_CATEGORIES.find(item => item.name === categoryText || item.displayName === categoryText)?.name ?? categoryText;
  const page = match?.[2] ? Number(match[2]) : 1;

  // Old /折叠 2 links open the shared category menu instead of another catalogue.
  return { category: category && !/^\d+$/.test(category) ? category : undefined, page: Number.isSafeInteger(page) && page > 0 ? page : 1 };
}
