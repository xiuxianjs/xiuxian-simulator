import { onResponse, useEvent } from 'alemonjs';
import { parsePKCommandInteger } from '@src/api/bot/pk-management';
import { selects } from '@src/response/config';
import { confirmBubble, errorBubble, listBubble } from '@src/response/presentation/presets';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { formatGameTime } from '@src/utils/gameTime';
import { useMessage } from '@src/utils/useMessage';

const command =
  /^[!！/#＃]?(商运|万宝楼商运|加入商运护卫|确认商运护卫|退出商运护卫|递补商运主守|商运结案|确认商运结案|立即抢商队|查看劫货进度|查看商运战报|组队抢商队|加入商运临时队|退出商运临时队|预览商运斗法|确认商运斗法|商运归还分成|确认商运分成|确认商运出战)(?:\s+(.*))?$/;

const statusCommand = /^[!！/#＃]?(我的状态)(?:\s+([a-z_]{1,32}(?:\s+[1-9][0-9]{0,3})?))?$/;
const crewCommand = /^[!！/#＃]?(打劫队)(?:\s+(.*))?$/;

const phaseText: Record<string, string> = {
  recruiting: '护卫招募中',
  traveling: '运送中',
  fighting: '斗法中',
  contested: '玩家占用中',
  sealed: '争夺即将结束',
  ready: '已守满',
  arriving: '入库结算中',
  returning: '归店结算中',
  arrived: '已入库',
  returned: '已归还',
  retained: '已留用'
};

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('商队回执无效');
  }

  return value as Record<string, unknown>;
}

function ordinarySettlementLines(value: unknown): string[] {
  if (!value) {
    return [];
  }

  const result = record(value);
  const { attackerId, victimId, experience, victimExperience, stoneReward, crystalReward, droppedItem, statusTransfer } = result;
  const from = `UID ${victimId}`;
  const to = `UID ${attackerId}`;
  const changes: string[] = [];

  if (typeof stoneReward === 'number' && stoneReward > 0) {
    changes.push(`灵石 ×${stoneReward}`);
  }
  if (typeof crystalReward === 'number' && crystalReward > 0) {
    changes.push(`灵晶 ×${crystalReward}`);
  }
  if (droppedItem) {
    const item = record(droppedItem);

    changes.push(`${item.name} ×${item.quantity}`);
  }
  if (statusTransfer) {
    changes.push(`状态「${record(statusTransfer).name}」×1`);
  }

  return [
    `修为：${to} +${experience} · ${from} +${victimExperience}`,
    changes.length > 0 ? `财物：${from} → ${to} · ${changes.join('、')}` : '财物：双方无变化'
  ];
}

function roundLines(data: Record<string, unknown>): string[] {
  if (!Array.isArray(data.actions)) {
    throw new Error('商运战报无效');
  }

  const names = record(data.names);
  const name = (id: unknown) => (typeof id === 'string' && typeof names[id] === 'string' ? names[id] : undefined);
  const entries = (value: unknown) => (Array.isArray(value) ? value.map(record) : []);

  return data.actions.map(raw => {
    const action = record(raw);
    const effects = [
      ...entries(action.damageResults).map(hit => hit.dodged === true
          ? `${name(hit.targetId) ?? '未知目标'}闪避`
          : `${name(hit.targetId) ?? '未知目标'}受伤 ${hit.actualDamage}${hit.crit === true ? '（暴击）' : ''}${hit.killed === true ? '（倒地）' : ''}${hit.shieldAbsorbed ? `（护盾吸收 ${hit.shieldAbsorbed}）` : ''}`
      ),
      ...entries(action.healResults).map(heal => `${name(heal.targetId) ?? '未知目标'}回复 ${heal.actual}`),
      ...entries(action.tickEffects).map(tick => `${tick.buffName} ${tick.kind === 'heal' ? '回复' : tick.kind === 'damage' ? '伤害' : '生效'} ${tick.amount}`),
      ...entries(action.appliedBuffs).map(buff => `${buff.targetName}获得「${buff.buffName}」`),
      ...entries(action.removedBuffs).map(buff => `${buff.targetName}失去「${buff.buffName}」`)
    ];

    if (typeof action.mpGain === 'number' && action.mpGain > 0) {
      effects.push(`灵力 +${action.mpGain}`);
    }
    if (typeof action.mentalGain === 'number' && action.mentalGain > 0) {
      effects.push(`念力 +${action.mentalGain}`);
    }

    return `行动：${name(action.actor) ?? action.actorName ?? '未知'} · ${typeof action.skillName === 'string' && action.skillName ? action.skillName : '行动'}${effects.length ? ` · ${effects.join('、')}` : ''}`;
  });
}

function scheduleLines(value: unknown): string[] {
  if (!value || typeof value !== 'object') {
    return ['今日运货时段：暂不可查'];
  }

  const { windows, channel } = record(value);

  if (!Array.isArray(windows)) {
    return ['今日运货时段：暂不可查'];
  }
  if (windows.length === 0) {
    return ['今日运货时段：暂无排程'];
  }

  const times = windows.map(raw => {
    const { from, until } = record(raw);

    if (typeof from !== 'string' || typeof until !== 'string') {
      return '时间未知';
    }

    const nextDay = formatGameTime(from, 'YYYY-MM-DD') !== formatGameTime(until, 'YYYY-MM-DD');

    return `${formatGameTime(from, 'HH:mm')}–${nextDay ? '次日 ' : ''}${formatGameTime(until, 'HH:mm')}`;
  });

  return [
    `今日运货时段：${times.join('、')}（北京时间）`,
    channel === true ? '发车：整点、半点排程，刻钟视备货加开' : '发车：每 15 分钟排程，实际以商队公示为准'
  ];
}

function parseBoard(value: unknown) {
  const {
    items,
    teams,
    teamsEnabled,
    myTeamId,
    myTeamLeader,
    myParticipation,
    participationStamp,
    confirmedMembers,
    pendingMembers,
    myShare,
    myTeamAutoReturn
  } = record(value);
  const raidTeams = Array.isArray(teams) ? teams.map(record) : [];

  if (!Array.isArray(items)) {
    throw new Error('商队列表无效');
  }

  return items.map(raw => {
    const row = record(raw);
    const { id, phase, departureAt, arrivalAt, holdUntil, holderId, manifest } = row;
    const { guardCount, nextGuardWage, nextGuardSeat, myGuardSeat, myGuardMain, nextNeedsMain } = row;

    if (
      typeof id !== 'number' ||
      !Number.isSafeInteger(id) ||
      id < 1 ||
      typeof phase !== 'string' ||
      typeof departureAt !== 'string' ||
      typeof arrivalAt !== 'string' ||
      !Array.isArray(manifest)
    ) {
      throw new Error('商队回执无效');
    }

    let bountyCargo: string | undefined;
    const cargo = manifest.map(rawItem => {
      const { name, templateId, category, currency, effectCode, quantity, returnBounty: marked } = record(rawItem);
      const label = typeof name === 'string' && name ? name : currency === 'SPIRIT_STONE' ? '灵石' : currency === 'SPIRIT_CRYSTAL' ? '灵晶' : '';

      const cargoLine = `${label || (category === 'effect' ? String(effectCode) : `货物 #${templateId}`)} ×${quantity}`;

      if (marked === true) {
        bountyCargo = cargoLine;
      }

      return cargoLine;
    });

    return {
      id,
      phase,
      raidPhase: typeof row.raidPhase === 'string' ? row.raidPhase : phase,
      teamsEnabled: teamsEnabled === true,
      myTeamId,
      myTeamLeader: myTeamLeader === true,
      myParticipation,
      participationStamp,
      confirmedMembers: typeof confirmedMembers === 'number' ? confirmedMembers : 0,
      pendingMembers: typeof pendingMembers === 'number' ? pendingMembers : 0,
      myShare: typeof myShare === 'number' ? myShare : 0,
      myTeamAutoReturn: myTeamAutoReturn === true,
      raidTeams,
      canClose: row.canClose === true,
      canSupport: row.canSupport === true,
      canSoloRaid: row.canSoloRaid === true,
      revision: row.revision,
      status: phase === 'fighting' && typeof row.raidPhase === 'string' ? '本轮报名中' : Object.hasOwn(phaseText, phase) ? phaseText[phase] : '已结案',
      cargo,
      bountyCargo,
      departureAt,
      arrivalAt,
      holdUntil: typeof holdUntil === 'string' ? holdUntil : undefined,
      decisionUntil: typeof row.decisionUntil === 'string' ? row.decisionUntil : undefined,
      closureAction: row.closureAction,
      autoReturn: row.autoReturn === true,
      returnBounty: typeof row.returnBounty === 'number' ? row.returnBounty : 0,
      eligibleBounty: typeof row.eligibleBounty === 'number' ? row.eligibleBounty : 0,
      holderId: typeof holderId === 'number' ? holderId : undefined,
      guardCount: typeof guardCount === 'number' ? guardCount : 0,
      nextGuardSeat: typeof nextGuardSeat === 'number' ? nextGuardSeat : undefined,
      myGuardSeat: typeof myGuardSeat === 'number' ? myGuardSeat : undefined,
      myGuardMain: myGuardMain === true,
      nextNeedsMain: nextNeedsMain === true,
      noPaidGuard: row.noPaidGuard === true,
      nextGuardWage: typeof nextGuardWage === 'number' ? nextGuardWage : undefined
    };
  });
}

function parseBoardPage(value: unknown) {
  const raw = record(value).shopRaidBanUntil;

  return { cards: parseBoard(value), schedule: record(value).schedule, banUntil: typeof raw === 'string' && raw ? raw : null };
}

/** The Wanbaolou ban is explained on every /商运 entry, banned or not. */
function banNoticeLines(banUntil: string | null): string[] {
  return [banUntil ? `你昨日参与过劫车，${banUntil} 前无法在万宝楼购买。` : '实际对商队出战（输赢都算），次日 00:00 起全天无法在万宝楼购买。'];
}

function publicRaidActions(convoyId: number) {
  return [
    { label: '立即抢', command: `/立即抢商队 ${convoyId}` },
    { label: '组队抢', command: `/组队抢商队 ${convoyId} 行动` }
  ];
}

function statusEffectLines(effect: Record<string, unknown>) {
  const rate = Number(effect.rateBps) / 100;
  const expires = `${formatGameTime(String(effect.expiresAt))} 到期`;
  const source = effect.source === 'shop_raid' ? '来源：商运' : String(effect.source);
  const uses = String(effect.remainingUses);
  const quota = String(effect.remainingQuota);

  switch (effect.code) {
    case 'jie_xing':
    case 'tong_xing':
      return [`主线与普通秘境精力减 ${rate}% · 剩 ${uses} 次、${quota} 点精力`, expires, source];
    case 'yu_feng':
      return [`本人钓获回收 +${rate}% · 剩 ${uses} 尾、${quota} 灵鳞钱`, expires, source];
    case 'ju_bao':
      return [`普通秘境基础灵石 +${rate}% · 剩 ${uses} 次、${quota} 灵石`, expires, source];
    case 'lian_gong_jie_fei':
      return [`升级功法时可选用 · 灵石减 ${rate}% · 单张最多抵 ${quota} 灵石`, expires, source];
    default:
      return [`闭关基础修为 +${rate}% · ${expires}`, source];
  }
}

export default onResponse(selects, async event => {
  const [, next] = useEvent();
  const input = event.MessageText.trim();
  const match = command.exec(input) ?? statusCommand.exec(input) ?? crewCommand.exec(input);

  if (!match) {
    next();

    return;
  }

  const [message] = useMessage();
  const common = { isPrivate: event.isPrivate ?? false, bid: event.UserId };
  const feedback = async (reason: string) => {
    await message.send(errorBubble({ ...common, title: '商运', reason, footer: [{ label: '返回坊市交易', command: '/更多 交易' }] }));
  };
  const raw = match[2] ?? '';
  let action = match[1] === '万宝楼商运' ? '商运' : match[1];
  const args = raw ? raw.split(/\s+/) : [];
  const crewFeedback = async (reason: string) => {
    await message.send(errorBubble({ ...common, title: '打劫队', reason, footer: [{ label: '打开打劫队', command: '/打劫队' }] }));
  };

  if (action === '打劫队') {
    const modes: Record<string, string> = { 创建: 'create', 加入: 'join', 退出: 'leave', 移除: 'kick', 解散: 'disband', 协守: 'support' };
    const crewView = args.length === 1 && (args[0] === '列表' || args[0] === '我的') ? args[0] : undefined;
    const mode = args.length === 0 || crewView ? 'list' : modes[args[0]];
    const crewId = args[1] === undefined ? null : parsePKCommandInteger(args[1]);
    const memberId = args[2] === undefined ? null : parsePKCommandInteger(args[2]);
    const valid =
      mode === 'list' ||
      (mode === 'create' && args.length === 1) ||
      ((mode === 'kick' || mode === 'support') && args.length === 3 && crewId !== null && memberId !== null) ||
      (mode !== 'create' && mode !== 'kick' && mode !== 'support' && args.length === 2 && crewId !== null);

    if (!mode || !valid) {
      await crewFeedback('请从队伍面板选择操作。');

      return;
    }
    try {
      const reply = await runRobotBusiness(
        event,
        'shop-raid.crew',
        mode === 'support' ? { mode, convoyId: crewId, revision: memberId } : { mode, crewId: crewId ?? 0, memberId: memberId ?? 0 },
        record,
        next,
        r => crewFeedback(r.text)
      );

      if (reply.handled) {
        return;
      }
      if (mode === 'support') {
        await message.send(
          listBubble({
            ...common,
            title: '已加入本车协守',
            items: [{ lines: ['下一场斗法按最新守货阵容受理。'] }],
            footer: [{ label: '查看商队', command: `/商运 ${crewId}` }]
          })
        );

        return;
      }
      const mine = reply.data.crew ? record(reply.data.crew) : null;
      const teams = Array.isArray(reply.data.crews) ? reply.data.crews.map(record) : [];
      const list = crewView === '列表' || (!crewView && !mine) ? teams.slice(0, 10) : mine ? [mine] : [];
      const managing = crewView !== '列表' && mine;
      // 长期打劫队与本车临时队是两套队伍，列表页必须先说明边界，避免玩家在本车招募期找错入口
      const crewNotice = crewView === '列表' ? [{ lines: ['此处为全服长期打劫队，与本车临时队分开。', '本车临时队请从 /商运 车号 查看。'] }] : [];

      await message.send(
        listBubble({
          ...common,
          title: crewView === '列表' ? '打劫队列表' : crewView === '我的' ? '我的打劫队' : '打劫队',
          items: [
            ...crewNotice,
            ...(list.length
              ? list.map(team => {
                  const members = Array.isArray(team.members) ? team.members : [];
                  const captain = team.leaderId === reply.data.viewerId;

                  return {
                    lines: [`队伍 ${team.id} · 队长 UID ${team.leaderId} · ${members.length}/3 人`, `成员 UID ${members.join('、')}`],
                    actions:
                      managing && captain
                        ? [
                            ...members.slice(1).map(id => ({ label: `移除 UID ${id}`, command: `/打劫队 移除 ${team.id} ${id}` })),
                            { label: '解散队伍', command: `/打劫队 解散 ${team.id}` },
                            ...(!crewView && members.length < 3 ? [{ label: '加入这支队', command: `/打劫队 加入 ${team.id}` }] : [])
                          ]
                        : managing
                          ? [{ label: '退出队伍', command: `/打劫队 退出 ${team.id}` }]
                          : !mine && members.length < 3
                            ? [{ label: '加入这支队', command: `/打劫队 加入 ${team.id}` }]
                            : []
                  };
                })
              : [{ lines: [crewView === '我的' ? '你尚未加入打劫队。' : '当前没有打劫队。'] }])
          ],
          footer: [
            ...(!mine && crewView !== '列表' ? [{ label: '创队伍', command: '/打劫队 创建' }] : []),
            ...(crewView
              ? [
                  crewView === '列表' ? { label: '我的打劫队', command: '/打劫队 我的' } : { label: '打劫队列表', command: '/打劫队 列表' },
                  { label: '返回商运', command: '/商运' }
                ]
              : [{ label: '刷新队伍', command: '/打劫队' }])
          ]
        })
      );
    } catch {
      await crewFeedback('打劫队暂时无法读取，请稍后再试。');
    }

    return;
  }

  if (action === '我的状态') {
    try {
      const entry = await runRobotBusiness(event, 'status-effects.list', {}, record, next, reply => feedback(reply.text));

      if (!entry.handled) {
        const effects = Array.isArray(entry.data.items) ? entry.data.items.map(record) : [];
        const groups = new Map<string, Record<string, unknown>[]>();

        for (const effect of effects) {
          const code = String(effect.code ?? effect.name);
          const same = groups.get(code) ?? [];

          same.push(effect);
          groups.set(code, same);
        }
        const total = Math.min(
          10000,
          effects
            .filter(effect => effect.pending !== true && (!effect.code || effect.code === 'yang_yuan' || effect.code === 'da_zhou_tian'))
            .reduce((sum, effect) => sum + Number(effect.rateBps), 0)
        );
        const detail = args[0];
        const entries = detail ? [...groups.entries()].filter(([code]) => code === detail) : [...groups.entries()];
        const pageSize = 8;
        const detailCount = detail ? (entries[0]?.[1].length ?? 0) : 0;
        const pages = Math.ceil(detailCount / pageSize);
        const page = Math.min(Math.max(1, pages), Number(args[1] ?? 1));
        const offset = (page - 1) * pageSize;
        const items = entries.flatMap(([code, group]) => {
          const name = String(group[0].name);

          if (detail) {
            return group.slice(offset, offset + pageSize).map((effect, index) => ({
              title: `${effect.pending === true ? '待续' : '当前'} · 第 ${offset + index + 1} 张`,
              lines:
                effect.pending === true
                  ? [
                      `预计接续：${formatGameTime(String(effect.startedAt))}`,
                      `预计到期：${formatGameTime(String(effect.expiresAt))}`,
                      ...statusEffectLines(effect).filter(line => !line.endsWith(' 到期'))
                    ]
                  : statusEffectLines(effect)
            }));
          }
          const current = group.find(effect => effect.pending !== true);
          const pending = group.filter(effect => effect.pending === true).length;

          return [
            {
              title: group.length > 1 ? `${name} ×${group.length}` : name,
              lines: [...(current ? statusEffectLines(current) : []), ...(pending > 0 ? [`${pending} 张待续，当前一张结束后自动接上。`] : [])],
              actions: pending > 0 && /^[a-z_]{1,32}$/.test(code) ? [{ label: `${name}详情`, command: `/我的状态 ${code}` }] : []
            }
          ];
        });

        await message.send(
          listBubble({
            ...common,
            title:
              detail && entries.length ? `${String(entries[0][1][0].name)}详情` : total > 0 && !detail ? `我的状态｜闭关基础修为 +${total / 100}%` : '我的状态',
            items: items.length ? items : [{ lines: ['当前没有生效或待续的符箓。'] }],
            nav: detail && pages > 1 ? { current: page, total: pages, count: detailCount, command: `/我的状态 ${detail} {page}` } : undefined,
            footer: [{ label: detail ? '返回我的状态' : '刷新状态', command: '/我的状态' }]
          })
        );
      }
    } catch {
      await feedback('状态暂时无法读取，请稍后再试。');
    }

    return;
  }
  const convoyId = action === '商运' && args.length === 0 ? 0 : parsePKCommandInteger(args[0]);
  const publicSolo = action === '立即抢商队' && args.length === 1;
  const publicTeam = action === '组队抢商队' && args.length === 2 && args[1] === '行动';
  let currentBoard: Awaited<ReturnType<typeof readBoard>> | undefined;

  function readBoard() {
    return runRobotBusiness(event, 'shop-raid.board', { convoyId }, parseBoardPage, next, reply => feedback(reply.text));
  }

  // /商运 首屏要能看到禁购规则：车队卡里只有在能出手时才出现这条提示
  const banNotice = (banUntil: string | null) => [{ lines: banNoticeLines(banUntil) }];

  if (convoyId !== null && (publicSolo || publicTeam)) {
    try {
      currentBoard = await readBoard();
      if (currentBoard.handled) {
        return;
      }

      let [card] = currentBoard.data.cards;

      if (publicTeam && (card?.raidPhase === 'traveling' || card?.raidPhase === 'contested')) {
        const prepared = await runRobotBusiness(event, 'shop-raid.crew', { mode: 'prepare', convoyId }, record, next, async r => {
          await message.send(
            errorBubble({
              ...common,
              title: '组队抢货',
              reason: r.text,
              footer: [
                { label: '创队伍', command: '/打劫队 创建' },
                { label: '打劫队列表', command: '/打劫队 列表' },
                { label: '查看商队', command: `/商运 ${convoyId}` }
              ]
            })
          );
        });

        if (prepared.handled) {
          return;
        }
        currentBoard = await readBoard();
        if (currentBoard.handled) {
          return;
        }
        [card] = currentBoard.data.cards;
      }
      const open = card?.raidPhase === 'traveling' || card?.raidPhase === 'contested';
      const preview = (card?.raidPhase === 'traveling' && card.guardCount > 0 && !card.myGuardSeat) || (card?.raidPhase === 'contested' && !card.canClose);
      const team = publicTeam && card?.myTeamLeader ? card.raidTeams.find(team => team.id === card.myTeamId) : undefined;

      if (
        card &&
        open &&
        (card.canSoloRaid || preview) &&
        typeof card.revision === 'number' &&
        (publicSolo || (team && card.pendingMembers === 0 && typeof team.id === 'number' && typeof team.revision === 'number'))
      ) {
        action = preview ? '预览商运斗法' : action;
        args.splice(1, 1, String(card.revision));
        if (team) {
          args.push(String(team.id), String(team.revision));
        }
      } else {
        action = '商运';
        args.splice(1);
      }
    } catch {
      await feedback('商队暂时无法读取，请稍后再试。');

      return;
    }
  }
  const seat = args[1] === undefined ? null : parsePKCommandInteger(args[1]);

  if (action === '查看商运战报') {
    if (convoyId === null || seat === null || args.length !== 2) {
      await feedback('请从劫货回执打开战斗过程。');

      return;
    }

    try {
      const entry = await runRobotBusiness(event, 'shop-raid.solo-status', { attemptId: convoyId, round: seat }, record, next, reply => feedback(reply.text));

      if (!entry.handled) {
        const { round, total } = entry.data;

        if (typeof round !== 'number' || typeof total !== 'number') {
          throw new Error('商运战报无效');
        }

        const lines = roundLines(entry.data);

        await message.send(
          listBubble({
            ...common,
            title: '商运战报',
            items: [{ title: '斗法', id: convoyId, lines: [`回合：第 ${round} 回合，共 ${total} 回合`, ...lines] }],
            nav: { current: round, total, command: `/查看商运战报 ${convoyId} {page}` },
            footer: [{ label: '返回劫货回执', command: `/查看劫货进度 ${convoyId}` }]
          })
        );
      }
    } catch {
      await feedback('商运战报暂时无法读取，请稍后再试。');
    }

    return;
  }

  if (action === '确认商运出战') {
    const mode = args[3] === '继续守' ? 'hold' : args[3] === '只打' ? 'fight' : null;
    const stamp = args[2];

    if (args.length !== 4 || convoyId === null || seat === null || !/^[0-9a-f]{32}$/.test(stamp ?? '') || !mode) {
      await feedback('出战承诺无效，请刷新商队。');

      return;
    }

    try {
      const entry = await runRobotBusiness(
        event,
        'shop-raid.participation',
        {
          convoyId,
          teamId: seat,
          stamp,
          mode
        },
        record,
        next,
        reply => feedback(reply.text)
      );

      if (!entry.handled) {
        await message.send(
          listBubble({
            ...common,
            title: '商运出战已确认',
            items: [{ lines: [mode === 'hold' ? '本场获胜后，你会继续随队守货。' : '你只参加这场斗法。胜后离队，也不参与本段归还分成。'] }],
            footer: [{ label: '查看商队', command: `/商运 ${convoyId}` }]
          })
        );
      }
    } catch {
      await feedback('出战承诺暂时无法确认，请刷新商队。');
    }

    return;
  }

  if (action === '商运归还分成' || action === '确认商运分成') {
    const memberId = parsePKCommandInteger(args[2]);
    const amount = parsePKCommandInteger(args[3]);
    const accept = action === '确认商运分成';
    const autoReturn = args[4] === '自动归还';

    const validArguments = args.length === 4 || (args.length === 5 && autoReturn);

    if (!validArguments || convoyId === null || seat === null || memberId === null || amount === null || amount > 60) {
      await feedback('请填写商队号、临时队号、队员 UID 和分成灵晶。');

      return;
    }

    try {
      const entry = await runRobotBusiness(
        event,
        'shop-raid.team-share',
        {
          convoyId,
          teamId: seat,
          memberId,
          amount,
          accept,
          ...(autoReturn ? { autoReturn } : {})
        },
        record,
        next,
        reply => feedback(reply.text)
      );

      if (!entry.handled) {
        await message.send(
          listBubble({
            ...common,
            title: accept ? '归还分成已确认' : '归还分成邀约',
            items: [
              { lines: [`队员 UID ${memberId} · 合资格归还时分 ${amount} 灵晶。`, autoReturn ? '守满后自动归还并结算。' : '守满后由队长选择留用或归还。'] }
            ],
            footer: accept
              ? [{ label: '查看商队', command: `/商运 ${convoyId}` }]
              : [{ label: '确认分成', command: `/确认商运分成 ${convoyId} ${seat} ${memberId} ${amount}${autoReturn ? ' 自动归还' : ''}` }]
          })
        );
      }
    } catch {
      await feedback('商运分成暂时无法确认，请稍后再试。');
    }

    return;
  }
  const closeAction = args[1] === '留用' ? 'retain' : args[1] === '归还' ? 'return' : args[1] === '弃货' ? 'abandon' : null;
  const closeConfirm = action === '确认商运结案';
  const closing = action === '商运结案' || closeConfirm;
  const closureRevision = closeConfirm ? parsePKCommandInteger(args[2]) : null;
  const guardPreview = action === '预览商运斗法';
  const guardConfirm = action === '确认商运斗法';
  const defenderToken = guardConfirm && args.at(-2)?.match(/^阵容([0-9a-f]{16})$/);
  const defenderStamp = defenderToken ? defenderToken[1] : undefined;

  if (defenderStamp) {
    args.splice(-2, 1);
  }
  const guardAction = guardPreview || guardConfirm;
  const mainGuardId = guardConfirm ? parsePKCommandInteger(args[2]) : null;
  const risk = guardConfirm ? args.at(-1) : undefined;
  const reverseConfirmed = risk === '可反夺' ? true : risk === '仅保货' ? false : undefined;
  const riskArgs = reverseConfirmed === undefined ? 0 : 1;
  const teamAttack = (action === '组队抢商队' && args.length > 1) || (guardAction && args.length - riskArgs > (guardConfirm ? 3 : 2));
  const teamIndex = guardConfirm ? 3 : 2;
  const teamId = teamAttack ? parsePKCommandInteger(args[teamIndex]) : null;
  const teamRevision = teamAttack ? parsePKCommandInteger(args[teamIndex + 1]) : null;
  const teamMode = action === '组队抢商队' && !teamAttack ? 'create' : action === '加入商运临时队' ? 'join' : action === '退出商运临时队' ? 'leave' : null;
  const teamNeedsID = teamMode === 'join' || teamMode === 'leave';
  const maxArgs = guardAction
    ? (guardConfirm ? 3 : 2) + (teamAttack ? 2 : 0) + riskArgs
    : teamAttack
      ? 4
      : action === '确认商运护卫' || closeConfirm
        ? 3
        : action === '加入商运护卫' || action === '立即抢商队' || closing || teamNeedsID
          ? 2
          : 1;

  if (
    convoyId === null ||
    args.length > maxArgs ||
    (closing && closeAction === null) ||
    (closeConfirm && closureRevision === null) ||
    (guardAction && seat === null) ||
    (guardConfirm && mainGuardId === null) ||
    (teamAttack && (seat === null || teamId === null || teamRevision === null)) ||
    ((action === '立即抢商队' || teamNeedsID) && seat === null) ||
    ((action === '加入商运护卫' || action === '确认商运护卫') && (seat === null || seat > 3)) ||
    (action === '确认商运护卫' && args[2] !== '主守' && args[2] !== '助守')
  ) {
    await feedback('商队或护卫席位无效，请刷新商队。');

    return;
  }

  const raidFeedback = async (reason: string) => {
    await message.send(
      errorBubble({
        ...common,
        title: '万宝楼劫货',
        reason,
        footer: [{ label: '刷新商队', command: `/商运 ${convoyId}` }]
      })
    );
  };

  try {
    if (teamMode) {
      const response = await runRobotBusiness(event, 'shop-raid.team', { convoyId, teamId: seat ?? 0, mode: teamMode }, record, next, reply => feedback(reply.text)
      );

      if (!response.handled) {
        const team = response.data.team ? record(response.data.team) : null;
        const card = response.data.card ? record(response.data.card) : null;
        const lines = teamMode === 'leave' ? ['已退出临时队。'] : ['已加入本趟临时队。'];
        const publicActions = publicRaidActions(convoyId);

        if (card?.phase === 'recruiting') {
          publicActions.shift();
          if (typeof card.nextGuardSeat === 'number' && card.nextGuardSeat > 0 && !card.noPaidGuard) {
            publicActions.unshift({ label: '加入护卫', command: `/加入商运护卫 ${convoyId} ${card.nextGuardSeat}` });
          }
        } else if (card?.phase !== 'traveling' && card?.phase !== 'contested' && card?.phase !== 'fighting') {
          publicActions.length = 0;
        }

        if (team && teamMode !== 'leave' && Array.isArray(team.members)) {
          lines.push(`队长 UID ${team.leaderId} · ${team.members.length}/3 人`);
        }

        await message.send(
          listBubble({
            ...common,
            title: '商运临时队',
            items: [{ lines }],
            footer: [
              ...(team && teamMode !== 'leave' ? [{ label: '加入这支队', command: `/加入商运临时队 ${convoyId} ${team.id}` }] : []),
              ...(!common.isPrivate ? publicActions : []),
              { label: '查看商队', command: `/商运 ${convoyId}` }
            ]
          })
        );
      }

      return;
    }

    if (guardPreview) {
      const entry = await runRobotBusiness(event, 'shop-raid.guard-preview', { convoyId, revision: seat }, record, next, reply => raidFeedback(reply.text));

      if (!entry.handled) {
        const main = entry.data.mainGuardId;

        if (typeof main !== 'number' || main <= 0) {
          await raidFeedback('当前主守已变更，请刷新商队。');

          return;
        }

        const reverse = entry.data.reverseEligible === true;
        const leavingTeam = !teamAttack;

        await message.send(
          confirmBubble({
            ...common,
            title: entry.data.holderBattle === true ? '确认反抢整车' : '确认劫货斗法',
            target: [
              `本场财物对手：${entry.data.holderBattle === true ? '持货者' : '主守'} UID ${main}`,
              ...(Array.isArray(entry.data.defenders) ? [`守货阵容 UID ${entry.data.defenders.join('、')}`] : []),
              '胜负按整队判定，打赢后占用整车。'
            ],
            costs: [
              typeof entry.data.baseQiCost === 'number'
                ? `元力随修为一起结算，基础消耗 ${entry.data.baseQiCost} 点，实扣按减免计算。`
                : '本场计入普通打劫，元力随修为一起结算。',
              ...(leavingTeam ? ['如果你已加入打劫队，单抢实际锁阵时离队，未出战则留队。'] : []),
              reverse ? '若守方获胜、主守仍在场且攻方队长倒地，主守可能反夺普通财物。' : '本场守方获胜时仅保货。',
              ...(entry.data.holderBattle === true ? [] : ['参战劫货者次日不能在万宝楼购物。'])
            ],
            actions: [
              {
                label: '确认抢货',
                command: `/确认商运斗法 ${convoyId} ${seat} ${main}${teamAttack ? ` ${teamId} ${teamRevision}` : ''}${typeof entry.data.defenderStamp === 'string' ? ` 阵容${entry.data.defenderStamp}` : ''} ${reverse ? '可反夺' : '仅保货'}`
              }
            ],
            back: { label: '刷新商队', command: `/商运 ${convoyId}` }
          })
        );
      }

      return;
    }

    if (guardConfirm || teamAttack || action === '立即抢商队' || action === '查看劫货进度') {
      const entry =
        guardConfirm || teamAttack || action === '立即抢商队'
          ? await runRobotBusiness(
              event,
              'shop-raid.solo',
              {
                convoyId,
                revision: seat,
                ...(teamAttack ? { teamId, teamRevision } : {}),
                ...(guardConfirm ? { mainGuardId, reverseConfirmed, ...(defenderStamp ? { defenderStamp } : {}) } : {})
              },
              record,
              next,
              reply => raidFeedback(reply.text)
            )
          : await runRobotBusiness(event, 'shop-raid.solo-status', { attemptId: convoyId }, record, next, reply => feedback(reply.text));

      if (!entry.handled) {
        const currentConvoy = typeof entry.data.convoyId === 'number' ? entry.data.convoyId : convoyId;
        const state = entry.data.state;
        const outcome = entry.data.outcome ? record(entry.data.outcome) : null;
        const teamBattleId = typeof outcome?.teamBattleId === 'number' ? outcome.teamBattleId : undefined;
        const summary =
          teamBattleId !== undefined
            ? '你的单抢请求未出战，你已随原队伍进入本场斗法。'
            : state === 'settled' && outcome
              ? outcome.attackWon === true
                ? '夺下整车货，开始守货。'
                : '本场未夺下整车货，守方保住整车。'
              : state === 'not_selected'
                ? '本轮由另一方先出战，本次未出战，未扣元力。'
                : state === 'ineligible'
                  ? outcome?.rejectionReason === 'insufficient_qi'
                    ? '结算时元力不足，本场已取消，未扣元力，整车归属未变。'
                    : outcome?.rejectionReason === 'defenders_changed'
                      ? '守货阵容已变，本次未出战，未扣元力。可按当前阵容重新确认。'
                      : '本次未出战，未扣元力。请查看当前商队。'
                  : '本轮斗法正在处理。';
        const convoy = entry.data.currentConvoy ? parseBoard({ items: [entry.data.currentConvoy] })[0] : undefined;
        const canChallenge = !convoy || ['traveling', 'contested', 'fighting'].includes(convoy.phase);
        const lines = [
          summary,
          ...(state === 'settled' && typeof outcome?.rounds === 'number' ? [`斗法：共 ${outcome.rounds} 回合`] : []),
          ...(typeof outcome?.cargoHolderId === 'number'
            ? [`整车货：${outcome.cargoHolderId > 0 ? `本场结算由 UID ${outcome.cargoHolderId} 占用` : '万宝楼商队保住整车'}`]
            : []),
          ...(typeof entry.data.qiPaid === 'number' ? [`元力：UID ${entry.data.actorId} 实扣 ${entry.data.qiPaid}`] : []),
          ...ordinarySettlementLines(entry.data.ordinary),
          ...(convoy
            ? [
                `货单：${convoy.cargo.join('、')}`,
                ...(convoy.holderId && ['contested', 'fighting', 'sealed', 'ready'].includes(convoy.phase)
                  ? [
                      ...(convoy.holderId !== outcome?.cargoHolderId ? [`当前占用：UID ${convoy.holderId}`] : []),
                      ...(convoy.holdUntil && convoy.phase !== 'ready' ? [`守货截止：${formatGameTime(convoy.holdUntil)}`] : [])
                    ]
                  : [`当前状态：${convoy.status}`])
              ]
            : []),
          ...(!entry.data.ordinary && state === 'settled' && outcome?.attackWon === false
            ? [outcome.reversedLoot === true ? '财物：守方已反夺普通财物。' : '财物：本场未发生反夺。']
            : [])
        ];

        await message.send(
          listBubble({
            ...common,
            title: convoy ? `商运劫货回执 #${convoy.id}` : '商运劫货回执',
            items: [{ lines }],
            footer: [
              ...(!common.isPrivate && canChallenge && (action !== '查看劫货进度' || typeof entry.data.convoyId === 'number')
                ? publicRaidActions(currentConvoy)
                : []),
              ...(state === 'settled' && outcome?.attackWon === true ? [{ label: '创队伍', command: '/打劫队 创建' }] : []),
              ...(state === 'settled' && typeof outcome?.rounds === 'number' && outcome.rounds > 0
                ? [{ label: '查看战斗过程', command: `/查看商运战报 ${entry.data.attemptId} 1` }]
                : []),
              ...(typeof outcome?.ordinaryLogId === 'number' && outcome.ordinaryLogId > 0
                ? [{ label: '原争夺战报', command: `/争夺战报 ${outcome.ordinaryLogId}` }]
                : []),
              { label: '查看劫货进度', command: `/查看劫货进度 ${String(teamBattleId ?? entry.data.attemptId)}` },
              { label: '查看商队', command: `/商运 ${String(entry.data.convoyId ?? convoyId)}` }
            ]
          })
        );
      }

      return;
    }

    if (action === '确认商运结案' && closeAction) {
      const closed = await runRobotBusiness(
        event,
        'shop-raid.close',
        { convoyId, action: closeAction, revision: closureRevision },
        value => record(value),
        next,
        reply => feedback(reply.text)
      );

      if (!closed.handled) {
        const title = closed.data.action === 'retain' ? '整车货已留用' : '整车货已交回万宝楼';

        await message.send(
          listBubble({
            ...common,
            title,
            items: [{ lines: [closed.data.action === 'retain' ? '货物已到账。' : `实发报酬：${String(closed.data.crystals)} 灵晶。`] }],
            footer: [
              ...(Array.isArray(closed.data.items) && closed.data.items.map(record).some(item => item.category === 'effect')
                ? [{ label: '我的状态', command: '/我的状态' }]
                : []),
              { label: '查看商队', command: `/商运 ${convoyId}` }
            ]
          })
        );
      }

      return;
    }
    const response =
      action === '商运' || action === '加入商运护卫' || action === '商运结案'
        ? (currentBoard ?? (await readBoard()))
        : await runRobotBusiness(
            event,
            'shop-raid.guard',
            {
              convoyId,
              seat: seat ?? 0,
              mainGuard: args[2] === '主守',
              mode: action === '退出商运护卫' ? 'withdraw' : action === '递补商运主守' ? 'opt-in' : 'join'
            },
            parseBoardPage,
            next,
            reply => feedback(reply.text)
          );

    if (response.handled) {
      return;
    }

    if (action === '商运结案') {
      const [card] = response.data.cards;

      if (!card?.canClose || typeof card.revision !== 'number' || (closeAction === 'abandon' ? card.phase !== 'contested' : card.phase !== 'ready')) {
        await feedback('商队已变化，请刷新后查看可用动作。');

        return;
      }

      await message.send(
        confirmBubble({
          ...common,
          title: `确认${args[1]}整车货`,
          target: card.cargo,
          costs: [
            closeAction === 'retain' ? '整车货物一起到账。' : `整车货物交回万宝楼，本趟报酬 ${closeAction === 'return' ? card.eligibleBounty : 0} 灵晶。`
          ],
          actions: [{ label: `确认${args[1]}`, command: `/确认商运结案 ${convoyId} ${args[1]} ${card.revision}` }],
          back: { label: '刷新商队', command: `/商运 ${convoyId}` }
        })
      );

      return;
    }

    if (action === '加入商运护卫') {
      const [card] = response.data.cards;

      if (card?.phase !== 'recruiting' || card.noPaidGuard || card.nextGuardSeat !== seat || card.myGuardSeat) {
        await feedback('护卫席位已变化，请刷新商队。');

        return;
      }

      await message.send(
        confirmBubble({
          ...common,
          title: `确认加入护卫｜${seat} 号席`,
          target: card.cargo,
          costs: [`守成工钱 ${card.nextGuardWage} 灵晶。担任主守时，真人斗法可能损失普通财物。`],
          actions: [
            { label: '确认并同意主守', command: `/确认商运护卫 ${convoyId} ${seat} 主守` },
            ...(!card.nextNeedsMain ? [{ label: '确认仅助守', command: `/确认商运护卫 ${convoyId} ${seat} 助守` }] : [])
          ],
          back: { label: '刷新商队', command: `/商运 ${convoyId}` }
        })
      );

      return;
    }

    const items = response.data.cards.map(card => {
      const lines = [card.cargo.join('、')];

      if (card.noPaidGuard && (card.phase === 'recruiting' || card.phase === 'traveling')) {
        lines.push(card.phase === 'recruiting' ? '本趟由 NPC 护送，启程后可争夺整车货物。' : '本趟由 NPC 护送，现可争夺整车货物。');
      }

      if (card.returnBounty > 0 && (card.phase === 'recruiting' || card.phase === 'traveling' || card.phase === 'contested')) {
        if (card.bountyCargo) {
          lines.push(`${card.bountyCargo} 附归还赏。`);
        }
        lines.push(`符合资格并守满后，整车归还奖酬 ${card.returnBounty} 灵晶。`);
      }

      if (card.closureAction === 'expired') {
        lines.push('争夺到期时未守满，整车由万宝楼收回。奖酬 0 灵晶。');
      }

      if (card.autoReturn && (card.phase === 'contested' || card.phase === 'ready' || card.phase === 'sealed')) {
        lines.push(card.phase === 'ready' ? '已守满，正在按约定归还。' : '已约定守满后自动归还。');
      }

      if (card.phase === 'ready' && card.decisionUntil && card.canClose) {
        lines.push(`请在 ${formatGameTime(card.decisionUntil)} 前选择留用或归还。逾时自动留用。`);
      }

      if (card.holderId !== undefined) {
        lines.push(`占用人：UID ${card.holderId}`);

        if (card.holdUntil) {
          lines.push(`守至 ${formatGameTime(card.holdUntil)}`);
        }
      } else {
        lines.push(`启程：${formatGameTime(card.departureAt)} · 入库：${formatGameTime(card.arrivalAt)}`);

        if (card.phase === 'recruiting' && !card.noPaidGuard) {
          lines.push(`真人护卫 ${card.guardCount}/3${card.nextGuardWage ? ` · 下一席工钱 ${card.nextGuardWage} 灵晶` : ''}`);
        }

        if (card.phase === 'recruiting' && card.teamsEnabled) {
          lines.push('招募期参与：先建长期打劫队，群友在【打劫队列表】点【加入这支队】；启程后由队长发起组队抢。');
        }
      }

      const actions = [{ label: '刷新商队', command: `/商运 ${card.id}` }];
      const teamOpen = card.phase === 'recruiting' || card.phase === 'traveling' || card.phase === 'contested';
      const challengeHolder = card.phase === 'contested' && !card.canClose;
      const needsPreview = challengeHolder || (card.phase === 'traveling' && card.guardCount > 0);

      if (!common.isPrivate) {
        const [solo, team] = publicRaidActions(card.id);

        if (card.phase === 'traveling' || card.phase === 'contested' || card.phase === 'fighting') {
          actions.unshift(solo);
        }
        if (card.teamsEnabled && (teamOpen || card.phase === 'fighting')) {
          actions.splice(card.phase === 'recruiting' ? 0 : 1, 0, card.phase === 'recruiting' ? { label: '创队伍', command: '/打劫队 创建' } : team);
          if (card.phase !== 'recruiting') {
            actions.push({ label: '创队伍', command: '/打劫队 创建' });
          }
        }
      }

      if (card.teamsEnabled && teamOpen) {
        if (typeof card.myTeamId === 'number') {
          actions.push({ label: '管理打劫队', command: '/打劫队' });
        } else if (common.isPrivate && !card.myGuardSeat) {
          actions.push(
            card.phase === 'recruiting' ? { label: '创队伍', command: '/打劫队 创建' } : { label: '组队抢', command: `/组队抢商队 ${card.id} 行动` }
          );
        }
        for (const team of card.raidTeams) {
          if (typeof team.id !== 'number' || !Array.isArray(team.members)) {
            continue;
          }

          lines.push(`临时队 · 队长 UID ${team.leaderId} · ${team.members.length}/3 人`);
          if (card.myTeamId === team.id && (card.confirmedMembers > 0 || card.pendingMembers > 0)) {
            lines.push(`队员出战确认 ${card.confirmedMembers}/${card.confirmedMembers + card.pendingMembers}`);
          }

          if (publicTeam && card.myTeamId === team.id) {
            if (!card.myTeamLeader) {
              lines.push(`由队长 UID ${team.leaderId} 发起组队抢货，你可以在本车确认出战。`);
            } else if (card.pendingMembers > 0) {
              lines.push('等队员确认出战后，再点【组队抢】。');
            }
          }

          if (card.myTeamId === team.id && typeof card.participationStamp === 'string') {
            const prefix = `/确认商运出战 ${card.id} ${team.id} ${card.participationStamp}`;

            if (card.myParticipation === 'hold' || card.myParticipation === 'fight') {
              lines.push(card.myParticipation === 'hold' ? '你已确认胜后继续守。' : '你已确认只打这一场。');
            }
            if (card.myShare > 0) {
              const settlement = card.myTeamAutoReturn ? '守满后按约自动归还' : '守满后若队长归还';

              lines.push(`继续守时，${settlement}，符合资格可分 ${card.myShare} 灵晶。`);
            }

            actions.push({ label: '出战并继续守', command: `${prefix} 继续守` }, { label: '只打这一场', command: `${prefix} 只打` });
          }

          if (card.returnBounty > 0 && card.phase === 'contested' && card.myTeamId === team.id && card.myTeamLeader && team.members.length > 1) {
            lines.push(`归还分成：/商运归还分成 ${card.id} ${team.id} 队员UID 灵晶数（可加 自动归还）`);
          }

          if (
            (card.canSoloRaid || needsPreview) &&
            card.myTeamId === team.id &&
            card.myTeamLeader &&
            card.pendingMembers === 0 &&
            typeof card.revision === 'number' &&
            typeof team.revision === 'number'
          ) {
            lines.push(challengeHolder ? '组队出战由队长支付元力、胜后占用整车。' : '组队出战由队长支付元力、胜后占用整车，参战队员均承担次日禁购。');
            if (common.isPrivate) {
              actions.push({
                label: '组队抢',
                command: `/${needsPreview ? '预览商运斗法' : '组队抢商队'} ${card.id} ${card.revision} ${team.id} ${team.revision}`
              });
            }
          }
          if (!card.myTeamId && !card.myGuardSeat && team.members.length < 3) {
            if (typeof team.crewId === 'number') {
              actions.push({ label: `加入 UID ${team.leaderId} 的队`, command: `/打劫队 加入 ${team.crewId}` });
            }
          }
        }
      }

      if (card.phase !== 'fighting' && (card.canSoloRaid || (needsPreview && (!card.myGuardSeat || challengeHolder))) && typeof card.revision === 'number') {
        lines.push(challengeHolder ? '胜后由你占用整车，重新开始守货。' : '实际出战消耗元力，次日不能在万宝楼购物。');
        if (card.myTeamId) {
          lines.push('点【立即抢】后，实际锁阵才会离开当前临时队。');
        }
        if (common.isPrivate) {
          actions.unshift({ label: '立即抢', command: `/${needsPreview ? '预览商运斗法' : '立即抢商队'} ${card.id} ${card.revision}` });
        }
      }

      if (card.canClose && card.phase === 'ready') {
        actions.unshift(
          { label: '留用整车货', command: `/商运结案 ${card.id} 留用` },
          { label: card.eligibleBounty > 0 ? `归还领 ${card.eligibleBounty} 灵晶` : '归还万宝楼', command: `/商运结案 ${card.id} 归还` }
        );
      } else if (card.canClose && card.phase === 'contested') {
        actions.unshift({ label: '主动弃货', command: `/商运结案 ${card.id} 弃货` });
      }
      if (card.canSupport && typeof card.revision === 'number') {
        actions.push({ label: '确认协守', command: `/打劫队 协守 ${card.id} ${card.revision}` });
      }

      if (card.phase === 'recruiting') {
        if (card.myGuardSeat) {
          lines.push(`你在 ${card.myGuardSeat} 号护卫席`);
          actions.unshift({ label: '退出护卫', command: `/退出商运护卫 ${card.id}` });

          if (!card.myGuardMain) {
            actions.unshift({ label: '同意递补主守（可能损失普通财物）', command: `/递补商运主守 ${card.id}` });
          }
        }
        if ((!card.myGuardSeat || !common.isPrivate) && !card.noPaidGuard && card.nextGuardSeat) {
          actions.unshift({ label: '加入护卫', command: `/加入商运护卫 ${card.id} ${card.nextGuardSeat}` });
        }
      }

      return {
        id: card.id,
        title: `万宝楼商队｜${card.status}`,
        lines,
        actions
      };
    });

    await message.send(
      listBubble({
        ...common,
        title: '商运',
        items: [
          // 首屏固定带运货时段和禁购规则，这样玩家在出手前就知道次日买不了万宝楼
          ...(convoyId === 0 && action === '商运'
            ? [
                { lines: scheduleLines(response.data.schedule) },
                ...banNotice(response.data.banUntil),
                ...(items.length ? [] : [{ lines: ['当前没有正在招募或运送的商队。'] }])
              ]
            : banNotice(response.data.banUntil)),
          ...items
        ],
        footer: [
          { label: '打劫队列表', command: '/打劫队 列表' },
          { label: '我的打劫队', command: '/打劫队 我的' }
        ]
      })
    );
  } catch {
    await feedback('商队暂时无法读取，请稍后再试。');
  }
});
