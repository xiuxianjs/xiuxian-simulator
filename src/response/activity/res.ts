import { parseRobotActivityHub } from '@src/api/bot/activity-hub';
import { selects } from '@src/response/config';
import { checkEncounterAfterPanel } from '@src/response/onlineEncounter/afterPanel';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { commandText } from '@src/utils/commandPrefix';
import { presentationCommandFilter } from '@src/utils/featureVisibility';
import { formatGameTime, parseGameTime } from '@src/utils/gameTime';
import { FormatGui } from '@src/utils/messageHelper';
import { useMessage } from '@src/utils/useMessage';
import { Format, onResponse, useEvent } from 'alemonjs';
/**
 * 产品定位：/我的活动 是机器人的「玩法大厅」，同时承载常驻玩法与运营活动。
 * 下列入口按服务端当前境界规则展示；未开放玩法在天书中预告。
 * 入口可见不代表允许参与：境界、开放时间、次数等资格由目标玩法的服务端校验，
 * 本菜单不复制准入规则。新增同类公共玩法时，也应在大厅提供可发现的入口。
 */
// 个人页优先日常任务、限时与新人内容，再展示挑战、交易与榜单。
// 宗门页优先日常参与与养成，再展示竞争玩法和商店。
// 已开放入口保持原有优先级。
const PERSONAL_ROWS = [
  { label: '我的奇遇', command: '/我的奇遇', introduction: '我的兄弟也是主角？' },
  { label: '活跃任务', command: '/日常活跃', introduction: '我修，这仙我修还不成嘛' },
  { label: '半月活动', command: '/半月活动', introduction: '每月第三个周日开放,开放一周' },
  { label: '成就', command: '/成就', introduction: '天才只是见我的门槛' },
  // { label: '拍卖会', command: '/黑盒拍卖', introduction: '按场次鉴宝、匿名暗标竞拍' }, // 拍卖会下架
  { label: '上古遗珍', command: '/上古遗珍', introduction: '夺天地之造化' },
  { label: '宝物', command: '/宝物', introduction: '你的宝物，与我有缘' },
  { label: '通天塔', command: '/通天塔', introduction: '既见仙人，为何不拜' },
  { label: '镇妖塔', command: '/妖塔', introduction: '魔可虾，妖亦可虾' },
  { label: '登天梯', command: '/登天梯', introduction: '谁敢言不败，谁敢言无敌' },
  { label: '劫云榜', command: '/劫云榜', introduction: '落子无悔啊，落子无悔' },
  { label: '新人狂欢', command: '/新人狂欢', introduction: '初入仙途，寻仙问道' },
  { label: '邀请奖励', command: '/邀请奖励', introduction: '举杯，共饮天上水' },
  { label: '稻草人', command: '/挑战稻草人', introduction: '我的剑，也未尝不利' },
  { label: '悬赏', command: '/悬赏榜', introduction: '今日恩怨，今日了' },
  { label: '杀神榜', command: '/杀神榜', introduction: '管虾不管埋，以虾证道' },
  // { label: '小店', command: '/小店', introduction: '逛逛道友小店' }, // 小店下架
  { label: '珍宝楼', command: '/珍宝楼', introduction: '大佬也得来我这里买神器' },
  { label: '风云榜', command: '/排行榜', introduction: '唯有吾，敢称天下第一' }
];

const GUILD_ROWS = [
  { label: '宗门活跃', command: '/宗门日常', introduction: '完成宗门任务，查看活跃奖励' },
  { label: '宗门挖矿', command: '/宗门挖矿', introduction: '参与宗门采矿' },
  { label: '宗门祭祖', command: '/祭祀祖师', introduction: '祭祀祖师，查看供奉与奖励' },
  { label: '宗门主线', command: '/宗门主线', introduction: '推进宗门主线，挑战关卡' },
  { label: '宗门战备', command: '/宗门战备', introduction: '查看宗门战备，提升团队与个人属性' },
  { label: '灵脉攻防战', command: '/灵脉攻防战', introduction: '争夺秘境，为宗门拓土' },
  // { label: '宗门大比', command: '/宗门大比', introduction: '宗门列阵，比武争雄' }, // 宗门大比下架
  { label: '宗门商店', command: '/宗门商店', introduction: '查看宗门商店，兑换所需物品' }
];

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const bid = e?.UserId;
  const isPrivate = e.isPrivate ?? false;
  const [, next] = useEvent();
  const loaded = await runRobotBusiness(e, 'activity.hub', {}, parseRobotActivityHub, next, async reply => {
    await message.send(FormatGui({ isPrivate, bid, title: '', content: Format.createMarkdown().addText(reply.text) }));
  });

  if (loaded.handled) {
    return;
  }
  const md = Format.createMarkdown();
  const isGuild = /^[!！/#＃]?宗门活动$/.test((e.MessageText ?? '').trim());

  const allowed = await presentationCommandFilter(e);
  const entries = (isGuild ? GUILD_ROWS : PERSONAL_ROWS).filter(entry => allowed(entry.command));

  for (const entry of entries) {
    const row = Format.createMarkdown()
      .addButton(markdownButtonLabel(`${entry.label}`), { data: commandText(entry.command), autoEnter: false })
      .addText(` — ${entry.introduction}`);

    if (entry.command === '/灵脉攻防战') {
      const { activeStartAt, activeEndAt } = loaded.data.guildSecretRealmWar;
      const start = parseGameTime(activeStartAt);
      const end = parseGameTime(activeEndAt);

      // No placeholder dates, guessed schedules or participation-state text.
      if (start && end && start.year() > 1 && end.isAfter(start)) {
        row.addNewline().addText(`开放：${formatGameTime(activeStartAt)} ~ ${formatGameTime(activeEndAt)}`);
      }
    }
    md.addBlockquote(row);
  }
  if (!entries.length) {
    md.addText('当前暂无已开放入口，可查阅天书了解解锁条件。');
  }

  await checkEncounterAfterPanel(
    e,
    'activity',
    message,
    message.send(
      FormatGui({
        isPrivate,
        bid,
        title: '修仙界风云',
        header: [
          { label: '个人', selected: !isGuild, command: '/个人活动' },
          ...(GUILD_ROWS.some(entry => allowed(entry.command)) ? [{ label: '宗门', selected: isGuild, command: '/宗门活动' }] : [])
        ],
        // 活动中心只承载玩法与活动；礼包码、福利导航不混入此气泡。
        content: md
      })
    )
  );
});
