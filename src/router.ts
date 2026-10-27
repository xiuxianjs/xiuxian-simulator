import { Router } from 'alemonjs';
import { withAccessFacts } from './api/bot/access-facts';
import { withCommandCatalog } from './api/bot/catalog-query-reuse';
import type { RobotCommandProfile } from './api/bot/command-entry';
import { alchemyRoutes } from './response/alchemy/v2/commands';
import { forgeReadEntries, forgeReadRoutes } from './response/profession/forge/commands';
import type { GameEvent } from './types/event';
import { measureTransportStage } from './utils/transportTiming';

/**
 * 把感叹号的消息，让给旧版本代码，当前项目代码用 / 或 # 开头的消息。
 */

// 根路由不限制事件；各入口和游戏分组声明自己的事件范围。
const app = Router.create();
const commandEvents = ['message.create', 'private.message.create', 'interaction.create', 'private.interaction.create'] as const;

// 平台事件置于游戏分组之外，不经过登录、维护或验证码中间件。
app.res({ events: ['notice.create', 'private.notice.create'] }, () => import('@src/response/notification/permission/res'));

// 朋友新增、加入群聊
app.res({ events: ['private.friend.add', 'guild.join'] }, () => import('@src/response/notification/welcome/res'));
// 群成员加入
app.res({ events: ['member.add'] }, () => import('@src/response/notification/member/res'));
// 失去朋友、退出群聊、被踢出群聊
app.res({ events: ['private.friend.remove', 'guild.exit', 'member.remove'] }, () => import('@src/response/notification/lifecycle/res'));

// 检查是不是接到了 !，是就结束，直接排斥不执行
app.res({ events: commandEvents, regular: /^[!！]/ }, () => import('@src/response/commandError/ignore/res'));

// 下架指令在进入游戏分组前终止，避免旧按钮落入限时活动等前缀路由。
app.res(
  {
    events: commandEvents,
    regular:
      /^\s*[/#＃]?(?:领取回归礼包|领取测试礼包|凡人修仙礼包码|赞助|活动(?:商城|商店|购买|充值)|海外仙岛|海岛|限时活动\s+(?:商店|任务|特惠))(?:\s|$|购买|领取)/
  },
  () => import('@src/response/commandError/ignore/res')
);

// Versioned teaching callbacks must be checked even after Context expiration.
// The handler passes unrelated interactions to their existing routes.
app.res({ events: ['interaction.create', 'private.interaction.create'] }, () => import('@src/response/onboarding/res'));

app.res(
  { events: commandEvents, regular: /^[/#＃]?(?:宗门群订阅|取消宗门群订阅|师门群订阅|取消师门群订阅)$/ },
  () => import('@src/response/flyMail/guildSubscription/res')
);

// 群 通知管理、群欢迎、加群提醒、加群申请记录
app.res({ events: commandEvents, regular: /^[/#＃]?(?:开启每日机缘|关闭每日机缘)$/ }, () => import('@src/response/dailyFortune/res'));

app.res(
  { events: commandEvents, regular: /^[/#＃]?(?:群通知管理|配置群欢迎(?:\s|$)|配置加群提醒(?:\s|$)|加群申请记录(?:\s|$))/ },
  () => import('@src/response/notification/community/res')
);

app.res({ events: commandEvents, regular: /^\s*[/#＃]?\s*(?:继续引导|退出引导)\s*$/ }, () => import('@src/response/onboarding/res'));

// 任务面板（需在任务系统转义之前注册，避免被 "任务" 前缀抢占）
app.res(
  {
    events: commandEvents,
    regular: /^(\/|#|＃)?(任务面板|修仙面板|我的任务)/
  },
  () => import('@src/response/taskPanel/res')
);

// 任务系统转义 (这类事先查再执行，和游戏的机制无关)
app.res(
  {
    events: commandEvents,
    regular: /^(\/|#|＃)?任务\s+/
  },
  () => import('@src/response/task/continue/res')
);

{
  const publicXiuxian = app.group({
    events: commandEvents,
    routeText: {
      prefixes: ['/', '#', '＃'],
      stripPrefix: true,
      allowBare: true
    }
  });

  /**
   * 无需身份、不用担心被用户知晓的，公共入口
   */
  publicXiuxian.use(
    ['更多'],
    withAccessFacts(['realm'], () => import('@src/response/more/res'))
  );
  publicXiuxian.use(
    ['折叠', '扩展'],
    withAccessFacts(['realm'], () => import('@src/response/more/res'))
  );
  publicXiuxian.use(
    { path: '图鉴详情', description: '免登录打开指定图鉴条目：/图鉴详情 <分类> <编号>。' },
    () => import('@src/response/encyclopedia/detail/res')
  );
  publicXiuxian.use({ path: '图鉴', description: '免登录查阅图鉴：/图鉴 [分类] [子分类]。' }, () => import('@src/response/encyclopedia/res'));
  publicXiuxian.use('天书', () => import('@src/response/tianshu/res'));
  publicXiuxian.use('词典分类', () => import('@src/response/glossary/category/res'));
  publicXiuxian.use('词典', () => import('@src/response/glossary/query/res'));
  publicXiuxian.use('攻略', () => import('@src/response/strategy'));
  // 旧版资料查询独立于新版注册、结算和引导流程。
  publicXiuxian.use(['继承', '前世'], () => import('@src/response/legacyArchive/res'));
  publicXiuxian.use(
    ['帮助', '修仙帮助', 'help', 'menu', '菜单'],
    withAccessFacts(['realm'], () => import('@src/response/help'))
  );
  publicXiuxian.use(['踏入仙途', '开始游戏', '开始修仙', '开始降临', '降临世界', '我是'], () => import('@src/response/start/res'));

  // const xiuxian = publicXiuxian.group({}, () => import('@src/response/mwMiddleware'));
  const xiuxian = publicXiuxian.group({});

  // 引导按钮也必须精确匹配并发起 V2 请求；后端准入负责推进/跳过。
  xiuxian.use(['继续', '跳过剧情', '跳过引导', '跳过'], () => import('@src/response/guide/action/res'));

  // 任务链
  xiuxian.use(
    {
      path: '任务设置',
      schema: {
        args: [
          { name: 'slot', rules: [{ type: 'string' }] },
          { name: 'step', rules: [{ type: 'string' }] },
          { name: 'content', rules: [{ type: 'rest' }] }
        ],
        usage: '/任务设置 <槽位> <步骤> <内容>',
        messages: {
          tooManyArgs: '任务设置参数过多，请使用：/任务设置 <槽位> <步骤> <内容>'
        }
      },
      description: '设置任务槽位中某一步的执行内容。'
    },
    () => import('@src/response/task/settings/res')
  );

  xiuxian.use(
    {
      path: '任务别名',
      schema: {
        args: [
          { name: 'slot', rules: [{ type: 'string' }] },
          { name: 'alias', rules: [{ type: 'rest' }] }
        ],
        usage: '/任务别名 <槽位> <名称>'
      },
      description: '为任务槽位设置一个更易识别的别名。'
    },
    () => import('@src/response/task/alias/res')
  );

  xiuxian.use(
    {
      path: '任务清空',
      schema: {
        args: [
          {
            name: 'slot',
            rules: [{ type: 'rest' }]
          }
        ],
        usage: '/任务清空 <槽位>'
      },
      description: '清空指定任务槽位中的内容。'
    },
    () => import('@src/response/task/clear/res')
  );

  xiuxian.use(
    {
      path: '任务执行',
      schema: {
        args: [
          {
            name: 'slot',
            rules: [{ type: 'rest' }]
          }
        ],
        usage: '/任务执行 <槽位>'
      },
      description: '执行指定任务槽位中已保存的任务链。'
    },
    () => import('@src/response/task/execute/res')
  );

  xiuxian.use('任务取消', () => import('@src/response/task/cancel/res'));
  xiuxian.use('任务跳过', () => import('@src/response/task/skip/res'));
  xiuxian.use(['开启群订阅', '关闭群订阅'], () => import('@src/response/groupSubscription/res'));
  xiuxian.use(['通知设置'], () => import('@src/response/notification/settings/res'));
  xiuxian.use(['我的通知', '通知记录'], () => import('@src/response/notification/history/res'));

  xiuxian.use(
    {
      path: '任务',
      schema: {
        args: [{ name: 'content', rules: [{ type: 'rest' }] }],
        usage: '/任务'
      },
      description: '查看任务系统概览，或继续当前任务流程。'
    },
    () => import('@src/response/task/overview/res')
  );

  // 个人信息链
  xiuxian.use(
    ['我', '我的信息', '我的资料', '我的编号', '我的控制台', '个人信息', '个人资料', '个人编号', '个人控制台'],
    withAccessFacts(['resourceSettlement', 'homeOverview'], () => measureTransportStage('home.route.import', () => import('@src/response/message/me/res')))
  );

  xiuxian.use(['我的天赋', '天赋'], () => import('@src/response/talents/res'));
  xiuxian.use(['我的灵根', '灵根', '灵根材料', '灵根培养', '灵根确认培养', '灵根晋品'], () => import('@src/response/spiritRoot/res'));

  // 基础查询层
  xiuxian.use('排行榜', () => import('@src/response/leaderboard/res'));
  xiuxian.use('所有成就', () => import('@src/response/achievements/allAchievements/res'));
  xiuxian.use('我的称号', () => import('@src/response/title/myTitles/res'));
  xiuxian.use('佩戴称号', () => import('@src/response/title/activateTitle/res'));
  xiuxian.use('卸下称号', () => import('@src/response/title/deactivateTitle/res'));
  xiuxian.use(['我的回忆'], () => import('@src/response/memory/res'));
  xiuxian.use(['我的故事'], () => import('@src/response/story/res'));
  xiuxian.use(['我的主题'], () => import('@src/response/theme/myThemes/res'));
  xiuxian.use('切换主题', () => import('@src/response/theme/activateTheme/res'));
  xiuxian.use('关闭主题', () => import('@src/response/theme/deactivateTheme/res'));
  xiuxian.use('切换墨色模式', () => import('@src/response/theme/switchInkMode/res'));
  xiuxian.use(['切换', '替换'], () => import('@src/response/profession/replaceEquip/res'));
  xiuxian.use(
    '商店',
    withCommandCatalog('shop', () => measureTransportStage('route.import', () => import('@src/response/shop/hub/res')))
  );
  xiuxian.use(['储物袋', '背包', '纳戒', '我的储物袋', '我的背包', '我的纳戒'], () => import('@src/response/storage/newBag/main/res'));
  xiuxian.use(['储物袋 道具', '背包 道具', '我的储物袋 道具', '我的背包 道具'], () => import('@src/response/storage/newBag/props/res'));
  xiuxian.use(['储物袋 材料', '背包 材料', '我的储物袋 材料', '我的背包 材料'], () => import('@src/response/storage/newBag/materials/res'));
  xiuxian.use(['储物袋 装备', '背包 装备', '我的储物袋 装备', '我的背包 装备'], () => import('@src/response/storage/newBag/equipments/res'));
  xiuxian.use(['储物袋 天工', '背包 天工', '我的储物袋 天工', '我的背包 天工'], () => import('@src/response/storage/newBag/tiangong/res'));
  xiuxian.use(['储物袋 功法', '背包 功法', '我的储物袋 功法', '我的背包 功法'], () => import('@src/response/storage/newBag/skillBooks/res'));
  xiuxian.use(['储物袋 本命', '背包 本命', '我的储物袋 本命', '我的背包 本命'], () => import('@src/response/storage/newBag/soulArtifacts/res'));
  xiuxian.use(['储物袋 礼盒', '背包 礼盒', '我的储物袋 礼盒', '我的背包 礼盒'], () => import('@src/response/storage/newBag/lootboxes/res'));
  xiuxian.use(['查看通天塔', '通天塔', '查看通天塔 我的'], () => import('@src/response/ranking/viewRankings/res'));
  xiuxian.use(['更新属性', '属性面板', '我的面板'], () => import('@src/response/attributes/update/res'));
  xiuxian.use(['元婴神魂', '元婴面板'], () => import('@src/response/soulPath/panel/res'));
  xiuxian.use(['元婴道途', '道途详情'], () => import('@src/response/soulPath/path/res'));
  xiuxian.use(
    '道途印证',
    withAccessFacts(['realm'], () => import('@src/response/soulPath/compare/res'))
  );
  xiuxian.use(
    { path: '确认神魂', schema: { args: [{ name: 'token', rules: [{ type: 'rest' }] }], usage: '/确认神魂 <凭证>' } },
    () => import('@src/response/soulPath/confirm/res')
  );
  xiuxian.use(['神魂材料来源', '神魂材料'], () => import('@src/response/soulPath/source/res'));
  xiuxian.use(
    { path: '神魂补给', schema: { args: [{ name: 'direction', rules: [{ type: 'rest' }] }], usage: '/神魂补给 <自动|定魂|养魄|悟道|出窍>' } },
    () => import('@src/response/soulPath/supply/res')
  );
  xiuxian.use(
    {
      path: '神魂温养',
      schema: {
        args: [{ name: 'direction', rules: [{ type: 'rest' }] }],
        usage: '/神魂温养 <定魂|养魄|悟道|出窍>'
      },
      description: '消耗神魂材料温养当前元婴道途。'
    },
    () => import('@src/response/soulPath/nurture/res')
  );
  xiuxian.use('神魂重选', () => import('@src/response/soulPath/reroll/res'));
  xiuxian.use(
    {
      path: '选择道途',
      schema: {
        args: [{ name: 'path', rules: [{ type: 'rest' }] }],
        usage: '/选择道途 <玄法|炼体|御器>'
      },
      description: '首次免费选择元婴道途。'
    },
    () => import('@src/response/soulPath/choose/res')
  );
  xiuxian.use('道途突破', () => import('@src/response/soulPath/advance/res'));
  xiuxian.use(
    {
      path: '切换道途',
      schema: {
        args: [{ name: 'path', rules: [{ type: 'rest' }] }],
        usage: '/切换道途 <玄法|炼体|御器>'
      },
      description: '消耗道痕结晶切换元婴道途，已获得进度会保留。'
    },
    () => import('@src/response/soulPath/switch/res')
  );
  xiuxian.use(['个人活动', '我的活动', '活动大厅', '宗门活动'], () => import('@src/response/activity/res'));
  xiuxian.use(['查看秘境', '秘境列表'], () => import('@src/response/dungeon/list/res'));
  xiuxian.use('秘境详情', () => import('@src/response/dungeon/detail/res'));
  xiuxian.use('队伍信息', () => import('@src/response/team/teamInfo/res'));
  xiuxian.use('匹配状态', () => import('@src/response/teamMatch/status/res'));
  xiuxian.use(
    ['副本列表', '查看主线', '主线列表'],
    withCommandCatalog('storyline', () => measureTransportStage('route.import', () => import('@src/response/storyline/list/res')))
  );
  xiuxian.use('天师宝录', () => import('@src/response/tianshiBaolu/res'));
  xiuxian.use('申请词典编辑权限', () => import('@src/response/glossary/apply/res'));
  xiuxian.use('录入词典', () => import('@src/response/glossary/create/res'));
  xiuxian.use('删除词典', () => import('@src/response/glossary/delete/res'));
  xiuxian.use('妖塔', () => import('@src/response/demonTower/info/res'));
  xiuxian.use('凶兽', () => import('@src/response/worldBoss/info/res'));
  xiuxian.use(['我的宗门', '查看势力'], () => import('@src/response/guild/myGuild/res'));
  xiuxian.use(['充值', '充值说明', '充值信息'], () => import('@src/response/recharge/info/res'));
  xiuxian.use('充值购买', () => import('@src/response/recharge/pay/res'));
  xiuxian.use(['我的订单', '查询充值订单', '继续支付'], () => import('@src/response/recharge/orders/res'));
  xiuxian.use('礼包奖励', () => import('@src/response/recharge/firstRechargeInfo/res'));
  xiuxian.use('领取礼包奖励', () => import('@src/response/recharge/firstRechargeClaim/res'));
  xiuxian.use(
    {
      path: '查看信息',
      schema: {
        args: [{ name: 'target', rules: [{ type: 'rest' }] }],
        usage: '/查看信息 <UID|@道友>'
      },
      description: '查看指定玩家的信息，支持直接输入 UID，或通过 @ 自动识别对方。'
    },
    () => import('@src/response/message/viewInfo/res')
  );
  xiuxian.use(
    '我的好友',
    withAccessFacts(['social'], () => import('@src/response/friend/friendList/res'))
  );
  xiuxian.use('随机好友', () => import('@src/response/friend/randomFriend/res'));
  xiuxian.use(
    '赠礼记录',
    withAccessFacts(['social'], () => import('@src/response/companion/giftRecords/res'))
  );
  xiuxian.use(['我的洞府', '洞府'], () => import('@src/response/profession/myProfession/res'));
  xiuxian.use(['我的灵田', '灵田'], () => import('@src/response/cavePlot/info/res'));
  xiuxian.use(
    {
      path: '查看灵田',
      schema: {
        args: [{ name: 'target', rules: [{ type: 'rest' }] }],
        usage: '/查看灵田 <UID|@道友>'
      },
      description: '查看指定玩家的灵田，支持直接输入 UID，或通过 @ 自动识别对方。'
    },
    () => import('@src/response/cavePlot/visit/res')
  );
  xiuxian.use(['灵田记录', '洞府记录'], () => import('@src/response/cavePlot/logs/res'));
  xiuxian.use('附近灵田', () => import('@src/response/cavePlot/nearby/res'));
  xiuxian.use(['开垦', '开垦所有', '一键开垦'], () => import('@src/response/cavePlot/cultivate/res'));
  xiuxian.use('一键播种', () => import('@src/response/cavePlot/plant/res'));
  xiuxian.use('播种', () => import('@src/response/cavePlot/plant/res'));
  xiuxian.use(['一键打理灵田', '一键照料道侣灵田'], () => import('@src/response/cavePlot/tendAll/res'));
  xiuxian.use(
    [
      '浇灌',
      '除虫',
      '除草',
      '收割',
      '灵田加速',
      '升级灵田',
      '一键浇灌',
      '一键除虫',
      '一键除草',
      '一键收割',
      '一键加速',
      '一键催熟',
      '一键灵田加速',
      '一键灵田催熟'
    ],
    () => import('@src/response/cavePlot/action/res')
  );
  xiuxian.use(
    {
      path: '协作灵田',
      schema: {
        args: [{ name: 'content', rules: [{ type: 'rest' }] }],
        usage: '/协作灵田 <UID|@道友> <浇灌|除虫|除草|收割> [灵田序号]'
      },
      description: '对指定玩家的灵田执行协作操作，支持直接输入 UID，或通过 @ 自动识别对方。'
    },
    () => import('@src/response/cavePlot/social/res')
  );
  xiuxian.use(
    {
      path: '偷药',
      schema: {
        args: [{ name: 'content', rules: [{ type: 'rest' }] }],
        usage: '/偷药 <UID|@道友> [灵田序号]'
      },
      description: '对指定玩家的灵田执行偷药操作，支持直接输入 UID，或通过 @ 自动识别对方。'
    },
    () => import('@src/response/cavePlot/social/res')
  );
  xiuxian.use(['洞府阵法', '我的阵法'], () => import('@src/response/caveFormation/info/res'));
  xiuxian.use('邀请码', () => import('@src/response/referral/viewCode/res'));
  xiuxian.use('我的邀请', () => import('@src/response/referral/invitees/res'));
  xiuxian.use(['交易所', '珍宝楼'], () => import('@src/response/market/list/res'));
  xiuxian.use('小店', () => import('@src/response/shop/playerShop/list/res'));
  xiuxian.use('小店排行', () => import('@src/response/shop/playerShop/ranking/res'));
  xiuxian.use('煞气', () => import('@src/response/shaQi/res'));
  xiuxian.use('杀神榜', () => import('@src/response/killGodList/res'));
  xiuxian.use('领取杀神称号', () => import('@src/response/killGodList/claimTitle/res'));
  xiuxian.use('悬赏榜', () => import('@src/response/bounty/list/res'));
  xiuxian.use(
    {
      path: '悬赏',
      schema: {
        args: [{ name: 'content', rules: [{ type: 'rest' }] }],
        usage: '/悬赏 <UID|@道友> <金额> [人数]'
      }
    },
    () => import('@src/response/bounty/publish/res')
  );
  xiuxian.use('领赏', () => import('@src/response/bounty/claim/res'));
  xiuxian.use('仇人', () => import('@src/response/enemy/res'));
  xiuxian.use('宗门商店', () => import('@src/response/guild/shop/res'));
  xiuxian.use('宗门商店自动刷新', () => import('@src/response/guild/autoRefreshShop/res'));
  xiuxian.use('宗门日常', () => import('@src/response/guild/daily/res'));
  xiuxian.use('宗门任务', () => import('@src/response/guild/daily/res'));
  xiuxian.use('祭祀祖师', () => import('@src/response/guild/worship/res'));
  xiuxian.use('宗门战备', () => import('@src/response/guild/battleTraining/res'));
  xiuxian.use('宗门周常', () => import('@src/response/guild/weekly/res'));
  xiuxian.use('宗门主线', () => import('@src/response/guild/storyline/res'));
  xiuxian.use('宗门主线挑战', () => import('@src/response/guild/storyline/challengeRes'));
  xiuxian.use('宗门主线记录', () => import('@src/response/guild/storyline/recordsRes'));
  xiuxian.use('领取宗门主线奖励', () => import('@src/response/guild/storyline/claimRes'));
  xiuxian.use(['我的道侣', '道侣'], () => import('@src/response/companion/info/res'));
  xiuxian.use(['我的师门', '师门'], () => import('@src/response/master/info/res'));
  xiuxian.use('领取师门称号', () => import('@src/response/master/claimTitle/res'));
  xiuxian.use('师谱', () => import('@src/response/master/lineage/res'));
  xiuxian.use(
    ['圣人排行榜', '圣人榜'],
    withAccessFacts(['social'], () => import('@src/response/master/rank/res'))
  );
  xiuxian.use('宗门大比', () => import('@src/response/guildCompetition/home/res'));
  xiuxian.use('邀请境界奖励', () => import('@src/response/referral/rewardRules/realm/res'));
  xiuxian.use(['初入仙途', '新人狂欢'], () => import('@src/response/activity/newcomerLogin/res'));
  xiuxian.use('物品详情', () => import('@src/response/itemDetail/res'));
  xiuxian.use('本命物详情', () => import('@src/response/soulArtifact/detail/res'));
  xiuxian.use('战斗回忆翻页', () => import('@src/response/battle/memoryPage/res'));
  xiuxian.use('查看战斗过程', () => import('@src/response/battle/viewLog/res'));
  xiuxian.use(['我的设置', '群订阅'], () => import('@src/response/message/settings/res'));
  xiuxian.use(
    ['成就'],
    withAccessFacts(['social'], () => import('@src/response/achievements/route/res'))
  );
  xiuxian.use(
    '我的成就',
    withAccessFacts(['social'], () => import('@src/response/achievements/myAchievements/res'))
  );
  xiuxian.use(
    '成就 战力',
    withAccessFacts(['social'], () => import('@src/response/achievements/combatPower/res'))
  );
  xiuxian.use('我的权益', () => import('@src/response/monthCard/rights/res'));
  xiuxian.use('我的职业', () => import('@src/response/profession/myProfession/res'));
  xiuxian.use([...forgeReadEntries], () => import('@src/response/profession/forge/res'));
  for (const config of forgeReadRoutes) {
    xiuxian.use(config, () => import('@src/response/profession/forge/res'));
  }
  xiuxian.use(['邀请奖励', '邀请人数奖励'], () => import('@src/response/referral/rewardRules/count/res'));
  xiuxian.use(['灵脉攻防战', '秘境攻防', '秘境争霸'], () => import('@src/response/guildSecretRealmWar/home/res'));

  xiuxian.use('宗门公告', () => import('@src/response/guild/viewNotice/res'));
  xiuxian.use('宗门简介', () => import('@src/response/guild/viewIntro/res'));
  xiuxian.use('我的境界', () => import('@src/response/realms/myRealm/res'));
  xiuxian.use(['我的渡劫', '渡劫结算'], () => import('@src/response/tribulation/res'));
  xiuxian.use(['劫云榜', '搜索劫云', '观望渡劫'], () => import('@src/response/tribulation/publicRes'));
  xiuxian.use('日常活跃', () => import('@src/response/activityPoints/daily/res'));
  xiuxian.use(['任务面板', '修仙面板'], () => import('@src/response/taskPanel/res'));
  xiuxian.use('战力排行榜', () => import('@src/response/battle/leaderboard/res'));
  // xiuxian.use('区战力排行榜', () => import('@src/response/battle/leaderboard/regionRes'));
  xiuxian.use('邀请VIP奖励', () => import('@src/response/referral/rewardRules/vip/res'));
  xiuxian.use('宗门精华', () => import('@src/response/guild/viewEssences/res'));
  xiuxian.use('宗门红包', () => import('@src/response/guild/redPacketList/res'));
  xiuxian.use(['灵脉攻防战查看', '秘境攻防查看'], () => import('@src/response/guildSecretRealmWar/view/res'));
  xiuxian.use(['灵脉攻防战列表', '秘境攻防列表'], () => import('@src/response/guildSecretRealmWar/list/res'));
  xiuxian.use('我的装备', () => import('@src/response/equipment/myEquipments/res'));
  xiuxian.use('首通排名奖励', () => import('@src/response/ranking/viewFirstRewards/res'));
  xiuxian.use(['提交反馈', '反馈', '提交反馈游戏', '反馈游戏'], () => import('@src/response/feedbacks/feedbackGame/res'));
  xiuxian.use('查看反馈', () => import('@src/response/feedbacks/feedbackInfo/res'));
  xiuxian.use('我的反馈', () => import('@src/response/feedbacks/feedbacksMe/res'));
  xiuxian.use('登录', () => import('@src/response/emailSecurity/login'));
  xiuxian.use('设置密码', () => import('@src/response/emailSecurity/setPassword'));
  xiuxian.use('绑定邮箱', () => import('@src/response/emailSecurity/bindEmail'));
  xiuxian.use('更换账号', () => import('@src/response/emailSecurity/changeAccount'));
  // 仅限侧睡环境使用
  // xiuxian.use('切换UID', () => import('@src/response/emailSecurity/switchUid'));
  xiuxian.use('更换邮箱', () => import('@src/response/emailSecurity/changeEmail'));
  xiuxian.use('验证', () => import('@src/response/emailSecurity/verify'));
  xiuxian.use(['我的账号', '安全中心', '我的安全中心'], () => import('@src/response/emailSecurity/securityCenter'));
  xiuxian.use('我的邮件', () => import('@src/response/email/MyEmailList/res'));
  xiuxian.use('查看邮件', () => import('@src/response/email/findEmail/res'));
  xiuxian.use('周常活跃', () => import('@src/response/activityPoints/weekly/res'));
  xiuxian.use('我的特权', () => import('@src/response/monthCard/privileges/res'));
  xiuxian.use('新人返利', () => import('@src/response/recharge/newcomerInfo/res'));
  xiuxian.use('周周返利', () => import('@src/response/recharge/weeklyRebateInfo/res'));
  xiuxian.use('我的上架', () => import('@src/response/market/my/res'));
  xiuxian.use(['我的记录', '我的交易记录'], () => import('@src/response/market/records/res'));
  xiuxian.use(['信誉分', '我的信誉'], () => import('@src/response/market/credibility/res'));
  xiuxian.use('我的小店', () => import('@src/response/shop/playerShop/mine/res'));
  xiuxian.use(
    ['我的武器', '我的饰品', '我的法袍', '我的衣服', '我的鞋子', '我的头饰', '我的羽翼'],
    () => import('@src/response/equipment/equipmentDetail/res')
  );
  xiuxian.use('我的隐藏功法', () => import('@src/response/skillBook/hidden/res'));
  xiuxian.use('我的功法', () => measureTransportStage('route.import', () => import('@src/response/skillBook/mySkillBooks/res')));
  xiuxian.use('查看功法', () => import('@src/response/skillBook/detail/res'));
  xiuxian.use('参悟', () => import('@src/response/skillBook/proficiency/res'));
  xiuxian.use(
    '宗门列表',
    withAccessFacts(['social'], () => import('@src/response/guild/guildList/res'))
  );
  xiuxian.use('我的申请', () => import('@src/response/guild/myApplications/res'));
  xiuxian.use('宗门审核', () => import('@src/response/guild/reviewApplications/res'));
  xiuxian.use('宗门日志', () => import('@src/response/guild/viewLogs/res'));
  xiuxian.use('我发的红包', () => import('@src/response/guild/myRedPackets/res'));
  xiuxian.use('宗门成员列表', () => import('@src/response/guild/memberList/res'));
  xiuxian.use('宗门改职', () => import('@src/response/guild/changeRole/res'));
  xiuxian.use('可挑战宗门列表', () => import('@src/response/guildCompetition/challengeList/res'));
  xiuxian.use('查看晋级赛队伍', () => import('@src/response/guildCompetition/checkPromotionTeams/res'));
  xiuxian.use('查看押注记录', () => import('@src/response/guildCompetition/checkBets/res'));
  xiuxian.use('宗门大比战斗记录', () => import('@src/response/guildCompetition/battleLog/res'));
  xiuxian.use('宗门大比战斗详情', () => import('@src/response/guildCompetition/battleDetail/res'));
  xiuxian.use(['我的本命物', '本命物信息'], () => import('@src/response/soulArtifact/info/res'));
  xiuxian.use(['我的队伍', '查看队伍'], () => import('@src/response/team/myTeam/res'));
  xiuxian.use('队伍战斗记录', () => import('@src/response/team/battleRecords/res'));
  xiuxian.use('队伍战斗详情', () => import('@src/response/team/battleDetail/res'));
  xiuxian.use('我的队伍申请', () => import('@src/response/team/myApplications/res'));
  xiuxian.use('我的队伍邀请', () => import('@src/response/team/myInvitations/res'));
  xiuxian.use(['队伍申请', '处理队伍申请'], () => import('@src/response/team/applications/res'));
  xiuxian.use('队伍列表', () => import('@src/response/team/teamList/res'));
  xiuxian.use('月度排名奖励', () => import('@src/response/ranking/viewMonthlyRewards/res'));
  xiuxian.use('主线排行榜', () => import('@src/response/storyline/leaderboard/res'));
  xiuxian.use('妖塔排行榜', () => import('@src/response/demonTower/leaderboard/res'));
  xiuxian.use(['丹师排行榜', '炼丹师排行榜'], () => import('@src/response/alchemy/leaderboard/res'));
  xiuxian.use('人气排行榜', () => import('@src/response/leaderboard/popularity/res'));
  xiuxian.use('凶兽排行', () => import('@src/response/worldBoss/leaderboard/res'));
  xiuxian.use('凶兽奖励', () => import('@src/response/worldBoss/rewards/res'));
  xiuxian.use('境界排行榜', () => import('@src/response/leaderboard/realm/res'));
  xiuxian.use('区境界排行榜', () => import('@src/response/leaderboard/realm/regionRes'));
  xiuxian.use(['登天梯', '查看登天梯', '天骄榜', '查看天骄榜'], () => import('@src/response/tianjiao/leaderboard/res'));
  xiuxian.use(['登天奖励', '登天奖励记录', '天骄奖励', '天骄奖励记录'], () => import('@src/response/tianjiao/rewards/res'));
  xiuxian.use(
    '好友申请',
    withAccessFacts(['social'], () => import('@src/response/friend/friendRequest/res'))
  );
  xiuxian.use(
    '黑名单',
    withAccessFacts(['social'], () => import('@src/response/friend/blocklist/res'))
  );
  xiuxian.use('飞信', () => import('@src/response/flyMail/home/res'));
  xiuxian.use(['宝物', '上古遗珍', '灵脉租契', '确认宝物'], () => import('@src/response/treasures/res'));
  xiuxian.use(['黑盒拍卖', '限时活动', '查看特殊活动'], () => import('@src/response/blackBox/overview/res'));
  xiuxian.use('黑盒排期', () => import('@src/response/blackBox/schedule/res'));
  xiuxian.use('黑盒记录', () => import('@src/response/blackBox/history/res'));
  xiuxian.use('黑盒详情', () => import('@src/response/blackBox/room/res'));
  xiuxian.use('黑盒出价', () => import('@src/response/blackBox/preview/res'));
  xiuxian.use('活动任务', () => import('@src/response/limitedEvent/tasks/res'));
  xiuxian.use('活动道具', () => import('@src/response/limitedEvent/tokens/res'));

  {
    // 验证码
    const captchaMatch = xiuxian.group({});

    captchaMatch.use('黑盒入场', () => import('@src/response/blackBox/join/res'));
    captchaMatch.use(['黑盒提醒', '黑盒预约'], () => import('@src/response/blackBox/reserve/res'));
    captchaMatch.use('黑盒确认', () => import('@src/response/blackBox/confirm/res'));
    captchaMatch.use('黑盒取消', () => import('@src/response/blackBox/cancel/res'));
    captchaMatch.use('黑盒鉴宝', () => import('@src/response/blackBox/probe/res'));
    captchaMatch.use('确认黑盒出价', () => import('@src/response/blackBox/bid/res'));
    captchaMatch.use('黑盒撤标', () => import('@src/response/blackBox/withdraw/res'));
    captchaMatch.use(['签到日历', '签到概览'], () => import('@src/response/signIn/calendar/res'));
    captchaMatch.use('签到', () => import('@src/response/signIn/hub/res'));
    captchaMatch.use('突破', () => import('@src/response/breakthrough/perform/res'));
    captchaMatch.use('冲脉', () => import('@src/response/meditation/pulse/res'));
    captchaMatch.use('晋级', () => import('@src/response/promotion/perform/res'));
    captchaMatch.use(
      ['开启渡劫', '渡劫评级', '渡劫开劫', '捣乱渡劫', '参与观望', '暂避渡劫', '心魔选择', '心魔回答'],
      () => import('@src/response/tribulation/res')
    );
    captchaMatch.use('一键装备', () => import('@src/response/equipment/autoEquip/res'));
    captchaMatch.use('取消一键学习功法', () => import('@src/response/skillBook/batchLearn/res'));

    captchaMatch.use(['一键签到'], () => import('@src/response/signIn/hub/res'));
    captchaMatch.use(['宗门签到', '联盟签到'], () => import('@src/response/guild/checkin/res'));
    captchaMatch.use('好友设置', () => import('@src/response/friend/friendSettings/res'));
    captchaMatch.use('解除道侣', () => import('@src/response/companion/breakup/res'));
    captchaMatch.use('宗门改名', () => import('@src/response/guild/rename/res'));
    captchaMatch.use('取消宗门申请', () => import('@src/response/guild/cancelApplication/res'));
    captchaMatch.use('宗门审核同意', () => import('@src/response/guild/approveApplication/res'));
    captchaMatch.use('宗门审核拒绝', () => import('@src/response/guild/rejectApplication/res'));
    captchaMatch.use('设置身份为', () => import('@src/response/guild/appointRole/res'));
    captchaMatch.use('卸任', () => import('@src/response/guild/resignRole/res'));
    captchaMatch.use('宗主转让', () => import('@src/response/guild/transferLeader/res'));
    captchaMatch.use('设置宗门简介', () => import('@src/response/guild/setIntro/res'));
    captchaMatch.use('设置宗门公告', () => import('@src/response/guild/setNotice/res'));
    captchaMatch.use('添加精华', () => import('@src/response/guild/addEssence/res'));
    captchaMatch.use('移除精华', () => import('@src/response/guild/removeEssence/res'));
    captchaMatch.use('设置申请宗门最低境界', () => import('@src/response/guild/setMinRealm/res'));
    captchaMatch.use('取消队伍申请', () => import('@src/response/team/cancelApplication/res'));
    captchaMatch.use('取消队伍邀请', () => import('@src/response/team/cancelInvitation/res'));
    captchaMatch.use(
      {
        path: '队伍位置设置',
        schema: {
          args: [{ name: 'content', rules: [{ type: 'rest' }] }],
          usage: '/队伍位置设置 <UID|@道友> <位置序号>'
        }
      },
      () => import('@src/response/team/setPosition/res')
    );
    captchaMatch.use('队伍同意', () => import('@src/response/team/approve/res'));
    captchaMatch.use('队伍拒绝', () => import('@src/response/team/reject/res'));
    captchaMatch.use('队伍邀请同意', () => import('@src/response/team/acceptInvitation/res'));
    captchaMatch.use('队伍邀请拒绝', () => import('@src/response/team/rejectInvitation/res'));
    captchaMatch.use(
      {
        path: '队伍踢出',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }],
          usage: '/队伍踢出 <UID|@道友>'
        }
      },
      () => import('@src/response/team/kick/res')
    );
    captchaMatch.use('设置队伍境界门槛', () => import('@src/response/team/setRealm/res'));
    captchaMatch.use(
      {
        path: '转让队长',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }],
          usage: '/转让队长 <UID|@道友>'
        }
      },
      () => import('@src/response/team/transferLeader/res')
    );
    captchaMatch.use(
      {
        path: '邀请入队',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }],
          usage: '/邀请入队 <UID|@道友>'
        }
      },
      () => import('@src/response/team/inviteTeam/res')
    );
    captchaMatch.use(
      {
        path: '结交',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }],
          usage: '/结交 <UID|@道友>'
        }
      },
      () => import('@src/response/friend/befriend/res')
    );
    captchaMatch.use(
      {
        path: '拜师',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }],
          usage: '/拜师 <师父UID|@道友>'
        }
      },
      () => import('@src/response/master/apply/res')
    );
    captchaMatch.use(
      {
        path: '赐丹',
        schema: {
          args: [{ name: 'content', rules: [{ type: 'rest' }] }],
          usage: '/赐丹 <徒弟UID|@道友> [培元丹|筑基丹]'
        }
      },
      () => import('@src/response/master/gift/res')
    );
    captchaMatch.use(
      {
        path: '删除好友',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }],
          usage: '/删除好友 <好友UID|@道友> [确认]'
        }
      },
      () => import('@src/response/friend/deleteFriend/res')
    );
    captchaMatch.use(
      '同意结交',
      withAccessFacts(['social'], () => import('@src/response/friend/acceptBefriend/res'))
    );
    captchaMatch.use(
      {
        path: '逐出师门',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }],
          usage: '/逐出师门 <徒弟UID|@道友>'
        }
      },
      () => import('@src/response/master/expel/res')
    );
    captchaMatch.use(
      '拒绝结交',
      withAccessFacts(['social'], () => import('@src/response/friend/rejectBefriend/res'))
    );
    captchaMatch.use(
      '拉黑',
      withAccessFacts(['social'], () => import('@src/response/friend/blockUser/res'))
    );
    captchaMatch.use(
      '取消拉黑',
      withAccessFacts(['social'], () => import('@src/response/friend/unblockUser/res'))
    );

    captchaMatch.use(
      {
        path: '学习功法',
        schema: {
          args: [{ name: 'content', rules: [{ type: 'rest' }] }],
          usage: '/学习功法 <功法ID> [确认]'
        }
      },
      () => import('@src/response/skillBook/learn/res')
    );

    captchaMatch.use(
      {
        path: '隐藏功法',
        schema: {
          args: [{ name: 'skillBookId', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/skillBook/hide/res')
    );

    captchaMatch.use(
      {
        path: '显示功法',
        schema: {
          args: [{ name: 'skillBookId', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/skillBook/show/res')
    );

    captchaMatch.use(
      {
        path: '装备',
        schema: {
          args: [{ name: 'itemName', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/equipment/equipItem/res')
    );

    captchaMatch.use(
      {
        path: '赠送',
        schema: {
          args: [{ name: 'content', rules: [{ type: 'rest' }] }],
          usage: '/赠送 [类别 名字] [UID|@道友] [数量，默认1]'
        }
      },
      withAccessFacts(['social'], () => import('@src/response/companion/gift/res'))
    );

    captchaMatch.use(
      {
        path: '结为道侣',
        schema: {
          args: [{ name: 'content', rules: [{ type: 'rest' }] }],
          usage: '/结为道侣 [道号|UID|@道友|页码] [誓约序号]'
        }
      },
      withAccessFacts(['social'], () => import('@src/response/companion/propose/res'))
    );

    captchaMatch.use(
      {
        path: '改名',
        schema: {
          args: [{ name: 'name', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/props/rename/res')
    );

    captchaMatch.use(
      {
        path: '改性',
        schema: {
          args: [{ name: 'gender', rules: [{ type: 'rest' }] }],
          usage: '/改性 <男|女>'
        }
      },
      () => import('@src/response/props/rename/res')
    );

    captchaMatch.use(
      {
        path: '改签名',
        schema: {
          args: [{ name: 'signature', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/props/rename/res')
    );

    captchaMatch.use(
      {
        path: '加入宗门',
        schema: {
          args: [{ name: 'guildId', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/guild/joinGuild/res')
    );

    captchaMatch.use(
      {
        path: '同意道侣',
        schema: {
          args: [{ name: 'content', rules: [{ type: 'rest' }] }]
        }
      },
      withAccessFacts(['social'], () => import('@src/response/companion/accept/res'))
    );

    captchaMatch.use(
      {
        path: '升级誓约',
        schema: {
          args: [
            {
              name: 'confirm',
              rules: [{ type: 'rest' }]
            }
          ],
          usage: '/升级誓约 [确认]'
        }
      },
      withAccessFacts(['social'], () => import('@src/response/companion/upgradeOath/res'))
    );

    captchaMatch.use(
      {
        path: '踢出成员',
        schema: {
          args: [{ name: 'member', rules: [{ type: 'rest' }] }],
          usage: '/踢出成员 <UID|@道友>'
        }
      },
      () => import('@src/response/guild/kickMember/res')
    );

    captchaMatch.use(
      {
        path: '一键学习功法',
        schema: {
          // 后端校验完整参数，避免框架在组合业务请求前提前返回。
          args: [{ name: 'confirm', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/skillBook/batchLearn/res')
    );

    captchaMatch.use(
      {
        path: '锁定',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/storage/lock/res')
    );

    captchaMatch.use(
      {
        path: '解锁',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/storage/unlock/res')
    );

    captchaMatch.use(['加入灵药师', '灵药师指引', '继续灵药指引'], () => import('@src/response/profession/joinLingzhi/res'));
    captchaMatch.use(['加入锻造师', '学习锻造图纸'], () => import('@src/response/profession/forge/res'));
    for (const path of ['打造', '确认打造', '锻造进阶', '委托锻造', '确认锻造委托', '接取锻造委托', '取消锻造委托']) {
      captchaMatch.use({ path, schema: { args: [{ name: 'arguments', rules: [{ type: 'rest' }] }] } }, () => import('@src/response/profession/forge/res'));
    }

    captchaMatch.use(
      {
        path: '激活阵盘',
        schema: {
          args: [{ name: 'name', rules: [{ type: 'rest', message: '请提供阵盘名称' }] }]
        }
      },
      () => import('@src/response/caveFormation/activate/res')
    );

    captchaMatch.use(
      {
        path: '移除阵法',
        schema: {
          args: [{ name: 'name', rules: [{ type: 'rest' }] }]
        }
      },
      () => import('@src/response/caveFormation/remove/res')
    );

    // captcha 层可直接枚举的一批固定入口
    captchaMatch.use(['解散宗门'], () => import('@src/response/guild/dissolveGuild/res'));
    captchaMatch.use(['退出宗门'], () => import('@src/response/guild/leaveGuild/res'));
    captchaMatch.use(['取消退出宗门'], () => import('@src/response/guild/cancelLeave/res'));
    captchaMatch.use(['弹劾宗主'], () => import('@src/response/guild/impeachLeader/res'));
    captchaMatch.use(['宗主请假'], () => import('@src/response/guild/leaderLeave/res'));
    captchaMatch.use(['解散队伍'], () => import('@src/response/team/disbandTeam/res'));
    captchaMatch.use(['离开队伍'], () => import('@src/response/team/leaveTeam/res'));
    captchaMatch.use(['取消匹配'], () => import('@src/response/teamMatch/cancel/res'));
    captchaMatch.use(['申请出师'], () => import('@src/response/master/graduateApply/res'));
    captchaMatch.use(['叛离师门'], () => import('@src/response/master/rebel/res'));
    captchaMatch.use(['登仙台签到'], () => import('@src/response/signIn/celestial/res'));
    captchaMatch.use(['活动签到'], () => import('@src/response/limitedEvent/checkin/res'));
    captchaMatch.use(['日常签到'], () => import('@src/response/signIn/daily/res'));
    captchaMatch.use(
      { path: '每日机缘', description: '在机器人 master 开启的群内抽取每日机缘，每个角色每天一次。' },
      () => import('@src/response/dailyFortune/res')
    );
    captchaMatch.use(
      { path: '今日机缘', description: '在机器人 master 开启的群内抽取每日机缘，每个角色每天一次。' },
      () => import('@src/response/dailyFortune/res')
    );
    captchaMatch.use(['新人签到'], () => import('@src/response/signIn/newcomer/res'));
    captchaMatch.use(['初入仙途签到', '新人狂欢签到'], () => import('@src/response/activity/newcomerLoginClaim/res'));

    // captcha 层的社交/师门固定入口
    captchaMatch.use(
      '拒绝道侣',
      withAccessFacts(['social'], () => import('@src/response/companion/reject/res'))
    );
    captchaMatch.use('同意拜师', () => import('@src/response/master/accept/res'));
    captchaMatch.use('同意出师', () => import('@src/response/master/graduateAccept/res'));
    captchaMatch.use('拒绝出师', () => import('@src/response/master/graduateReject/res'));
    captchaMatch.use('一键传功', () => import('@src/response/master/teachAll/res'));
    captchaMatch.use(['一键赐福', '一键赐丹'], () => import('@src/response/master/supportAll/res'));
    captchaMatch.use(
      {
        path: '传功',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }],
          usage: '/传功 <徒弟UID|@道友>'
        }
      },
      () => import('@src/response/master/teach/res')
    );
    captchaMatch.use(
      {
        path: '赐福',
        schema: {
          args: [{ name: 'target', rules: [{ type: 'rest' }] }],
          usage: '/赐福 <徒弟UID|@道友>'
        }
      },
      () => import('@src/response/master/bless/res')
    );

    {
      captchaMatch.use('创建队伍', () => import('@src/response/team/createTeam/res'));

      captchaMatch.use(
        {
          path: '加入队伍',
          schema: {
            args: [{ name: 'teamId', rules: [{ type: 'rest' }] }]
          }
        },
        () => import('@src/response/team/joinTeam/res')
      );

      captchaMatch.use(
        {
          path: '匹配主线',
          schema: {
            args: [{ name: '章节关卡', rules: [{ type: 'rest' }] }],
            usage: '/匹配主线 <章节号-关卡号>'
          }
        },
        () => import('@src/response/teamMatch/startMainline/res')
      );

      captchaMatch.use(
        {
          path: '匹配秘境',
          schema: {
            args: [{ name: 'dungeonId', rules: [{ type: 'rest' }] }]
          }
        },
        () => import('@src/response/teamMatch/startDungeon/res')
      );

      {
        const seclusion = captchaMatch.group({});

        seclusion.use('打劫记录', () => import('@src/response/robberyRecord/res'));
        seclusion.use('可打劫道友', () => import('@src/response/pkTargets/res'));
        seclusion.use('隐藏物品', () => import('@src/response/pkHiding/res'));
        seclusion.use('设置隐藏', () => import('@src/response/pkHide/res'));
        seclusion.use('争夺历史', () => import('@src/response/pkHistory/res'));
        seclusion.use('争夺战报', () => import('@src/response/pkReport/res'));
        seclusion.use('争夺回放', () => import('@src/response/pkReplay/res'));
        seclusion.use('购买', () => import('@src/response/shop/buy/res'));
        seclusion.use('领取凶兽奖励', () => import('@src/response/worldBoss/claim/res'));
        seclusion.use('新人任务领取', () => import('@src/response/activity/newcomerTaskClaim/res'));
        seclusion.use('挑战排名', () => import('@src/response/ranking/challengeRank/res'));
        seclusion.use(['登天挑战', '天骄挑战'], () => import('@src/response/tianjiao/challenge/res'));
        seclusion.use('领取宝箱', () => import('@src/response/storyline/claimChest/res'));
        seclusion.use('一键领取宝箱', () => import('@src/response/storyline/claimAllChests/res'));
        seclusion.use('妖塔选buff', () => import('@src/response/demonTower/buff/res'));
        seclusion.use(alchemyRoutes, () => import('@src/response/alchemy/v2/res'));

        seclusion.use(
          {
            path: '点赞人气',
            schema: {
              args: [{ name: 'content', rules: [{ type: 'rest' }] }],
              usage: '/点赞人气 <UID|@道友> <榜单标识>'
            }
          },
          () => import('@src/response/leaderboard/popularity/like/res')
        );
        seclusion.use(['宗门挖矿', '宗门采矿'], () => import('@src/response/guild/mining/res'));
        seclusion.use('切换神通', () => import('@src/response/skillBook/switch/res').then(m => ({ default: m.switchMysticSkill })));
        seclusion.use('切换战技', () => import('@src/response/skillBook/switch/res').then(m => ({ default: m.switchBattleSkill })));
        seclusion.use('切换被动技', () => import('@src/response/skillBook/switch/res').then(m => ({ default: m.switchPassiveSkill })));
        seclusion.use('兑换码', () => import('@src/response/redeemCode/res'));
        seclusion.use(['礼包码', '礼品码'], () => import('@src/response/redeemCode/claim/res'));
        seclusion.use('领取邀请奖励', () => import('@src/response/referral/claimReward/res'));
        seclusion.use(['回归奖励', '回归签到'], () => import('@src/response/comeback/native/res'));
        seclusion.use('领取回归奖励', () => import('@src/response/comeback/nativeClaim/res'));
        seclusion.use('绑定邀请码', () => import('@src/response/referral/bindCode/res'));
        seclusion.use(
          {
            path: '探索秘境',
            schema: {
              args: [{ name: 'content', rules: [{ type: 'rest' }] }],
              usage: '/探索秘境 [秘境名] [时长]'
            }
          },
          () => import('@src/response/seclusion/info/res')
        );
        seclusion.use(
          ['战斗模板', '保存战斗模板', '应用战斗模板', '删除战斗模板'],
          withAccessFacts(['social'], () => import('@src/response/battleTemplate/res'))
        );
        seclusion.use('道侣签到', () => import('@src/response/companion/claimDaily/res'));
        seclusion.use('道侣月卡', () => import('@src/response/companion/claimMonthCard/res'));
        seclusion.use('道侣任务', () => import('@src/response/companion/dailyTask/res'));
        seclusion.use('道侣商店兑换', () => import('@src/response/companion/shopBuy/res'));
        seclusion.use('选购', () => import('@src/response/market/confirmBuy/res'));
        seclusion.use(
          {
            path: '逛店',
            schema: {
              args: [{ name: 'content', rules: [{ type: 'rest' }] }],
              usage: '/逛店 <UID|@道友> [页码]'
            }
          },
          () => import('@src/response/shop/playerShop/visit/res')
        );
        seclusion.use('交易上架', () => import('@src/response/market/sell/res'));
        seclusion.use('交易下架', () => import('@src/response/market/cancel/res'));
        seclusion.use('命名店铺', () => import('@src/response/shop/playerShop/rename/res'));
        seclusion.use('店铺简介', () => import('@src/response/shop/playerShop/description/res'));
        seclusion.use(['消耗', '服用', '炼化'], () => import('@src/response/consume/res'));

        seclusion.use('小绿瓶存储', () => import('@src/response/greenBottle/store/res'));
        seclusion.use('开启礼盒', () => import('@src/response/lootbox/open/res'));
        seclusion.use('创建宗门', () => import('@src/response/guild/createGuild/res'));
        seclusion.use('分解功法', () => import('@src/response/skillBook/decompose/res'));
        seclusion.use('分解装备', () => import('@src/response/equipment/decompose/res'));
        seclusion.use('一键分解装备', () => import('@src/response/equipment/batchDecompose/res'));
        seclusion.use(['出关', '打坐结束', '结束打坐'], () => import('@src/response/meditation/end/res'));
        seclusion.use('领取日常活跃奖励', () => import('@src/response/activityPoints/claimDaily/res'));
        seclusion.use(['领取全部日常活跃奖励', '一键领取日常活跃奖励'], () => import('@src/response/activityPoints/claimAll/res'));
        seclusion.use(
          '双修',
          withAccessFacts(['social'], () => import('@src/response/companion/dualCultivation/res'))
        );
        seclusion.use(['月卡领取', '月卡签到', '一键领取', '一键领取月卡'], () => import('@src/response/monthCard/claim/res'));
        seclusion.use('经络', () => import('@src/response/meditation/meridian/res'));
        seclusion.use('一键分解功法', () => import('@src/response/skillBook/batchDecompose/res'));
        seclusion.use(['闭关加速', '打坐加速'], () => import('@src/response/meditation/start/res'));
        seclusion.use('打坐', () => import('@src/response/meditation/start/res'));
        seclusion.use(
          { path: '闭关', schema: { args: [{ name: 'content', rules: [{ type: 'rest' }] }], usage: '/闭关' } },
          () => import('@src/response/meditation/start/res')
        );
        seclusion.use(
          ['返程', '结束探索'],
          withAccessFacts(['realm'], () => import('@src/response/seclusion/end/res'))
        );
        seclusion.use('确认培元丹', () => import('@src/response/peiyuanDan/confirm/res'));
        seclusion.use('取消培元丹', () => import('@src/response/peiyuanDan/cancel/res'));
        seclusion.use('确认明悟丹', () => import('@src/response/mingwudan/confirm/res'));
        seclusion.use('升级功法', () => import('@src/response/skillBook/batchUpgrade/res'));
        seclusion.use('重制功法', () => import('@src/response/skillBook/reset/res'));
        seclusion.use(['确认重制功法', '取消重制功法'], () => import('@src/response/skillBook/reset/res'));
        seclusion.use('换词', () => import('@src/response/skillBook/reroll/res'));
        seclusion.use(['确认换词'], () => import('@src/response/skillBook/reroll/res'));
        seclusion.use(['取消换词'], () => import('@src/response/skillBook/reroll/res'));
        seclusion.use('悟道', () => import('@src/response/skillBook/wudao/res'));
        seclusion.use('卸下', () => import('@src/response/equipment/unequipItem/res'));
        seclusion.use('换下战技', () => import('@src/response/skillBook/unequip/res').then(m => ({ default: m.unequipBattleSkill })));
        seclusion.use('换下被动技', () => import('@src/response/skillBook/unequip/res').then(m => ({ default: m.unequipPassiveSkill })));
        seclusion.use('换下神通', () => import('@src/response/skillBook/unequip/res').then(m => ({ default: m.unequipMysticSkill })));

        seclusion.use('分离', () => import('@src/response/soulArtifact/unequip/res'));
        seclusion.use('本命物升级', () => import('@src/response/soulArtifact/upgrade/res'));
        seclusion.use('本命物升品', () => import('@src/response/soulArtifact/gradeUp/res'));
        seclusion.use('本命物洗涤', () => import('@src/response/soulArtifact/wash/res'));
        seclusion.use(['确认本命物洗涤'], () => import('@src/response/soulArtifact/washConfirm/res'));
        seclusion.use(['取消本命物洗涤'], () => import('@src/response/soulArtifact/washCancel/res'));
        seclusion.use('领取首通奖励', () => import('@src/response/ranking/claimFirst/res'));
        seclusion.use('领取月度奖励', () => import('@src/response/ranking/claimMonthly/res'));
        seclusion.use('妖塔重置', () => import('@src/response/demonTower/reset/res'));
        seclusion.use('领取周常活跃奖励', () => import('@src/response/activityPoints/claimWeekly/res'));
        seclusion.use(['领取全部周常活跃奖励', '一键领取周常活跃奖励'], () => import('@src/response/activityPoints/claimAll/res'));
        seclusion.use(['一键领取邮件'], () => import('@src/response/email/receiveAllEmail/res'));
        seclusion.use(['一键删除邮件'], () => import('@src/response/email/deleteAllEmail/res'));
        seclusion.use('领取邮件', () => import('@src/response/email/receiveEmail/res'));
        seclusion.use('删除邮件', () => import('@src/response/email/deleteEmail/res'));
        seclusion.use(
          ['一键领取成就', '成就 一键领取'],
          withAccessFacts(['social'], () => import('@src/response/achievements/claimAll/res'))
        );
        seclusion.use('新人返利领取', () => import('@src/response/recharge/newcomerClaim/res'));
        seclusion.use('周周返利领取', () => import('@src/response/recharge/weeklyRebateClaim/res'));
        seclusion.use(
          ['里程碑', '世界里程碑'],
          withAccessFacts(['realm'], () => import('@src/response/recharge/milestone/res'))
        );
        seclusion.use('配置秘境模式', () => import('@src/response/message/config/mode/res'));
        seclusion.use('配置闭关自动加速', () => import('@src/response/message/config/meditationAutoBoost/res'));
        seclusion.use('配置组队精力', () => import('@src/response/message/config/energy/res'));
        seclusion.use('配置好友自动审批进队', () => import('@src/response/message/config/friendAutoApprove/res'));
        seclusion.use('配置接受队伍邀请', () => import('@src/response/message/config/teamInviteEnabled/res'));
        seclusion.use('配置自动同意队伍邀请', () => import('@src/response/message/config/autoAcceptInvite/res'));
        seclusion.use('配置信息隐藏', () => import('@src/response/message/config/hideProfile/res'));
        seclusion.use(['配置灵晶确认', '配置道晶确认'], () => import('@src/response/message/config/confirmThreshold/res'));
        seclusion.use('领取宗门俸禄', () => import('@src/response/guild/stipend/res'));
        seclusion.use(['领取宗门日活奖励', '领取宗门周活奖励'], () => import('@src/response/guild/claimMilestone/res'));
        seclusion.use(
          ['领取全部宗门日活奖励', '领取全部宗门周活奖励', '一键领取宗门日活奖励', '一键领取宗门周活奖励'],
          () => import('@src/response/guild/claimAllMilestones/res')
        );
        seclusion.use('发红包', () => import('@src/response/guild/sendRedPacket/res'));
        seclusion.use('领红包', () => import('@src/response/guild/claimRedPacket/res'));
        seclusion.use('回收红包', () => import('@src/response/guild/recycleRedPacket/res'));
        seclusion.use('提升宗门等级', () => import('@src/response/guild/upgradeLevel/res'));
        seclusion.use('提升宗门灵脉', () => import('@src/response/guild/upgradeVein/res'));
        seclusion.use('提升宗门商店', () => import('@src/response/guild/upgradeShop/res'));
        seclusion.use('宗门商店兑换', () => import('@src/response/guild/exchange/res'));
        seclusion.use(['灵脉攻防战领取奖励', '秘境攻防领取奖励'], () => import('@src/response/guildSecretRealmWar/claim/res'));
        seclusion.use('宗门大比报名', () => import('@src/response/guildCompetition/apply/res'));
        seclusion.use(
          {
            path: '添加宗门大比成员',
            schema: {
              args: [{ name: 'content', rules: [{ type: 'rest' }] }],
              usage: '/添加宗门大比成员 [UID|@道友] [位置]'
            }
          },
          () => import('@src/response/guildCompetition/addMember/res')
        );
        seclusion.use('移除宗门大比成员', () => import('@src/response/guildCompetition/removeMember/res'));
        seclusion.use('调整宗门大比位置', () => import('@src/response/guildCompetition/adjustPosition/res'));
        seclusion.use('清空宗门大比队伍', () => import('@src/response/guildCompetition/clearTeam/res'));
        seclusion.use('押注宗门大比', () => import('@src/response/guildCompetition/bet/res'));
        seclusion.use('追投宗门大比', () => import('@src/response/guildCompetition/followBet/res'));
        seclusion.use('领取宗门大比奖励', () => import('@src/response/guildCompetition/claimReward/res'));
        seclusion.use(
          [
            {
              path: '发飞信',
              schema: {
                args: [{ name: 'content', rules: [{ type: 'rest' }] }],
                usage: '/发飞信 <好友UID|@道友> <内容>'
              }
            },
            '发师门飞信',
            '发宗门飞信',
            '发队伍飞信',
            '发道侣飞信'
          ],
          () => import('@src/response/flyMail/send/res')
        );
        seclusion.use(
          [
            {
              path: '飞信禁言',
              schema: {
                args: [{ name: 'target', rules: [{ type: 'rest' }] }],
                usage: '/飞信禁言 <UID|@道友>'
              }
            },
            {
              path: '飞信解除',
              schema: {
                args: [{ name: 'target', rules: [{ type: 'rest' }] }],
                usage: '/飞信解除 <UID|@道友>'
              }
            }
          ],
          () => import('@src/response/flyMail/mute/res')
        );
        seclusion.use('活动任务领取', () => import('@src/response/limitedEvent/taskClaim/res'));

        {
          // 战斗玩法
          const meditation = seclusion.group({});

          meditation.use('主线挑战', () => import('@src/response/storyline/challenge/res'));
          meditation.use('主线扫荡', () => import('@src/response/storyline/sweep/res'));
          meditation.use('妖塔挑战', () => import('@src/response/demonTower/challenge/res'));
          meditation.use('挑战凶兽', () => import('@src/response/worldBoss/challenge/res'));
          meditation.use('秘境挑战', () => import('@src/response/dungeon/enter/res'));
          meditation.use(['一键挑战', '连续爬塔'], () => import('@src/response/ranking/batchChallenge/res'));
          meditation.use(['扫荡秘境', '扫荡免费秘境'], () => import('@src/response/dungeon/sweep/res'));
          meditation.use('扫荡排名', () => import('@src/response/ranking/sweepLower/res'));

          meditation.use(
            [
              {
                path: '比试',
                schema: {
                  args: [{ name: 'target', rules: [{ type: 'rest' }] }],
                  usage: '/比试 <UID|@道友>'
                },
                description: '与指定目标进行比试，支持直接输入 UID，或通过 @ 自动识别对方。'
              },
              '切磋',
              '比斗',
              '十连比试'
            ],
            () => import('@src/response/spar/res')
          );

          meditation.use('挑战稻草人', () => import('@src/response/scarecrow/res'));
          meditation.use(['灵脉攻防战挑战', '秘境攻防挑战'], () => import('@src/response/guildSecretRealmWar/challenge/res'));
          meditation.use('挑战宗门', () => import('@src/response/guildCompetition/challenge/res'));
          meditation.use(
            {
              path: '打劫',
              schema: {
                args: [{ name: 'target', rules: [{ type: 'rest' }] }],
                usage: '/打劫 <UID|@道友>'
              },
              description: '对指定目标发起打劫，支持直接输入 UID，或通过 @ 自动识别对方。'
            },
            () => import('@src/response/robbery/res')
          );
          meditation.use(
            {
              path: '三连打劫',
              schema: {
                args: [{ name: 'target', rules: [{ type: 'rest' }] }],
                usage: '/三连打劫 <UID|@道友>'
              },
              description: '对指定目标连续打劫最多三次，按每次实际结算消耗元力，条件不足时停止。'
            },
            () => import('@src/response/robbery/triple/res')
          );
          meditation.use('回击', () => import('@src/response/counterAttack/res'));
          meditation.use('接赏', () => import('@src/response/bounty/accept/res'));
          meditation.use('继续接赏', () => import('@src/response/bounty/challenge/res'));
          meditation.use('妖塔扫荡', () => import('@src/response/demonTower/sweep/res'));
        }
      }
    }
  }
}

// 没有精确业务路由消费任务上下文时，单次调用任务终端动作。
app.res({ events: [...commandEvents] }, () => import('@src/response/mwTaskContinuation'));

// useEvent() 的父级 next 直接到这里；兜底只消费 event.__res。
app.res({ events: [...commandEvents] }, () => import('@src/response/mwBusinessFallback'));

/** @deprecated Legacy diagnostics only; the active middleware never matches routes or sends stage flags. */
export function resolveCommandTransportProfile(_event: GameEvent): RobotCommandProfile {
  return { checkMute: false, playerEntry: false, trackOperation: false };
}

// Match registered DSL commands without dispatching lazy handlers or exposing
// the Router instance as the response configuration's default export.
export const matchesGameCommand = (event: { name?: string; MessageText?: string }): boolean => app.match(event).matched;

export default app.define;
