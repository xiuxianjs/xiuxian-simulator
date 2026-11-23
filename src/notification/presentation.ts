import { buildBubble } from '@src/response/presentation/bubble';
import { noticeTitle } from '@src/response/presentation/format';
import { section, type BubbleAction } from '@src/response/presentation/sections';
import { noticeBubble } from '@src/response/presentation/presets';
import { Format, type DataEnums } from 'alemonjs';
import { addOptions } from '@src/utils/messageHelper';

type Action = BubbleAction;

export const fishingBossNotificationSource = 'fishing.boss.discovered';

export function fishingBossNoticeCommand(eventId: unknown): string | undefined {
  return typeof eventId === 'string' && /^fb_[0-9a-f]{32}$/.test(eventId) ? `/垂钓 奇遇 ${eventId}` : undefined;
}

function notificationReference(text: string, pattern: RegExp): string | undefined {
  const id = text.match(pattern)?.[1];

  return id && Number.isSafeInteger(Number(id)) && Number(id) > 0 ? id : undefined;
}

function notificationActions(source: string, text: string): Action[] {
  if (source === 'black-box.announcement') {
    const match = text.match(/\/(?:黑盒排期|黑盒拍卖) (\d{2}):(\d{2})(?!\d)/);
    const time = match && Number(match[1]) < 24 && Number(match[2]) < 60 ? ` ${match[1]}:${match[2]}` : '';

    return [{ label: '查看本场', command: `/黑盒排期${time}` }];
  }
  if (source === 'black-box.opening' || source === 'black-box.started') {
    const match = text.match(/\/(黑盒入场|黑盒详情) (\d+) (D\d{2}-\d{4}-[ABC])/);
    const expected = source === 'black-box.opening' ? '黑盒入场' : '黑盒详情';

    if (match?.[1] === expected && Number.isSafeInteger(Number(match[2])) && Number(match[2]) > 0) {
      return [{ label: source === 'black-box.opening' ? '参加匹配' : '私聊查看本组', command: `/${expected} ${match[2]} ${match[3]}` }];
    }

    return [{ label: '查看本人记录', command: '/黑盒记录' }];
  }
  if (source === 'black-box.admission') {
    return [{ label: '查看流拍原因', command: '/黑盒记录' }];
  }
  if (source === 'black-box.result') {
    const match = text.match(/\/黑盒详情 (\d+) (D\d{2}-\d{4}-[ABC])(?=\s|$)/);

    if (match && Number.isSafeInteger(Number(match[1])) && Number(match[1]) > 0) {
      return [
        { label: '查看本场结果', command: `/黑盒详情 ${match[1]} ${match[2]}` },
        { label: '本人记录', command: '/黑盒记录' }
      ];
    }
  }
  if (source === 'black-box.reminder' || source === 'black-box.result') {
    return [{ label: source === 'black-box.reminder' ? '查看预约' : '查看结果', command: '/黑盒记录' }];
  }
  if (source.startsWith('pk.')) {
    // 只链接原战报，是否仍能反击由查看时的服务端状态决定。
    const reportId = notificationReference(text, /战报\s*#(\d+)/);

    return [{ label: '查看战报', command: reportId ? `/争夺战报 ${reportId}` : '/打劫记录' }];
  }
  if (source === 'meditation.limit') {
    return [{ label: '出关领取', command: '/出关' }];
  }
  if (source === 'exploration.completed') {
    return [{ label: '返程结算', command: '/返程' }];
  }
  if (source === 'cave.plot.matured') {
    return [{ label: '查看灵田', command: '/灵田' }];
  }
  if (source === 'forge.order.expired') {
    return [{ label: '查看委托', command: '/锻造委托' }];
  }
  if (source === 'tribulation.settled') {
    const eventId = notificationReference(text, /\/渡劫结算 (\d+)/);

    return [{ label: '本次结算', command: eventId ? `/渡劫结算 ${eventId}` : '/我的渡劫' }];
  }
  if (source.startsWith('tribulation.')) {
    return [{ label: '我的渡劫', command: '/我的渡劫' }];
  }
  if (source === 'friend.request.created') {
    return [
      { label: '好友申请', command: '/好友申请' },
      { label: '我的好友', command: '/我的好友' }
    ];
  }
  if (source.startsWith('friend.request.')) {
    return [{ label: '我的好友', command: '/我的好友' }];
  }
  if (source === 'companion.proposal.created') {
    return [{ label: '处理道侣申请', command: '/同意道侣' }];
  }
  if (source === 'companion.anniversary.gift') {
    return [
      { label: '查收周年礼物', command: '/我的邮件' },
      { label: '我的道侣', command: '/我的道侣' }
    ];
  }
  if (source.startsWith('companion.')) {
    return [{ label: '我的道侣', command: '/我的道侣' }];
  }
  if (source === 'master.proposal.created') {
    return [{ label: '查看拜师申请', command: '/同意拜师' }];
  }
  if (source === 'master.graduation.created') {
    return [{ label: '查看出师申请', command: '/同意出师' }];
  }
  if (source.startsWith('master.')) {
    return [{ label: '我的师门', command: '/我的师门' }];
  }
  if (/^team\.invitation:\d+:created$/.test(source)) {
    return [{ label: '查看队伍邀请', command: '/我的队伍邀请' }];
  }
  if (/^team\.application:\d+:created$/.test(source)) {
    return [{ label: '审核入队申请', command: '/队伍申请' }];
  }
  if (/^team\.application:\d+:rejected$/.test(source)) {
    return [
      { label: '我的入队申请', command: '/我的队伍申请' },
      { label: '寻找队伍', command: '/队伍列表' }
    ];
  }
  if (source === 'team.match' && /^(?:匹配超时\n|【组队匹配超时】)/.test(text)) {
    // 通知未下发模式和目标编号，先选择目标，不能猜测并自动重新排队。
    return [
      { label: '选择秘境', command: '/查看秘境' },
      { label: '选择主线', command: '/查看主线' }
    ];
  }
  if (source.startsWith('team.') || source.startsWith('team:')) {
    return [{ label: '我的队伍', command: '/我的队伍' }];
  }
  if (source === 'guild.competition.reward') {
    return [
      { label: '领取大比奖励', command: '/领取宗门大比奖励' },
      { label: '宗门大比', command: '/宗门大比' }
    ];
  }
  if (source === 'guild.application.rejected' || source === 'guild.member.kicked' || source === 'guild.dissolve') {
    return [{ label: '寻找宗门', command: '/宗门列表' }];
  }
  if (['guild.leave.successor', 'guild.leadership.transfer', 'guild.leadership.impeach.successor'].includes(source)) {
    return [{ label: '宗门管理', command: '/我的宗门 管理' }];
  }
  if (source === 'guild.red_packet.sent') {
    return [{ label: '查看宗门红包', command: '/宗门红包' }];
  }
  if (source.startsWith('guild.')) {
    return [{ label: '我的宗门', command: '/我的宗门' }];
  }
  if (source === 'scheduled.email.sent') {
    return [{ label: '查收邮件', command: '/我的邮件' }];
  }
  if (source === 'market.listing.expired') {
    return [
      { label: '我的上架', command: '/我的上架' },
      { label: '储物袋', command: '/储物袋' }
    ];
  }
  if (source.startsWith('bounty.expired.')) {
    // 赏金和退款已经入账，不再提供领取按钮。
    return [
      { label: '查看灵晶', command: '/我' },
      { label: '悬赏榜', command: '/悬赏榜' }
    ];
  }

  return [];
}

/** 服务端标题属于纯文本正文；平台展示和历史记录复用相同分行。 */
export function notificationTextLayout(text: string): { title: string; lines: string[] } {
  const normalized = text.replace(/\r\n/g, '\n');
  const match = normalized.match(/^【([^\n】]+)】\n\n/);

  return { title: match?.[1] ?? '修仙 · 通知', lines: (match ? normalized.slice(match[0].length) : normalized).split('\n') };
}

/** Only fishing-result callers may turn the original cast reference into a link. */
export function fishingNotificationLayout(text: string, castId?: unknown) {
  const normalized = text.replace(/\r\n/g, '\n');
  const legacy = /\n\n查看战报：\/垂钓 战报 (fc_[0-9a-f]{32})[ \t]*\n?$/.exec(normalized);
  const body = legacy ? normalized.slice(0, legacy.index) : normalized;
  const layout = notificationTextLayout(body.replace(/^(洞府垂钓 · (?:稀有鱼|鱼王)渔讯)\n{1,2}/, '【$1】\n\n'));
  const original = castId === undefined ? legacy?.[1] : castId;
  const reportCommand = typeof original === 'string' && /^fc_[0-9a-f]{32}$/.test(original) ? `/垂钓 战报 ${original}` : undefined;

  return { ...layout, reportCommand };
}

/** 归档保留正文，仅把匹配合法战报编号的原命令换成按钮。 */
export function pkHistoryReportLayout(id: string, lines: string[]) {
  if (!/^pk:[1-9]\d*:(?:ordinary|expired|counter_won|counter_lost|delivery):[1-9]\d*$/.test(id)) {
    return { lines };
  }
  const reportId = notificationReference(lines.join('\n'), /^普通(?:被打|打劫)战报\s*#([1-9]\d*)[。]?$/m);

  if (!reportId) {
    return { lines };
  }
  const reportCommand = `/争夺战报 ${reportId}`;

  return { lines: lines.filter(line => line.trim() !== `查看战报：${reportCommand}`), reportCommand };
}

const pkReportTitle = '普通被打战报';
const expiredReportTitle = '普通打劫战报';
const expiredCurrency = '货币：灵石、灵晶结算不变';

function ordinaryPKNotice(lines: string[]) {
  const reportId = notificationReference(lines[0] ?? '', /^普通被打战报 #([1-9]\d*)$/);

  if (!reportId || !lines.includes('结果：本次普通被打已结算')) {
    return undefined;
  }

  const deadlineLine = lines.find(line => line.startsWith('反击截止：'));
  const deadline = /^反击截止：\d{4}-(\d{2}-\d{2} \d{2}:\d{2}:\d{2})（北京时间）$/.exec(deadlineLine ?? '')?.[1];
  const experienceLine = lines.find(line => line.startsWith('本次被打获得修为'));
  const experience = /^本次被打获得修为([1-9]\d*)$/.exec(experienceLine ?? '')?.[1];

  if ((deadlineLine && !deadline) || (experienceLine && !experience)) {
    return undefined;
  }

  const facts = [experience && `修为：+${experience}`, deadline && `反击截止：${deadline}`].filter(Boolean);
  const item = lines.find(line => line.startsWith('物品：'));

  return pkNotice(pkReportTitle, reportId, [...(facts.length ? [facts.join(' · ')] : ['结果：已结算']), ...(item ? [item] : [])]);
}

function expiredPKNotice(lines: string[]) {
  const [role, report] = lines;
  const reportId = notificationReference(report ?? '', /^普通打劫战报\s*#([1-9]\d*)$/);

  if (!reportId || !/^你的身份：(受袭者|原打劫者)$/.test(role) || !lines.includes('反击状态：窗口已结束') || !lines.includes(expiredCurrency)) {
    return undefined;
  }

  const details = joinNotificationWrapping(lines.slice(2)).filter(
    line => line.trim() && line !== '反击状态：窗口已结束' && line !== expiredCurrency && line !== `查看战报：/争夺战报 ${reportId}`
  );

  if (details.some(line => !/^(物品|原物归属|交付状态|处理)：/.test(line))) {
    return undefined;
  }

  return pkNotice(expiredReportTitle, reportId, [role.replace('你的身份：', '身份：'), ...details]);
}

function pkNotice(title: string, reportId: string, lines: string[]) {
  return buildBubble({
    title: '修仙 · 通知',
    sections: [
      {
        title,
        id: reportId,
        lines,
        actions: [{ label: '查看战报', command: `/争夺战报 ${reportId}`, autoEnter: false }]
      }
    ],
    bar: false
  }).format.value;
}

type MarkdownNode = Extract<DataEnums, { type: 'Markdown' }>['value'][number];
type GroupedNotice = { key: string; title: string; lines: string[]; actions: Action[]; fishing: boolean };

// 批次合并保留 Format 节点引用。按原事件类型分组，避免用玩家可见文案识别业务类型。
const groupedNotices = new WeakMap<MarkdownNode, GroupedNotice>();
const noticeHeadings = new WeakMap<MarkdownNode, GroupedNotice>();
const notificationTitles = new Map([
  ['meditation.limit', '闭关收益已达上限'],
  ['exploration.completed', '探索已结束'],
  ['cave.plot.matured', '灵田作物已成熟'],
  ['forge.order.expired', '炼器委托已到期'],
  ['market.listing.expired', '珍宝楼挂单已到期'],
  ['bounty.expired.reward', '悬赏赏金已入账'],
  ['bounty.expired.refund', '悬赏余款已退还'],
  ['scheduled.email.sent', '收到新邮件'],
  ['companion.anniversary.gift', '道侣周年纪念'],
  ['companion.proposal.created', '收到道侣申请'],
  ['companion.proposal.accepted', '已结为道侣'],
  ['companion.proposal.rejected', '道侣申请未通过'],
  ['friend.request.created', '收到结交申请'],
  ['friend.request.accepted', '结交申请已通过'],
  ['friend.request.rejected', '结交申请未通过'],
  ['master.proposal.created', '收到拜师申请'],
  ['master.proposal.accepted', '已具师徒名分'],
  ['master.proposal.rejected', '拜师申请未通过'],
  ['master.graduation.created', '收到出师申请'],
  ['master.graduation.accepted', '已出师'],
  ['master.graduation.rejected', '出师申请未通过'],
  ['master.relation.rebelled', '徒弟已叛离师门'],
  ['master.relation.expelled', '已被逐出师门'],
  ['guild.application.approved', '入宗申请已通过'],
  ['guild.application.rejected', '入宗申请未通过'],
  ['guild.leave.successor', '已继任宗主'],
  ['guild.leadership.transfer', '已继任宗主'],
  ['guild.leadership.impeach.successor', '已继任宗主'],
  ['guild.leadership.impeach.leader', '宗门职位已变更'],
  ['guild.role.appointed', '宗门职位已变更'],
  ['guild.member.kicked', '已被移出宗门'],
  ['guild.dissolve', '宗门已解散'],
  ['guild.red_packet.sent', '宗门有新红包'],
  ['tribulation.available', '已具备渡劫资格'],
  ['tribulation.announced', '渡劫确认窗口已开启'],
  ['tribulation.reminder', '渡劫确认即将截止'],
  ['tribulation.settled', '渡劫已结算'],
  ['pk.counter_won', '反击获胜'],
  ['pk.counter_lost', '反击未获胜'],
  ['pk.delivery', '物品交付更新'],
  ['fishing.result.rare', '洞府垂钓 · 稀有鱼渔讯'],
  ['fishing.result.king', '洞府垂钓 · 鱼王渔讯'],
  [fishingBossNotificationSource, '洞府垂钓 · 垂钓奇遇'],
  ['team.invitation:created', '收到队伍邀请'],
  ['team.invitation:rejected', '队伍邀请未通过'],
  ['team.application:created', '收到入队申请'],
  ['team.application:approved', '入队申请已通过'],
  ['team.application:rejected', '入队申请未通过'],
  ['team:leader-inherited', '已成为队长']
]);

function notificationGroupTitle(source: string, firstLine: string): string | undefined {
  if (source === 'team.match') {
    if (firstLine.startsWith('匹配超时')) {
      return '组队匹配超时';
    }
    if (firstLine.startsWith('匹配成功')) {
      return '组队匹配成功';
    }

    return '组队匹配结果';
  }

  return notificationTitles.get(source);
}

const commonNoticeFacts = new Set([
  '货币：灵石、灵晶结算不变',
  '你的身份：受袭者',
  '你的身份：原打劫者',
  '反击机会：已使用',
  '反击结果：受袭者获胜',
  '反击结果：受袭者未获胜',
  '交付状态：本批原物交付状态已更新',
  '状态：已到期',
  '挂单：已到期并自动下架',
  '返还：剩余物品已退回背包',
  '返还：预付材料及灵石已退回',
  '状态：已自动发放',
  '状态：未使用赏金已退还',
  '状态：已成熟，可收割'
]);

function joinNotificationWrapping(lines: string[]): string[] {
  return lines
    .join('\n')
    .replaceAll('物品：归属已确定，\n待交付', '物品：归属已确定，待交付')
    .replaceAll('处理：系统后台继续交付，\n不占用角色', '处理：系统后台继续交付，不占用角色')
    .replaceAll('状态：已成熟，\n可收割', '状态：已成熟，可收割')
    .split('\n');
}

function compactNoticeLines(lines: string[], actions: Action[]): string[] {
  const commands = new Set(actions.map(action => action.command));

  return joinNotificationWrapping(lines).flatMap(line => {
    const duplicate = /^(?:查看|查看战报|本人查看|查收|领取|返程)：(\/[^\r\n]+)$/.exec(line.trim())?.[1];

    if (!line.trim() || (duplicate && commands.has(duplicate))) {
      return [];
    }
    if (commands.has('/宗门红包')) {
      const packet = /^宗门有新的(.+)红包，(?:请使用 \/宗门红包 领取。)?$/.exec(line);

      if (packet && /^(灵石|灵晶|道晶)$/.test(packet[1])) {
        return [`类型：${packet[1]}红包`];
      }
      if (line === '请使用 /宗门红包 领取。') {
        return [];
      }
    }

    const counterExperience = /^本次反击获得修为([1-9]\d*)。$/.exec(line)?.[1];

    return [counterExperience ? `修为：+${counterExperience}` : line];
  });
}

function rememberGroupedNotice(data: DataEnums[], source: string, title: string, lines: string[], actions: Action[], fishing: boolean): void {
  const type = source.replace(/:\d+:/, ':');
  const fallbackTitle = notificationGroupTitle(type, lines[0] ?? '');

  if (!fallbackTitle) {
    return;
  }

  const nodes = data.flatMap(block => (block.type === 'Markdown' ? block.value : []));
  const quote = nodes.find(node => node.type === 'MD.blockquote');

  if (!quote) {
    return;
  }

  const groupTitle = title === '修仙 · 通知' ? fallbackTitle : title;
  const notice = { key: JSON.stringify([type, groupTitle]), title: groupTitle, lines: compactNoticeLines(lines, actions), actions, fishing };
  const heading = nodes.find(node => node.type === 'MD.bold' && node.value === noticeTitle(title));

  groupedNotices.set(quote, notice);
  if (heading) {
    noticeHeadings.set(heading, notice);
  }
}

/** 兼容旧纯文本通知；已有 Markdown/图片等富内容保留原样，飞信继续使用专用展示。 */
export function notificationNoticeData(data: DataEnums[], source = '', fishingReference?: unknown): DataEnums[] {
  if (source.startsWith('flymail.')) {
    return noticeBubble({
      title: '飞信',
      lines: ['你有飞信记录，请查看飞信。'],
      actions: [{ label: '查看飞信', command: '/飞信' }]
    }).format.value;
  }
  if (!data.length || data.some(block => block.type !== 'Text' && block.type !== 'Mention')) {
    return data;
  }
  const text = data
    .filter(block => block.type === 'Text')
    .map(block => block.value)
    .join('');

  if (!text.trim()) {
    return data;
  }
  if (source === 'pk.ordinary' || source === 'pk.expired') {
    const { lines } = notificationTextLayout(text);
    const report = source === 'pk.ordinary' ? ordinaryPKNotice(lines) : expiredPKNotice(lines);

    if (report) {
      return [...data.filter(block => block.type === 'Mention'), ...report];
    }
  }

  const fishing = source === 'fishing.result.rare' || source === 'fishing.result.king' ? fishingNotificationLayout(text, fishingReference) : undefined;
  const encounter = source === fishingBossNotificationSource;
  const fishingNotice = Boolean(fishing) || encounter;
  const command = encounter ? fishingBossNoticeCommand(fishingReference) : fishing?.reportCommand;
  const actions = fishingNotice
    ? command
      ? [{ label: encounter ? '查看奇遇' : '查看战报', command, autoEnter: false }]
      : []
    : notificationActions(source, text);
  const { title, lines } = fishing ?? notificationTextLayout(text);
  const built = noticeBubble({
    title: fishingNotice ? '修仙 · 通知' : noticeTitle(title),
    heading: fishingNotice && title !== '修仙 · 通知' ? title : undefined,
    lines,
    actions
  });

  rememberGroupedNotice(built.format.value, source, title, lines, actions, fishingNotice);

  return [...data.filter(block => block.type === 'Mention'), ...built.format.value];
}

/** 与服务端 notificationCategory 的分类前缀保持一致；未知来源归入 other。 */
export function notificationSettingsData(data: DataEnums[], source = ''): DataEnums[] {
  if (source === fishingBossNotificationSource) {
    return data;
  }
  const categories: Record<string, string> = {
    meditation: '闭关',
    exploration: '秘境探索',
    cave: '洞府灵田',
    forge: '锻造委托',
    tribulation: '渡劫',
    pk: '切磋与劫掠',
    friend: '好友',
    companion: '道侣',
    master: '师徒',
    team: '队伍',
    guild: '宗门',
    flymail: '飞信',
    'black-box': '黑盒',
    market: '珍宝楼交易'
  };
  const prefix = source.split(/[.:]/)[0];
  const category = Object.hasOwn(categories, prefix) ? prefix : 'other';
  const controls = Format.createMarkdown();

  addOptions(controls, [{ label: category === 'other' ? '关闭其他及旧版通知' : '关闭此类通知', command: `/通知设置 ${category} 关闭` }]);

  return [...data, ...Format.create().addMarkdown(Format.createMarkdown().addBlockquote(controls)).value];
}

const quoteNodes = (node: MarkdownNode) => (node.type === 'MD.blockquote' && Array.isArray(node.value) ? node.value : []);

function pkReportGroup(node: MarkdownNode) {
  const [title] = quoteNodes(node);

  if (title?.type === 'MD.bold' && (title.value === pkReportTitle || title.value === expiredReportTitle)) {
    return title.value;
  }

  return undefined;
}

const isPKSettings = (node: MarkdownNode) => quoteNodes(node).some(child => child.type === 'MD.button' && child.options?.data === '/通知设置 pk 关闭');

function expiredGroupFacts(reports: MarkdownNode[]) {
  const roleLine = quoteNodes(reports[0]).find(line => line.type === 'MD.text' && typeof line.value === 'string' && line.value.startsWith('身份：'));
  const role = roleLine?.type === 'MD.text' ? roleLine.value : undefined;
  const sameRole = typeof role === 'string' && reports.every(report => quoteNodes(report).some(line => line.type === 'MD.text' && line.value === role));

  if (sameRole) {
    for (const [index, report] of reports.entries()) {
      if (report.type !== 'MD.blockquote' || !Array.isArray(report.value)) {
        continue;
      }
      const nodes = [...report.value];
      const roleIndex = nodes.findIndex(line => line.type === 'MD.text' && line.value === role);

      nodes.splice(roleIndex, nodes[roleIndex + 1]?.type === 'MD.newline' ? 2 : 1);
      reports[index] = { ...report, value: nodes };
    }
  }

  return sameRole ? `${role} · ${expiredCurrency}` : expiredCurrency;
}

function noticeObject(lines: string[]) {
  for (const [index, line] of lines.entries()) {
    const object = /^(普通打劫战报|委托：|悬赏：) *#([1-9]\d*)$/.exec(line) ?? /^(事件：)([1-9]\d*)$/.exec(line);

    if (object && Number.isSafeInteger(Number(object[2]))) {
      const title = { '委托：': '锻造委托', '悬赏：': '悬赏', '事件：': '渡劫事件' }[object[1]] ?? object[1];

      return { title, id: object[2], lines: lines.filter((_, i) => i !== index) };
    }
  }

  return { lines };
}

function renderNoticeGroup(notices: GroupedNotice[]): MarkdownNode[] {
  const [first] = notices;
  const repeated = notices.length > 1;
  const header = Format.createMarkdown()
    .addBold(repeated ? `${first.title} · ${notices.length} 条` : first.title)
    .addNewline();
  const commonFacts = new Set(
    (repeated ? first.lines : []).filter(line => commonNoticeFacts.has(line) && notices.every(notice => notice.lines.includes(line)))
  );
  const sharedActions = (repeated ? first.actions : []).filter(({ command, label, autoEnter }) => {
    const opensEvent = /^\/(?:争夺战报 |渡劫结算 |垂钓 (?:战报|奇遇) )/.test(command);

    return !opensEvent && notices.every(({ actions }) => actions.some(a => a.command === command && a.label === label && a.autoEnter === autoEnter));
  });

  for (const fact of commonFacts) {
    header.addText(fact.replace(/^你的身份：/, '身份：')).addNewline();
  }
  for (const notice of notices) {
    const lines = notice.lines.filter(line => !commonFacts.has(line));
    const actions = notice.actions.filter(action => !sharedActions.some(shared => shared.command === action.command));

    if (lines.length || actions.length) {
      header.addBlockquote(section({ ...noticeObject(lines), actions }));
    }
  }
  if (sharedActions.length) {
    header.addNewline();
    addOptions(header, sharedActions);
    header.addNewline();
  }

  return header.value.value;
}

function settingsCommand(node: MarkdownNode): string | undefined {
  const buttons = quoteNodes(node).filter(child => child.type === 'MD.button');

  if (buttons.length === 1 && /^\/通知设置 (?!flymail )[\w-]+ 关闭$/.test(buttons[0].options?.data ?? '')) {
    return buttons[0].options?.data;
  }

  return undefined;
}

function notificationBody(data: DataEnums[]): DataEnums[] {
  type Group = { nodes: MarkdownNode[]; index: number; reports: MarkdownNode[]; notices: GroupedNotice[] };
  const groups = new Map<string, Group>();
  const settings = new Set<string>();
  const genericCounts = new Map<string, number>();
  const flattened = data.flatMap(block => (block.type === 'Markdown' ? block.value : []));

  for (const node of flattened) {
    const notice = groupedNotices.get(node);

    if (notice) {
      genericCounts.set(notice.key, (genericCounts.get(notice.key) ?? 0) + 1);
    }
  }
  const hasPKReports = flattened.some(pkReportGroup);
  let pkSettings: MarkdownNode | undefined;
  const selected = (notice: GroupedNotice | undefined) => (notice && (!notice.fishing || (genericCounts.get(notice.key) ?? 0) > 1) ? notice : undefined);
  const body = data.map(block => {
    if (block.type !== 'Markdown') {
      return block;
    }
    const nodes: MarkdownNode[] = [];

    for (const node of block.value) {
      if ((node.type === 'MD.bold' && node.value === '修仙 · 通知') || selected(noticeHeadings.get(node))) {
        continue;
      }
      const notice = selected(groupedNotices.get(node));
      const key = notice?.key ?? pkReportGroup(node);
      const command = settingsCommand(node);

      if (key) {
        const group = groups.get(key) ?? { nodes, index: nodes.length, reports: [], notices: [] };

        if (notice) {
          group.notices.push(notice);
        } else {
          group.reports.push(node);
        }
        groups.set(key, group);
      } else if (command && settings.has(command)) {
        continue;
      } else if (hasPKReports && isPKSettings(node)) {
        pkSettings ??= node;
        if (command) {
          settings.add(command);
        }
      } else {
        nodes.push(node);
        if (command) {
          settings.add(command);
        }
      }
    }

    return { ...block, value: nodes };
  });

  // 从后向前插入，保持各类通知在批次中首次出现的位置。
  for (const [key, { nodes, index, reports, notices }] of [...groups].reverse()) {
    if (notices.length) {
      nodes.splice(index, 0, ...renderNoticeGroup(notices));
      continue;
    }
    const header = Format.createMarkdown();
    const footer = Format.createMarkdown();

    if (key === expiredReportTitle) {
      header.addBold(`反击窗口结束 · ${reports.length} 条`).addNewline().addText(expiredGroupFacts(reports)).addNewline();
    } else {
      const hasDeadline = reports.some(node => quoteNodes(node).some(line => line.type === 'MD.text' && typeof line.value === 'string' && line.value.includes('反击截止：'))
      );

      header.addBold(`受到打劫 · ${reports.length} 条`).addNewline();
      footer
        .addNewline()
        .addText(`说明：${hasDeadline ? '截止时间为北京时间。' : ''}反击资格以战报为准。`)
        .addNewline();
    }

    nodes.splice(index, 0, ...header.value.value, ...reports, ...footer.value.value, ...(pkSettings ? [pkSettings] : []));
    pkSettings = undefined;
  }

  // 合并后收拢原有条目间隔。
  return groups.size
    ? body.map(block => block.type === 'Markdown'
          ? {
              ...block,
              value: block.value.filter((node, index, nodes) => node.type !== 'MD.newline' || nodes[index - 1]?.type !== 'MD.newline')
            }
          : block
      )
    : body;
}

/** 导航只由实际发送批次追加一次，不能放进各通知条目。 */
export function notificationNavigationData(data: DataEnums[]): DataEnums[] {
  const navigation = Format.createMarkdown();

  addOptions(navigation, [
    { label: '通知设置', command: '/通知设置', autoEnter: false },
    { label: '我的通知', command: '/我的通知', autoEnter: false }
  ]);

  const heading = Format.create().addMarkdown(Format.createMarkdown().addBold('修仙 · 通知').addNewline().addNewline()).value;

  return [...heading, ...notificationBody(data), ...Format.create().addMarkdown(navigation).value];
}
