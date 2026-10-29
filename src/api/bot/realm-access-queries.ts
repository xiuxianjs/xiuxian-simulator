import { getCurrentEvent } from 'alemonjs';
import type { RealmAccessQuery } from '../schemas/realm-access-query';
import { getEventAccessFacts } from './access-facts';
import { requestBackend } from './client';

export const emptyRealmAccess: RealmAccessQuery = {
  registered: false,
  moreVisibleCommands: [],
  // Only used when the platform supplies no Bid, so the Go query cannot run.
  // Preserve the old zero-realm menu without interpreting realm rules locally.
  foldVisibleCommands: [
    '/我',
    '/踏入仙途',
    '/修仙帮助',
    '/攻略',
    '/图鉴',
    '/词典',
    '/更多',
    '/折叠',
    '/突破',
    '/晋级',
    '/我的境界',
    '/打坐',
    '/打坐结束',
    '/闭关',
    '/出关',
    '/探索秘境',
    '/返程',
    '/天师宝录',
    '/属性面板',
    '/查看秘境',
    '/秘境挑战 X',
    '/扫荡秘境 X',
    '/查看主线',
    '/主线挑战 X-Y',
    '/主线扫荡 X-Y',
    '/凶兽',
    '/挑战凶兽',
    '/挑战排名 N',
    '/一键挑战',
    '/扫荡排名 N',
    '/储物袋',
    '/我的装备',
    '/装备 XX',
    '/卸下 XX',
    '/一键装备',
    '/我的功法',
    '/学习功法 ID',
    '/悟道 ID',
    '/我的称号',
    '/我的职业',
    '/炼丹',
    '/炼丹 入门',
    '/炼丹 丹方',
    '/炼丹 炼制 丹方名 N',
    '/炼丹 天工',
    '/炼丹 来源',
    '/服用 XX N',
    '/商店 万宝楼',
    '/商店 签到',
    '/商店 积分',
    '/商店 神奇',
    '/商店 道侣',
    '/珍宝楼',
    '/选购 ID',
    '/我的上架',
    '/小店',
    '/信誉分',
    '/我的宗门',
    '/宗门列表',
    '/加入宗门 ID',
    '/宗门签到',
    '/宗门日常',
    '/祭祀祖师',
    '/宗门战备',
    '/宗门主线',
    '/宗门商店',
    '/宗门采矿',
    '/宗门大比',
    '/灵脉攻防战',
    '/宗门红包',
    '/结交 UID/@目标',
    '/好友申请',
    '/好友设置',
    '/结为道侣 UID/@目标',
    '/升级誓约',
    '/双修',
    '/道侣任务',
    '/创建队伍',
    '/队伍列表',
    '/日常签到',
    '/新人签到',
    '/登仙台签到',
    '/日常活跃',
    '/周常活跃',
    '/我的活动',
    '/新人狂欢',
    '/限时活动',
    '/充值',
    '/新人返利',
    '/我的权益',
    '/月卡领取',
    '/礼包码 码',
    '/邀请码',
    '/我的邮件',
    '/一键领取邮件',
    '/反馈 内容',
    '/我的反馈',
    '/我的设置',
    '/安全中心',
    '/改名 新名字',
    '/锁定 物品',
    '/解锁 物品'
  ],
  realmLevel: 0,
  stageLevel: 0,
  canUseSoulPath: false,
  canUseSecondLayerFeature: false,
  canUseFifthLayerFeature: false,
  canUseSpar: false,
  canAccessOverseasIsland: false,
  canUseMeridian: false,
  canUseProfessionAndCave: false,
  canUseSoulArtifact: false,
  canAdvanceSoulArtifact: false,
  canJoinAlchemyGuide: false,
  canUseRobberyLikePvp: false,
  canJoinMasterAsDisciple: false,
  canAcceptDisciple: false
};

export async function getBackendRealmAccess(bid: string | undefined): Promise<RealmAccessQuery> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const cached = getEventAccessFacts(getCurrentEvent(), bid)?.realm;

  if (cached) {
    return cached;
  }

  return parseBackendRealmAccess(await requestBackend(bid, 'get_robot_realm_access'));
}

export function parseBackendRealmAccess(value: unknown): RealmAccessQuery {
  const data = value as RealmAccessQuery;

  if (!data || typeof data !== 'object') {
    throw new Error('境界资格接口数据不完整');
  }
  // Go omits an empty MoreVisibleCommands slice. Other eligibility fields stay required.
  if (data.moreVisibleCommands !== undefined && !Array.isArray(data.moreVisibleCommands)) {
    throw new Error('境界资格接口字段不完整');
  }
  const normalized = { ...data, moreVisibleCommands: data.moreVisibleCommands ?? [] };

  for (const key of Object.keys(emptyRealmAccess) as Array<keyof RealmAccessQuery>) {
    if (key === 'moreVisibleCommands' || key === 'foldVisibleCommands') {
      if (!Array.isArray(normalized[key]) || !normalized[key].every(command => typeof command === 'string')) {
        throw new Error('境界资格接口字段不完整');
      }
      continue;
    }
    if (typeof normalized[key] !== typeof emptyRealmAccess[key] || (typeof normalized[key] === 'number' && !Number.isFinite(normalized[key]))) {
      throw new Error('境界资格接口字段不完整');
    }
  }

  return normalized;
}
