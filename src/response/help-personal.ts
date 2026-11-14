import { helpRealmName } from '@src/response/help-realm';
import { parseBackendNavigation } from '@src/api/bot/navigation';
import { buildBubble, type BubbleAction } from '@src/response/presentation';

const topics = {
  beginner: ['刚入门先做什么', 'profile', '/初入仙途', '先看初入仙途的新人目标，再查当天签到奖励。进入炼气后，从能挑战的主线开始积累修为。'],
  realm: ['我离突破还有多远', 'profile', '/我的境界', '查看修为、突破材料和下一个境界。'],
  story: ['主线接下来打哪关', 'storyline', '/查看主线', '首通推进章节。已通关的关卡按星级、精力和次数判断能否扫荡。'],
  experience: ['现在去哪攒修为', 'profile', '/任务面板 修炼', '比较当前可推进的主线和修炼入口。'],
  dungeon: ['今天还能打哪些秘境', 'dungeons', '/秘境列表', '先核对境界、今日次数和精力；扫荡另有通关要求。'],
  rewards: ['今天有什么奖励能领', 'checkin', '/任务面板', '从任务面板核对活跃、邮件及活动奖励。'],
  equipment: ['怎么补装备', 'equipment', '/我的装备', '先检查空装备位，再比较储物袋里满足穿戴条件的装备。'],
  skills: ['功法怎么提升', 'skill-books', '/我的功法', '查看已学功法及可培养项，按当前搭配、材料和实际预览决定。'],
  meditation: ['闭关怎么攒修为', 'profile', '/任务面板 修炼', '先查看当前闭关状态。闭关可积累修为与真气，出关时结算。'],
  forge: ['装备缺了怎么锻造', 'forge', '/我的锻造', '从已解锁图纸选目标，按预览核对材料、职业条件与费用。'],
  root: ['灵根怎么提升', 'spirit-root-cultivate', '/我的灵根', '培养和晋品分别检查材料和境界，先看当前缺口。'],
  master: ['师门今天还能做什么', 'master', '/我的师门', '已有师徒关系后，再查看传功、赐福、赐丹及相应次数。'],
  team: ['我怎么找队伍', 'teams', '/队伍列表', '根据当前要打的玩法找队伍，加入前核对队伍和副本要求。'],
  market: ['缺的材料哪里能买', 'market', '/交易所', '先确认目标物品和缺少数量，再比较上架库存、价格和购买额度。'],
  template: ['怎么切换战斗配置', 'battle-templates', '/战斗模板', '模板应用时会检查装备和功法能否使用。'],
  guild: ['宗门今天还能做什么', 'guilds', '/我的宗门', '加入后可查看贡献、日常和周常。采矿、宗门主线与活动各有资格。'],
  tongtian: ['通天塔和声望怎么用', 'tongtian-tower', '/查看通天塔', '在通天塔选择目标名次并核对元力消耗。获得声望后，到声望商店看可换的装备。'],
  companion: ['道侣今天还能做什么', 'companion', '/我的道侣', '已有道侣关系后查看双修和任务资格，按任务及奖励选择。'],
  farm: ['灵田该收还是该种', 'herbalist', '/我的灵田', '优先处理成熟作物和异常地块，再按所缺材料选择种子。'],
  alchemy: ['这炉丹还缺什么', 'alchemy', '/炼丹 丹方', '选择目标丹方查看材料、工具与可炼数量，缺料时查对应来源。'],
  fishing: ['我现在能开塘吗', 'fishing-build', '/垂钓 状态', '开塘需达到炼气九层并准备 10,000 灵石。已有水塘时可查看会话、渔获和钓技进度。'],
  meridian: ['今天还能冲几次脉', 'meridians', '/经络', '按经络进度核对真气、冲脉次数和额外机会。'],
  tower: ['妖塔接下来打哪层', 'demon-tower', '/妖塔', '查看当前层、扫荡资格和待领奖励，积分可在对应商店兑换。'],
  artifact: ['本命物怎么提升', 'soul-artifact-equip', '/我的本命物', '先看是否已炼化。升级和升品还需金丹期及对应材料。'],
  tribulation: ['渡劫还差什么', 'tribulation', '/我的渡劫', '查看实际劫云状态、准备材料和可用的结算步骤。'],
  soul: ['神魂和道途怎么提升', 'soul-path', '/元婴神魂', '先查当前温养、补给和道途突破条件，再查看对应材料来源。'],
  boss: ['今天还能挑战凶兽吗', 'world-boss', '/凶兽', '按活动时间、所在大境界及剩余次数查看挑战资格。'],
  treasure: ['宝录怎么继续收录', 'tianshi-baolu', '/天师宝录', '查看已收录进度、下一项条件以及当前持有物。'],
  island: ['仙岛现在开放吗', 'island', '/活动大厅', '仙岛按活动时间开放，先查看当前活动和参与资格。'],
  ladder: ['我能挑战登天梯吗', 'tianjiao', '/登天梯', '达到当前大境界最高层后，再核对挑战次数和对手资格。'],
  spar: ['今天还能比试吗', 'pvp', '/任务面板', '比试消耗元力且有每日次数，按实际战斗配置参与。'],
  bounty: ['悬赏怎么获得奖励', 'bounty', '/悬赏榜', '查看可接受的悬赏和有效期，奖励取决于实际完成情况。'],
  relics: ['上古遗珍怎么获得', 'items', '/上古遗珍', '查看免费探索、兑换和已持有遗珍，按实际效果与消耗决定。'],
  robbery: ['打劫有什么收益', 'robbery', '/可打劫道友', '实际收益随目标、胜负和结算变化，先查看目标资格和元力消耗。']
} as const;

type Topic = keyof typeof topics;
export type HelpTopic = Topic | 'overview' | 'unknown';

const aliases: Partial<Record<Topic, RegExp>> = {
  beginner: /刚入门|刚注册|刚开始|新人怎么|新手先/,
  realm: /突破|晋级|升境界|还差多少修为/,
  story: /主线|哪关|章节|宝箱/,
  experience: /攒修为|赚修为|修为来源/,
  dungeon: /秘境|副本|探索/,
  rewards: /签到|邮件|活跃|领奖|奖励.*领|.*什么.*能领/,
  equipment: /装备|配装/,
  skills: /功法/,
  meditation: /闭关|打坐|出关/,
  forge: /锻造|打造/,
  root: /灵根/,
  master: /师门|拜师|出师|传功/,
  team: /组队|队伍/,
  market: /买|卖|交易|小店/,
  template: /战斗配置|模板/,
  guild: /宗门|贡献|采矿/,
  tongtian: /通天塔|声望/,
  companion: /道侣|双修/,
  farm: /灵田|收割|播种|种什么/,
  alchemy: /炼丹|炉丹|丹方/,
  fishing: /垂钓|水塘|开塘|渔获/,
  meridian: /经络|冲脉/,
  tower: /妖塔/,
  artifact: /本命物/,
  tribulation: /渡劫|劫云/,
  soul: /神魂|道途(?:突破)?|温养/,
  boss: /凶兽/,
  treasure: /宝录/,
  island: /仙岛|海岛/,
  ladder: /登天梯|天骄/,
  spar: /比试/,
  bounty: /悬赏/,
  relics: /遗珍/,
  robbery: /打劫/
};

const keys = Object.keys(topics) as Topic[];

export function helpTopic(question: string): HelpTopic {
  if (!question) {
    return 'overview';
  }
  if ([...question].length > 80) {
    return 'unknown';
  }
  const exact = keys.find(key => topics[key][0] === question);

  if (exact) {
    return exact;
  }
  const matches = keys.map(key => ({ key, length: aliases[key]?.exec(question)?.[0].length ?? 0 }));

  return matches.filter(match => match.length > 0).sort((a, b) => b.length - a.length)[0]?.key ?? 'unknown';
}

type Growth = {
  kind: string;
  experience: number;
  required: number;
  ready: boolean;
  target?: string;
  reason: string;
  materials: { itemName: string; requiredQuantity: number; currentQuantity: number }[];
};
type Story = { chapter: number; cleared: number; total: number; chests: number; nextStage: number; ready: boolean; blocker?: string };
type Progress = {
  realm: string;
  features: string[];
  growth?: Growth;
  story?: Story;
  signed?: boolean;
  mental?: number;
  farm?: { planted: number; mature: number; abnormal: number; empty?: number };
  farmNeedsGuide?: boolean;
  dungeons?: { name: string; used: number; limit: number; free: number; cost: number; single?: boolean; minPlayers?: number; contributionCost?: number }[];
  details?: string[];
  activityRewards?: { daily?: number; weekly?: number };
  tower?: { started: boolean; finished: boolean; layer: number };
  seclusion?: { active: boolean; remaining: number; canEnd: boolean; canStart?: boolean; startReason?: string };
};

export function parsePersonalHelp(value: unknown) {
  const access = parseBackendNavigation(value);
  const progress = (value as { progress?: Progress }).progress;

  if (
    progress &&
    (typeof progress.realm !== 'string' || !Array.isArray(progress.features) || !progress.features.every(feature => typeof feature === 'string'))
  ) {
    throw new Error('帮助响应不完整');
  }

  return { ...access, progress };
}

const questionButton = (topic: Topic): BubbleAction => ({ label: topics[topic][0], command: '/帮助 ' + topics[topic][0] });
const amount = (value: number) => value.toLocaleString('zh-CN');

function growthAction(growth?: Growth): BubbleAction {
  return growth?.kind === '渡劫' ? { label: '查看渡劫准备', command: '/我的渡劫' } : { label: '查看境界', command: '/我的境界' };
}

export function helpNextStep(progress: Progress) {
  const { growth, story, farm, signed } = progress;
  const missing = growth ? Math.max(0, growth.required - growth.experience) : 0;
  const material = growth?.materials?.find(item => item.currentQuantity < item.requiredQuantity);
  const realmAction = growthAction(growth);
  const storyAction = { label: '查看主线', command: story ? '/查看主线 ' + story.chapter : '/查看主线' };

  return growth?.ready
    ? { text: `已满足${growth.kind}条件，先${realmAction.label}。`, action: realmAction }
    : growth?.target && missing === 0 && material
      ? { text: `${growth.kind}还缺${material.itemName} ${amount(material.requiredQuantity - material.currentQuantity)} 个。`, action: realmAction }
      : story?.chests
        ? { text: `主线有 ${story.chests} 个宝箱可领，先查看主线奖励。`, action: { label: '查看主线奖励', command: '/查看主线' } }
        : story?.ready
          ? { text: `可以继续挑战主线 ${story.chapter}-${story.nextStage}，推进关卡并积累修为。`, action: storyAction }
          : farm?.mature
            ? { text: `有 ${farm.mature} 块灵田已成熟，可以先收获。`, action: { label: '查看灵田', command: '/我的灵田' } }
            : signed === false
              ? { text: '今天还未完成日常签到，可以先查看签到奖励。', action: { label: '签到概览', command: '/签到概览' } }
              : { text: '查看已开放的玩法和待领取资源，按当前缺口选择。', action: { label: '任务面板', command: '/任务面板' } };
}

export function personalHelpBubble(context: { bid?: string; isPrivate: boolean }, topic: HelpTopic, progress?: Progress) {
  const back = { label: '返回帮助', command: '/帮助' };
  const tianshu = { label: '下境解锁', command: '/天书' };

  if (!progress) {
    return buildBubble({
      ...context,
      title: '修仙帮助',
      sections: [{ lines: ['状态：个人进度暂时无法读取。'] }],
      footer: [topic === 'overview' ? { label: '重试', command: '/帮助' } : back]
    });
  }

  const { growth, story, signed, farm, tower, seclusion } = progress;
  const has = (key: Topic) => progress.features.includes(topics[key][1]);
  const missing = growth ? Math.max(0, growth.required - growth.experience) : 0;
  const storyAction = { label: '查看主线', command: story ? '/查看主线 ' + story.chapter : '/查看主线' };
  const growthLine = growth
    ? `修为：${amount(growth.experience)} / ${amount(growth.required)}${missing ? ' · 还差 ' + amount(missing) : ''}`
    : '修为：暂时无法读取';
  const storyLine = story ? `主线：第 ${story.chapter} 章 · 已通关 ${story.cleared}/${story.total}` : '';
  const prioritized: Topic[] = [
    ...(growth?.ready ? ['realm' as const] : []),
    ...(story?.ready ? ['story' as const] : []),
    ...(farm?.mature ? ['farm' as const] : []),
    ...(signed === false || story?.chests ? ['rewards' as const] : []),
    ...(tower?.started && !tower.finished ? ['tower' as const] : []),
    ...(seclusion?.active ? ['meditation' as const] : []),
    'realm',
    ...(['soul', 'artifact', 'meridian', 'alchemy', 'farm', 'companion', 'guild', 'market', 'master', 'story', 'dungeon', 'experience'] satisfies Topic[])
  ];
  const questions = [...new Set(prioritized)].filter(has).slice(0, 3).map(questionButton);
  const towerLine = tower ? `妖塔：${tower.finished ? '今日已完成' : tower.started ? '第 ' + tower.layer + ' 层' : '今日未开始'}` : '';
  const seclusionLine = seclusion?.active ? `闭关：${seclusion.canEnd ? '可查看出关结算' : '还剩 ' + seclusion.remaining + ' 小时'}` : '';

  if (topic === 'overview' || topic === 'unknown') {
    const next = helpNextStep(progress);

    const realm = helpRealmName(progress.realm);
    const liveProgress = [
      seclusionLine,
      storyLine,
      farm?.mature ? `灵田：${farm.mature} 块已成熟` : '',
      signed === false ? '签到：今日未签' : '',
      tower?.started && !tower.finished ? towerLine : ''
    ]
      .filter(Boolean)
      .slice(0, 3);

    return buildBubble({
      ...context,
      title: '修仙帮助 · ' + progress.realm,
      sections: [
        {
          lines: [growthLine, ...liveProgress]
        },
        {
          title: '下一步',
          lines: [...(topic === 'unknown' ? ['说明：请选择页脚的问题查看具体进度。'] : []), '说明：' + next.text],
          actions: [next.action]
        }
      ],
      footer: [questions, [...(realm ? [{ label: '本境界怎么玩', command: '/帮助 ' + realm }] : []), tianshu, { label: '更多玩法', command: '/更多' }]]
    });
  }

  const [title, , command, description] = topics[topic];
  const lines = ['说明：' + description];

  if (!has(topic)) {
    return buildBubble({
      ...context,
      title,
      sections: [{ lines: ['状态：当前境界下此玩法不可用。'] }],
      footer: [back, tianshu, { label: '境界目录', command: '/天书 目录' }]
    });
  }
  let action: BubbleAction = { label: '查看详情', command };
  const extraActions: BubbleAction[] = [];

  if (topic === 'market') {
    const missingMaterials = (growth?.materials ?? []).filter(item => item.currentQuantity < item.requiredQuantity);

    lines.push(...missingMaterials.map(item => `材料：${item.itemName}还差 ${amount(item.requiredQuantity - item.currentQuantity)}`));
    const searchable = missingMaterials.find(item => /^[\p{L}\p{N}·]{1,32}$/u.test(item.itemName));

    action = searchable
      ? { label: '搜索' + searchable.itemName, command: '/珍宝楼 搜索 ' + searchable.itemName }
      : { label: '搜索材料', command: '/珍宝楼 搜索' };
    if (missingMaterials.length) {
      lines.push('说明：先看是否有挂单，再对比单价和可买数量。');
    }
  }
  if (topic === 'tongtian') {
    action = { label: '查看通天塔', command };
    extraActions.push({ label: '声望商店', command: '/商店 声望' });
  }
  if (topic === 'meridian') {
    action = { label: '查看经络', command };
  }

  if (topic === 'realm') {
    const materials = (growth?.materials ?? []).filter(item => item.currentQuantity < item.requiredQuantity);

    action = growthAction(growth);
    if (growth?.target && !growth.ready && missing > 0 && growth.kind !== '渡劫') {
      extraActions.push(questionButton('experience'));
    }
    if (materials.length && has('market')) {
      extraActions.push(questionButton('market'));
    }
    lines.splice(
      0,
      1,
      growthLine,
      ...[
        growth?.target ? `目标：${growth.target}` : growth ? '状态：暂无下一境界资料' : '',
        growth?.ready ? `状态：已满足${growth.kind}条件` : growth?.reason ? '状态：' + growth.reason : '',
        ...materials.map(item => `材料：${item.itemName}还差 ${amount(item.requiredQuantity - item.currentQuantity)}`),
        growth?.target && materials.length && missing > 0 ? '说明：修为和材料都要补齐。' : ''
      ].filter(Boolean)
    );
  }
  if (topic === 'story' || topic === 'experience') {
    if (story) {
      lines.push(storyLine);
      if (story.nextStage) {
        lines.push(`状态：${story.chapter}-${story.nextStage} · ${story.ready ? '可查看并挑战' : (story.blocker ?? '请查看挑战条件')}`);
      }
      if (story.chests) {
        lines.push(`待领取：主线宝箱 ${story.chests} 个`);
      }
      action = storyAction;
    } else if (topic === 'story') {
      lines.push('状态：暂无可展示的章节进度。');
    }
    if (topic === 'experience') {
      lines.unshift(growthLine);
      if (growth?.ready) {
        action = growthAction(growth);
        lines.push('说明：已满足' + growth.kind + '条件，先' + action.label + '。');
      } else if (story?.ready && story.nextStage > 0) {
        lines.push(`说明：先推主线 ${story.chapter}-${story.nextStage}，通关可获得修为。`);
      } else if (seclusion?.active || seclusion?.canStart) {
        action = { label: seclusion.active ? '查看闭关进度' : '查看闭关', command: '/闭关' };
        lines.push(seclusion.active ? '说明：可查看闭关进度和出关条件。' : '说明：可开始闭关，出关后结算修为。');
      } else {
        action = { label: '修炼面板', command };
        if (seclusion?.startReason) { lines.push('状态：' + seclusion.startReason); }
      }
    }
  }
  if (topic === 'dungeon') {
    const { mental } = progress;
    const entries = progress.dungeons ?? [];

    if (mental !== undefined) { lines.push(`数量：当前精力 ${mental}`); }
    for (const entry of entries) {
      const left = entry.limit > 0 ? Math.max(0, entry.limit - entry.used) : undefined;
      const quota = left === undefined ? '今日不限次' : `今日剩 ${left} 次`;
      const cost = left === 0 ? '' : entry.free > 0 ? ` · 免精力 ${entry.free} 次` : ` · 耗 ${entry.cost} 精力`;
      const group = entry.single === false ? ` · 至少 ${entry.minPlayers ?? 1} 人` : '';
      const contribution = entry.contributionCost ? ` · 需 ${entry.contributionCost} 贡献` : '';

      lines.push(`进度：${entry.name} · ${quota}${cost}${group}${contribution}`);
    }
    const candidate = entries.find(
      entry => entry.single === true &&
        entry.contributionCost === 0 &&
        (entry.limit <= 0 || entry.used < entry.limit) &&
        (entry.free > 0 || (mental !== undefined && mental >= entry.cost)) &&
        /^[\p{L}\p{N}·]{1,32}$/u.test(entry.name)
    );

    action = candidate ? { label: '查看' + candidate.name, command: '/秘境详情 ' + candidate.name } : { label: '查看秘境列表', command };
    if (candidate) { extraActions.push({ label: '全部秘境', command }); }
  }
  if (topic === 'tower' && towerLine) {
    lines.unshift(towerLine);
  }
  if ((topic === 'meditation' || topic === 'experience') && seclusionLine) {
    lines.unshift(seclusionLine);
  }
  if (topic === 'rewards') {
    const rewardActions: BubbleAction[] = [];
    const rewardLines: string[] = [];

    if (story?.chests) {
      rewardLines.push(`待领取：主线宝箱 ${story.chests} 个`);
      rewardActions.push({ label: '查看主线宝箱', command: '/查看主线' });
    }
    for (const [period, label] of [
      ['daily', '日常活跃'],
      ['weekly', '周常活跃']
    ] as const) {
      const count = progress.activityRewards?.[period];

      if (count) {
        rewardLines.push(`待领取：${label} ${count} 档`);
        rewardActions.push({ label, command: '/' + label });
      }
    }
    if (signed === false) {
      rewardLines.push('状态：日常签到待完成');
      rewardActions.push({ label: '查看签到', command: '/签到概览' });
    }

    return buildBubble({
      ...context,
      title,
      sections: [{ lines: [...rewardLines, '说明：邮件和活动奖励可到任务面板核对。'] }],
      footer: [rewardActions, [back, { label: '任务面板', command }]]
    });
  }
  if (topic === 'farm') {
    action = { label: '查看灵田', command };
    if (progress.farmNeedsGuide) {
      lines.splice(0, 1, '状态：还没有灵田。先完成灵药师引导，之后就能查看地块并播种。');
      action = { label: '灵药师引导', command: '/加入灵药师' };
    } else if (farm) {
      const status = `进度：种植 ${farm.planted} 块 · 成熟 ${farm.mature} 块 · 异常 ${farm.abnormal} 块`;
      const next =
        farm.mature > 0
          ? '说明：先到灵田收获成熟作物，再按缺少的材料安排播种。'
          : farm.abnormal > 0
            ? '说明：先打开灵田处理异常地块。'
            : farm.empty
              ? `说明：还有 ${farm.empty} 块空地，可查看种子并选地块播种。`
              : farm.planted > 0 && farm.empty === 0
                ? '说明：当前作物尚未成熟，到灵田查看剩余时间。'
                : '说明：打开灵田确认空地、种子和成熟时间。';

      lines.splice(0, 1, status, next);
      if (!farm.mature && !farm.abnormal && farm.empty) {
        action = { label: '查看可播种子', command: '/播种' };
      }
    }
  }
  const details = (progress.details ?? []).map(detail => '进度：' + detail);

  if (topic === 'tongtian' || topic === 'meridian') {
    lines.unshift(...(details.length ? details : ['状态：当前进度暂未查到，可打开下方入口核对。']));
  } else {
    lines.push(...details);
  }
  const related: Topic[] =
    topic === 'realm'
      ? extraActions.some(item => item.command === questionButton('experience').command)
        ? ['story']
        : ['experience', 'story']
      : ['realm', 'rewards'];
  const followUp = related.filter(has).map(questionButton);

  return buildBubble({
    ...context,
    title,
    sections: [{ lines, actions: [action, ...extraActions] }],
    footer: [back, ...followUp, ...(topic === 'realm' ? [tianshu] : [])]
  });
}
