import { Format, logger, onResponse, useEvent } from 'alemonjs';
import { formatGameTime } from '@src/utils/gameTime';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { commandCharacterLength, commandText } from '@src/utils/commandPrefix';
import { useMessage } from '@src/utils/useMessage';
import { selects } from '@src/response/config';
import { runRobotBusiness } from '@src/response/robotBusiness';
import { withBusinessRecovery } from '@src/response/businessRecovery';
import { addOptions, createQuoteMarkdown, FormatGui, type GuiButton, type GuiFooter } from '@src/utils/messageHelper';
import { section } from '@src/response/presentation/sections';
import { parseForgeCatalogArguments, forgeRecipesForFilter, forgeCatalogCommand, type ForgeCatalogQuery } from './catalog';
import {
  parseForgeOrderPreview,
  parseForgeOrder,
  parseForgeOrders,
  type ForgeOrder,
  parseForgeOverview,
  parseForgeLearnBlueprintResult,
  parseForgePreview,
  parseForgeResult,
  parseForgeHistory,
  type ForgeOverview,
  type ForgeLearnableBlueprint,
  type ForgeRecipe,
  type ForgePreview,
  type ForgeResult,
  type ForgeHistory
} from '@src/api/schemas/forge';

function earlyForgeProgress(p: ForgePreview): string[] {
  const { recipe, professionLevel } = p;

  if (p.tutorial || !recipe.earlyCraft || professionLevel === undefined || professionLevel >= recipe.requiredLevel) {
    return [];
  }

  return [
    `经验：本次 +${p.expGained} · 计入匠师第${professionLevel}阶`,
    ...(recipe.assessment ? [`考核：升到${recipe.requiredLevel}阶后计入该阶考核，同一图纸只计一种`] : ['考核：该配方不计入作品考核'])
  ];
}

function forgeToolSwitchCommand(typeName?: string): string {
  const command = typeName ? `/替换 列表 1 ${typeName}` : '/替换';

  return commandCharacterLength(command) <= 80 ? command : '/替换';
}

export default onResponse(selects, async e => {
  const [message] = useMessage();
  const [, next] = useEvent();
  const text = e.MessageText.trim().replace(/^[!！/#＃]/, '');
  const [command, ...rest] = text.split(/\s+/);
  const arg = rest.join(' ');
  const isForgeHome = command === '我的锻造';
  const isForgeCatalog = command === '锻造图纸';
  const isForgeHistory = command === '锻造记录';
  const isForgeGuide = command === '锻造指引';
  const catalogQuery = isForgeCatalog ? parseForgeCatalogArguments(rest) : null;
  const content = Format.createMarkdown();
  let title = isForgeHome ? '我的洞府 · 锻造坊' : '锻造师';
  const orderCommand = command.includes('委托');
  const toolBag = { label: '工具', command: '/储物袋 天工', autoEnter: false };
  const acquireTool = { label: '获取天工', command: '/商店 万宝楼 筛选 天工', autoEnter: false };
  const switchTool = { label: '切换工具', command: '/替换', autoEnter: false };
  const equipment = { label: '装备', command: '/储物袋 装备', autoEnter: false };
  const header = [toolBag, switchTool];
  const craftLinks = [
    equipment,
    { label: '委托', command: '/锻造委托', autoEnter: false }
  ];
  const base = { bid: e.UserId, isPrivate: e.isPrivate ?? false };
  let pageHeader: GuiButton[] | undefined =
    isForgeHome || isForgeCatalog || isForgeHistory || isForgeGuide
      ? [
          { label: '职业', selected: isForgeHome, command: isForgeHome ? undefined : '/我的锻造', autoEnter: false },
          { label: '图谱', selected: isForgeCatalog, command: isForgeCatalog ? undefined : '/锻造图纸', autoEnter: false },
          { label: '记录', selected: isForgeHistory, command: isForgeHistory ? undefined : '/锻造记录', autoEnter: false },
          { label: '指引', selected: isForgeGuide, command: isForgeGuide ? undefined : '/锻造指引', autoEnter: false }
        ]
      : undefined;
  let nav: Parameters<typeof FormatGui>[0]['nav'];
  let footer: GuiFooter = orderCommand
    ? [
        { label: '委托', command: '/锻造委托' },
        { label: '锻造', command: '/我的锻造' }
      ]
    : isForgeHome
      ? [header, craftLinks]
      : isForgeCatalog
        ? []
        : [
            { label: '图纸', command: '/锻造图纸' },
            { label: '锻造', command: '/我的锻造' }
          ];
  const send = () => message.send(
      FormatGui({
        ...base,
        title,
        header: pageHeader,
        content,
        nav,
        footer
      })
    );
  const feedback = async (reply: { title: string; text: string }) => {
    await message.send(
      FormatGui({
        ...base,
        title: reply.title,
        content: Format.createMarkdown().addBlockquote(
          createQuoteMarkdown(
            [reply.text],
            orderCommand
              ? [{ label: '查看委托', command: '/锻造委托' }]
              : [
                  { label: '查看图纸', command: '/锻造图纸' },
                  { label: '我的锻造', command: '/我的锻造' }
                ]
          )
        )
      })
    );
  };

  function showResult(r: ForgeResult, owned = true, record = false, commissioned = false) {
    content.addBlockquote(
      createQuoteMarkdown(
        [
          `${r.name}${record || r.replayed ? ' · 制作记录' : ' · 打造完成'}`,
          ...r.comparisons
            .filter(a => a.value !== 0 || a.current !== 0)
            .map(a => `${a.name}：${a.value}${a.unit}${a.delta === 0 ? '' : `（${a.delta > 0 ? '+' : ''}${a.delta}${a.unit}）`}`),
          `对比：${r.currentEquipment}（制作时）`,
          `署名：${r.crafter}${r.equipment.permission & 2 ? ' · 可交易' : ' · 不可交易'}`
        ],
        owned
          ? record || r.replayed
            ? [{ label: '查看装备', command: '/储物袋 装备' }]
            : r.canEquip
              ? [{ label: '装备', command: `/装备 ${r.equipment.id}` }]
              : [{ label: '查看装备', command: '/储物袋 装备' }]
          : []
      )
    );
    const costs = [
      ...(!commissioned
        ? [r.tutorial ? '免费教学 · 经验 +0' : `消耗：灵石 ${r.spiritStoneCost}`, ...(!r.tutorial ? r.materials.map(m => `${m.name} ×${m.required}`) : [])]
        : []),
      ...(!r.tutorial && (!commissioned || r.crafterId === e.uid) ? [`经验 +${r.expGained}${r.assessmentNew ? ' · 首次考核完成 ✓' : ''}`] : [])
    ];

    if (costs.length) {
      content.addBlockquote(createQuoteMarkdown(costs));
    }
    if (r.tutorialTool) {
      const tool = r.tutorialTool;

      content.addBlockquote(
        createQuoteMarkdown(
          [
            `${record || r.replayed ? '入门赠礼' : '获得工具'}：${tool.name} · ${tool.grade} · 绑定`,
            ...(record || r.replayed ? [] : [tool.equipped ? '已启用' : '已存入天工背包'])
          ],
          [
            { label: '查看工具', command: '/储物袋 天工' },
            { label: '查看图纸', command: '/锻造图纸' }
          ]
        )
      );
    }
  }
  function showOrder(o: ForgeOrder, page?: number) {
    const status = o.refundPending
      ? '已到期，待退款'
      : { pending: '待接单', delivered: '已交付', cancelled: '已取消并退款', expired: '已到期并退款' }[o.status];

    const summary = page !== undefined;
    const refunded = o.status === 'cancelled' || o.status === 'expired';
    const owner = o.ownerId === e.uid;

    content.addBlockquote(
      createQuoteMarkdown(
        [
          `委托 ${o.id} · ${o.name} · ${status}`,
          owner ? `匠师：${o.crafterName}（${o.crafterId}）` : `委托者：${o.ownerName}（${o.ownerId}）`,
          refunded
            ? `${owner ? '已退回' : '已退回委托者'}：灵石 ${o.spiritStoneCost + o.fee}`
            : owner
              ? `${o.status === 'delivered' ? '已支付' : '托管'}：灵石 ${o.spiritStoneCost + o.fee}（制作 ${o.spiritStoneCost} · 工费 ${o.fee}）`
              : `${o.status === 'delivered' ? '获得工费' : '工费'}：灵石 ${o.fee}`,
          ...(!summary && o.status === 'pending' ? [`到期：${formatGameTime(o.expiresAt * 1000, 'YYYY-MM-DD HH:mm')}`] : []),
          ...(!summary ? o.materials.map(m => `${refunded ? '已退回' : o.status === 'delivered' ? '已消耗' : '托管'}：${m.name} ×${m.required}`) : [])
        ],
        [
          ...(summary ? [{ label: '详情', command: `/锻造委托详情 ${o.id} ${page}` }] : []),
          ...(!summary && o.canAccept ? [{ label: '接单并交付', command: `/接取锻造委托 ${o.id}` }] : []),
          ...(!summary && o.canCancel ? [{ label: o.refundPending ? '领取退款' : '取消并退款', command: `/取消锻造委托 ${o.id}` }] : []),
          ...(!summary && owner && o.result ? [{ label: '查看装备', command: '/储物袋 装备' }] : [])
        ]
      )
    );
    if (o.result && !summary) {
      showResult(o.result, false, true, true);
    }
  }
  function showRecipe(
    r: ForgeRecipe,
    summary = false,
    origin: ForgeCatalogQuery = { filter: '全部', page: 1 },
    blueprint?: ForgeLearnableBlueprint
  ) {
    if (!summary) {
      footer = [{ label: '返回图纸', command: forgeCatalogCommand(origin) }];
    }
    const recovery =
      !summary && !r.canCraft
        ? withBusinessRecovery('forge.preview', {
            title: '',
            heading: '',
            text: r.reason,
            buttons: [],
            advice: []
          }).advice
        : [];

    content.addBlockquote(
      createQuoteMarkdown(
        [
          `【${r.id}】${r.name} · ${r.grade} · ${r.type}`,
          `灵石 ${r.spiritStoneCost}${summary ? ` · 材料 ${r.materials.length} 种` : ''}`,
          ...(!summary
            ? [
                ...r.attributes.filter(a => a.max > 0).map(a => `${a.name}：${a.min}～${a.max}${a.unit}`),
                `穿戴：${r.requiredRealm}${r.canEquip ? ' ✓' : ' · 未满足'} · ${r.tradeable ? '可交易' : '不可交易'}`,
                `锻造等级：${r.craftRequiredLevel ?? r.requiredLevel}${r.learned ? '' : ' · 未解锁'}`,
                ...(r.earlyCraft ? [`武器可提前制造 · 配方归属${r.requiredLevel}阶，穿戴门槛不变`] : []),
                ...(r.toolType ? [`工具：${r.toolType} · 品阶 ≥ ${r.toolGrade}`] : []),
                ...r.materials.flatMap(m => [
                  `${m.name}：${m.available}/${m.required}${m.listed ? ` · 上架 ${m.listed}` : ''}${m.locked ? ' · 已锁定' : ''}`,
                  ...(m.available < m.required && m.source ? [`来源：${m.source}`] : [])
                ])
              ]
            : []),
          ...(r.assessment ? [r.completed ? '考核已完成 ✓' : '◇ 考核图纸'] : []),
          ...(r.reason ? [`🔒 ${r.reason}`] : []),
          ...(blueprint ? [`储物袋：${blueprint.name}`] : []),
          ...recovery.map(tip => tip.description)
        ],
        [
          ...(r.canCraft ? [{ label: '打造', command: `/打造 ${r.id}` }] : []),
          ...(blueprint ? [{ label: '学习', command: `/学习锻造图纸 ${blueprint.storageId}`, autoEnter: false }] : []),
          ...recovery.map(tip => ({ label: tip.command, command: tip.command })),
          ...(!summary && r.toolType && !r.canCraft && /缺少符合品阶的|缺少约定的锻造工具/.test(r.reason)
            ? [
                { label: '工具', command: '/储物袋 天工' },
                { label: '切换工具', command: '/替换' },
                { label: '工具交易', command: '/珍宝楼 筛选 天工 价格升序 1' }
              ]
            : []),
          ...(summary ? [{ label: '详情', command: `/锻造图纸详情 ${r.id} ${origin.filter} ${origin.page}` }] : [])
        ]
      )
    );
  }
  function showOverview(v: ForgeOverview, query?: ForgeCatalogQuery, compact = false) {
    if (!v.available) {
      content.addBlockquote(createQuoteMarkdown([v.reason.length ? v.reason : '当前锻造暂不可用'], [{ label: '洞府', command: '/我的洞府' }]));

      return;
    }
    if (!query) {
      const reason = !v.joined && !v.canJoin ? `境界不足，需要达到${v.entryRealm}` : v.joined && !v.canAdvance ? v.advanceReason : '';
      const expMissing = v.joined && v.nextTitle && v.assessmentDone >= v.assessmentRequired ? Math.max(0, v.expRequired - v.exp) : 0;
      const recovery =
        reason && !expMissing
          ? withBusinessRecovery('forge.advance', {
              title: '',
              heading: '',
              text: reason,
              buttons: [],
              advice: []
            }).advice
          : [];
      const advanceStatus = expMissing
        ? [`进度：晋升还差 ${expMissing} 点锻造经验`]
        : v.canAdvance
          ? [`可晋升：${v.nextTitle}`]
          : v.nextTitle && v.advanceReason
            ? [v.advanceReason]
            : [];
      const progressActions = v.joined
        ? v.canAdvance
          ? [{ label: isForgeHome ? '进阶' : '确认晋升', command: `/锻造进阶 ${v.level}`, autoEnter: false }]
          : expMissing
            ? [{ label: '查看本阶练习图纸', command: '/锻造图纸 练习', autoEnter: false }]
            : []
        : v.canJoin
          ? [{ label: '免费入门', command: '/加入锻造师', autoEnter: false }]
          : [];
      const entry = `入门境界：${v.entryRealm}${v.canJoin ? ' ✓' : ' · 未满足'}`;
      const assessment = `考核：${v.assessmentDone}/${v.assessmentRequired}${expMissing ? ' · 已完成' : ''}`;
      const catalogueActions = [
        { label: `待考核 ${forgeRecipesForFilter(v, '考核').length}`, command: '/锻造图纸 考核', autoEnter: false },
        { label: `可制作 ${forgeRecipesForFilter(v, '可制作').length}`, command: '/锻造图纸 可制作', autoEnter: false }
      ];

      if (isForgeHome) {
        const tools = v.equippedTools;
        const row = createQuoteMarkdown(v.joined ? [v.title, `等级：${v.level}`] : ['状态：未入门', entry], v.canAdvance || !v.joined ? progressActions : []);

        if (v.joined) {
          if (!v.canAdvance) {
            row.addNewline();
          }
          row.absorb(createQuoteMarkdown([`经验：${v.exp}${v.nextTitle ? ` / ${v.expRequired}` : ''}`], v.canAdvance ? [] : progressActions));
          if (v.canAdvance || progressActions.length === 0) {
            row.addNewline();
          }
          row.absorb(createQuoteMarkdown([v.nextTitle ? assessment : '状态：已达最高阶段'], v.nextTitle ? [catalogueActions[0]] : []));
          if (v.nextTitle && !v.canAdvance && v.exp >= v.expRequired && v.assessmentDone >= v.assessmentRequired) {
            row.addNewline();
            row.absorb(createQuoteMarkdown(advanceStatus));
          }
        }
        content.addText('我的职业').addNewline();
        content.addBlockquote(row);
        if (v.joined) {
          const unlockedSets = v.unlockedSets?.map(name => `已解锁${name}${name.endsWith('套装') ? '' : '套装'}`);

          content
            .addText('当前等级效果')
            .addNewline()
            .addBlockquote(section({ lines: unlockedSets?.length ? unlockedSets : [unlockedSets ? '暂无已解锁套装' : '套装信息暂不可读取'] }));
        }
        if (tools?.length) {
          addOptions(content.addText('我的天工'), [acquireTool]);
          const toolQuote = Format.createMarkdown();

          for (const tool of tools) {
            toolQuote.absorb(
              createQuoteMarkdown(
                [`${tool.typeName}：${tool.name}`],
                [{ label: '切换', command: forgeToolSwitchCommand(tool.typeName), autoEnter: false }]
              )
            );
          }
          content.addBlockquote(toolQuote);
        } else {
          const typeName = v.recipes.find(recipe => recipe.toolType)?.toolType;

          addOptions(content.addText('我的天工'), [acquireTool, { ...switchTool, command: forgeToolSwitchCommand(typeName) }]);
          content.addBlockquote(section({ lines: [`已装备天工：${tools ? '未装备' : '暂不可读取'}`] }));
        }
        footer = [craftLinks, [{ label: '返回洞府', command: '/我的洞府', autoEnter: false }]];

        return;
      }

      content.addBlockquote(
        createQuoteMarkdown(
          v.joined
            ? [
                `${v.title} · 等级 ${v.level}`,
                ...(v.nextTitle ? [`经验：${v.exp}/${v.expRequired}`, assessment] : ['已达最高阶段']),
                ...advanceStatus
              ]
            : [entry, '免费教学 · 首件署名装备'],
          progressActions
        )
      );
      if (recovery.length) {
        content.addBlockquote(
          createQuoteMarkdown(
            recovery.map(tip => tip.description),
            recovery.map(tip => ({ label: tip.command, command: tip.command }))
          )
        );
      }
      if (compact) {
        return;
      }
      content.addBlockquote(
        createQuoteMarkdown(
          [],
          [...catalogueActions, { label: '洞府', command: '/我的洞府' }]
        )
      );

      return;
    }
    const { filter, page } = query;
    const learnable = new Map<number, ForgeLearnableBlueprint>();

    for (const blueprint of v.learnableBlueprints ?? []) {
      if (!learnable.has(blueprint.recipeId)) {
        learnable.set(blueprint.recipeId, blueprint);
      }
    }

    const filters = [
      { label: '全部', selected: filter === '全部', command: '/锻造图纸' },
      { label: '待考核', selected: filter === '考核', command: '/锻造图纸 考核' },
      { label: '可制作', selected: filter === '可制作', command: '/锻造图纸 可制作' }
    ];

    if (learnable.size > 0 || filter === '可学习') {
      filters.push({ label: `可学习 ${learnable.size}`, selected: filter === '可学习', command: '/锻造图纸 可学习' });
    }

    content.addNewline();
    filters.forEach(({ label, selected, command: filterCommand }, index) => {
      if (index > 0) {
        content.addText(' ');
      }
      content.addButton(markdownButtonLabel(label, selected), { data: commandText(filterCommand), autoEnter: false });
    });
    content.addNewline();
    if (filter !== '练习' && filter !== '可学习') {
      content.addText('达到对应锻造等级后自动解锁图纸。').addNewline();
    }
    title = '我的洞府 · 锻造坊';
    const recipes = forgeRecipesForFilter(v, filter);
    const totalPages = Math.max(1, Math.ceil(recipes.length / 5));

    if (page > totalPages) {
      content.addText(`没有第 ${page} 页图纸，共 ${totalPages} 页。`);

      return;
    }
    const rows = recipes.slice((page - 1) * 5, page * 5);

    if (filter === '练习') {
      for (const r of rows) {
        content.addBlockquote(
          section({
            title: r.name,
            id: r.id,
            lines: [`经验：基础 +${r.baseExp}`, `消耗：灵石 ${r.spiritStoneCost}`, ...(r.reason ? [`状态：${r.reason}`] : [])],
            actions: [
              ...(r.canCraft ? [{ label: '打造', command: `/打造 ${r.id}` }] : []),
              { label: '详情', command: `/锻造图纸详情 ${r.id} ${filter} ${page}` }
            ]
          })
        );
      }
    } else {
      rows.forEach(r => showRecipe(r, true, query, learnable.get(r.id)));
    }
    if (!recipes.length) {
      content.addText(
        filter === '考核'
          ? v.joined
            ? '暂无待考核图纸'
            : '尚未入门'
          : filter === '可制作'
            ? '暂无可打造图纸'
            : filter === '练习'
              ? '暂无可提供晋升经验的本阶图纸'
              : filter === '可学习'
                ? '储物袋里暂无可学习图纸'
                : '暂无图纸'
      );
    }
    nav = {
      current: page,
      total: totalPages,
      count: recipes.length,
      command: forgeCatalogCommand({ filter, page }).replace(/\d+$/, '{page}')
    };
  }

  function showPreview(p: ForgePreview) {
    title = '锻造预览';
    if ([...`/确认打造 ${p.token}`].length > 80) {
      content.addText('锻造确认服务暂不可用，请稍后重新预览。');

      return;
    }
    const early = earlyForgeProgress(p);

    footer = [
      { label: '返回图纸', command: '/锻造图纸' },
      { label: '锻造', command: '/我的锻造' }
    ];
    content.addBlockquote(
      section({
        title: p.recipe.name,
        id: p.recipe.id,
        suffix: `· ${p.tutorial || !p.recipe.tradeable ? '不可交易' : '可交易'}`,
        lines: [
          ...p.recipe.attributes.filter(a => a.max > 0).map(a => `${a.name}：${a.min}～${a.max}${a.unit}`),
          p.tutorial ? '消耗：免费教学 · 经验 +0' : `消耗：灵石 ${p.recipe.spiritStoneCost}`,
          ...(!p.tutorial ? p.recipe.materials.map(m => `材料：${m.name} ×${m.required}（可用 ${m.available}）`) : []),
          ...(p.tutorialTool ? [`赠送：${p.tutorialTool.name} · ${p.tutorialTool.grade} · 绑定`] : []),
          ...(!p.tutorial ? (early.length ? early : [`经验 +${p.expGained}${p.assessmentNew ? ' · 首次考核' : ''}`]) : []),
          `穿戴：${p.recipe.requiredRealm}${p.recipe.canEquip ? ' ✓' : ' · 未满足'}`,
          `时间：请在 ${formatGameTime(p.expiresAt * 1000, 'HH:mm:ss')} 前确认`
        ],
        actions: [{ label: '确认打造', command: `/确认打造 ${p.token}` }]
      })
    );
  }
  try {
    if (isForgeGuide) {
      title = '锻造指引';
      content.addBlockquote(
        createQuoteMarkdown([
          '入门与图谱',
          '在职业页核对入门境界。免费教学完成后可获得首件署名装备。',
          '达到对应锻造等级后自动解锁图纸。已掌握的图纸可在图谱中查看。'
        ])
      );
      content.addBlockquote(
        createQuoteMarkdown(
          ['亲手打造', '选择已掌握且能制作的图纸，在预览中核对经验、成本和天工要求。'],
          [
            ...header,
            { label: '工具交易', command: '/珍宝楼 筛选 天工 价格升序 1', autoEnter: false },
            { label: '可制作', command: '/锻造图纸 可制作', autoEnter: false }
          ]
        )
      );
      content.addBlockquote(
        createQuoteMarkdown(
          [
            '进阶与考核',
            '职业页显示当前阶段、经验和考核进度。制作本阶图纸可获得锻造经验。',
            '每种考核图纸只计一次。同一图纸重复制作不能替代其他图纸的考核。',
            '经验不足时可查看能获得经验的本阶练习图纸。经验、考核和境界均达标后，可在职业页进阶。',
            '境界不足时可核对当前修为与突破材料，或通过主线、闭关积累修为。已达最高锻造阶段后可继续制作已解锁的图纸。'
          ],
          [
            { label: '待考核', command: '/锻造图纸 考核', autoEnter: false },
            { label: '本阶练习', command: '/锻造图纸 练习', autoEnter: false },
            { label: '我的境界', command: '/我的境界', autoEnter: false },
            { label: '我的信息', command: '/我的信息', autoEnter: false },
            { label: '查看主线', command: '/查看主线', autoEnter: false },
            { label: '闭关', command: '/闭关', autoEnter: false }
          ]
        )
      );
      content.addBlockquote(
        createQuoteMarkdown(
          ['委托代工', '/委托锻造 匠师编号 图纸编号 灵石工费', '装备归委托者 · 工费与成长归匠师', '接单前可取消退款'],
          [
            { label: '查委托', command: '/锻造委托' },
            { label: '我的编号', command: '/我的编号' }
          ]
        )
      );
      footer = [];
      await send();

      return;
    }
    if (command === '锻造图纸详情' || command === '锻造委托详情' || command === '锻造记录详情') {
      const id = Number(rest[0]);
      const page = Number(rest[1]);
      const recipeDetail = command === '锻造图纸详情';
      const recipeQuery = recipeDetail ? parseForgeCatalogArguments(rest.slice(1)) : null;

      if (
        !Number.isSafeInteger(id) ||
        id < 1 ||
        (recipeDetail ? !recipeQuery || (rest.length !== 1 && rest.length !== 3) : rest.length !== 2) ||
        (!recipeDetail && (!Number.isSafeInteger(page) || page < 1 || page > 100000))
      ) {
        content.addText('请从列表选择作品、图纸或委托。');
        await send();

        return;
      }
      if (recipeDetail) {
        const response = await runRobotBusiness(e, 'forge.overview', {}, parseForgeOverview, next, feedback);

        if (response.handled) {
          return;
        }
        title = '图纸详情';
        const recipe = response.data.recipes.find(r => r.id === id);

        if (recipe) {
          showRecipe(recipe, false, recipeQuery ?? undefined, response.data.learnableBlueprints?.find(blueprint => blueprint.recipeId === id));
        } else {
          content.addText('图纸暂不可查看');
        }
      } else if (command === '锻造委托详情') {
        const response = await runRobotBusiness(e, 'forge.orders', { page }, parseForgeOrders, next, feedback);

        if (response.handled) {
          return;
        }
        title = '委托详情';
        footer = [{ label: '返回委托', command: `/锻造委托 ${page}` }];
        const order = response.data.items.find(o => o.id === id);

        if (order) {
          showOrder(order);
        } else {
          content.addText('委托列表已更新，请重新查看。');
        }
      } else {
        const response = await runRobotBusiness(e, 'forge.history', { page }, parseForgeHistory, next, feedback);

        if (response.handled) {
          return;
        }
        title = '锻造记录详情';
        footer = [{ label: '返回记录', command: `/锻造记录 ${page}` }];
        const item = response.data.items.find(item => item.result.craftId === id);

        if (item) {
          showResult(item.result, item.owned && item.exists, true, item.result.equipment.userId !== item.result.crafterId);
          if (!item.exists || !item.owned) {
            content.addText(!item.exists ? '装备已不存在' : '装备当前不属于你');
          }
        } else {
          content.addText('锻造记录列表已更新，请重新查看。');
        }
      }
      await send();

      return;
    }
    if (command === '锻造图纸' && !catalogQuery) {
      content.addText('请使用 /锻造图纸 [全部|考核|可制作|可学习|练习] [正整数页码]');
      await send();

      return;
    }
    if ((command === '确认打造' || command === '确认锻造委托') && (rest.length !== 1 || !arg)) {
      content.addText('请重新选择图纸或委托，生成预览。');
      await send();

      return;
    }
    if (command === '委托锻造') {
      const [mode, first, second, third] = rest;
      const choosing = !mode || mode === '列表';
      const filling = mode === '填写';
      const selectedId = /^\d+$/.test(first ?? '') ? Number(first) : 0;

      if (choosing || mode === '图纸') {
        const page = choosing ? Number(first ?? 1) : Number(second ?? 1);

        if (
          !Number.isSafeInteger(page) ||
          page < 1 ||
          rest.length > (choosing ? 2 : 3) ||
          (!choosing && (!Number.isSafeInteger(selectedId) || selectedId < 1))
        ) {
          content.addText('请重新选择委托图纸。');
          footer = [{ label: '返回选图纸', command: '/委托锻造' }];
          await send();

          return;
        }
        const response = await runRobotBusiness(e, 'forge.overview', {}, parseForgeOverview, next, feedback);

        if (response.handled) {
          return;
        }
        const recipes = response.data.recipes;

        title = choosing ? '选择委托图纸' : '填写委托信息';
        footer = [{ label: '返回委托', command: '/锻造委托' }];
        if (choosing) {
          const pageSize = 5;
          const total = Math.max(1, Math.ceil(recipes.length / pageSize));

          if (page > total) {
            content.addText('这一页没有委托图纸。');
            footer = [{ label: '返回选图纸', command: '/委托锻造' }, ...footer];
          } else {
            for (const recipe of recipes.slice((page - 1) * pageSize, page * pageSize)) {
              content.addBlockquote(
                section({
                  title: recipe.name,
                  id: recipe.id,
                  lines: [`消耗：制作灵石 ${recipe.spiritStoneCost} · 材料 ${recipe.materials.length} 种`],
                  actions: [{ label: '选这张', command: `/委托锻造 图纸 ${recipe.id} ${page}` }]
                })
              );
            }
            if (!recipes.length) {
              content.addText('暂无委托图纸。');
            }
            nav = { current: page, total, count: recipes.length, command: '/委托锻造 列表 {page}' };
          }
        } else {
          const recipe = recipes.find(item => item.id === selectedId);

          footer = [{ label: '返回选图纸', command: `/委托锻造 列表 ${page}` }];
          if (recipe) {
            content.addBlockquote(
              section({
                title: recipe.name,
                id: recipe.id,
                lines: ['请匠师用「我的编号」查看并告诉你 UID。', '点下方按钮，依次填入匠师 UID 和灵石工费，两个数字用空格隔开。发送后查看预览。'],
                actions: [{ label: '填写匠师与工费', command: `/委托锻造 填写 ${recipe.id} `, autoEnter: false }]
              })
            );
          } else {
            content.addText('这张图纸已不可选，请重新选择。');
          }
        }
        await send();

        return;
      }
      const [crafterId, recipeId, fee] = filling ? [Number(second), selectedId, Number(third)] : rest.map(Number);
      const validEntry = filling ? rest.length === 4 && /^\d+$/.test(second ?? '') && /^\d+$/.test(third ?? '') : rest.length === 3;

      if (filling) {
        footer =
          Number.isSafeInteger(selectedId) && selectedId > 0
            ? [{ label: '返回填写', command: `/委托锻造 图纸 ${selectedId}` }]
            : [{ label: '返回选图纸', command: '/委托锻造' }];
      }
      if (!validEntry || ![crafterId, recipeId, fee].every(Number.isSafeInteger) || crafterId <= 0 || recipeId <= 0 || fee < 0) {
        content.addText(filling ? '请填写有效的匠师 UID 和灵石工费，工费可以为 0。' : '请使用 /委托锻造 匠师编号 图纸编号 灵石工费');
        await send();

        return;
      }
      const response = await runRobotBusiness(e, 'forge.order-preview', { crafterId, recipeId, fee }, parseForgeOrderPreview, next, feedback);

      if (response.handled) {
        return;
      }
      const p = response.data;

      title = '委托预览';
      if ([...`/确认锻造委托 ${p.token}`].length > 80) {
        content.addText('锻造确认服务暂不可用，请稍后重新预览。');
        await send();

        return;
      }
      content.addBlockquote(
        createQuoteMarkdown(
          [
            `${p.recipe.equipment.name} · ${p.recipe.tradeable ? '可交易' : '不可交易'}`,
            `匠师：${p.crafterName}（${p.crafterId}）`,
            ...p.recipe.attributes.filter(a => a.max > 0).map(a => `${a.name}：${a.min}～${a.max}${a.unit}`),
            `穿戴：${p.recipe.requiredRealm}${p.recipe.canEquip ? ' ✓' : ' · 未满足'}`,
            `托管：灵石 ${p.recipe.spiritStoneCost + p.fee}（制作 ${p.recipe.spiritStoneCost} · 工费 ${p.fee}）`,
            ...p.recipe.materials.map(m => `${m.name} ×${m.required}（可用 ${m.available}）`),
            `时间：请在 ${formatGameTime(p.expiresAt * 1000, 'HH:mm:ss')} 前确认`,
            `委托有效期：${p.lifetimeSeconds / 3600} 小时`,
            ...earlyForgeProgress(p),
            '接单前可取消退款'
          ],
          [{ label: '确认委托', command: `/确认锻造委托 ${p.token}` }]
        )
      );
    } else if (command === '确认锻造委托' || command === '接取锻造委托' || command === '取消锻造委托') {
      const orderId = Number(arg);

      if (command !== '确认锻造委托' && (!Number.isSafeInteger(orderId) || orderId <= 0)) {
        content.addText('请指定委托编号。');
        await send();

        return;
      }
      const response = await runRobotBusiness(
        e,
        command === '确认锻造委托' ? 'forge.order-create' : command === '接取锻造委托' ? 'forge.order-accept' : 'forge.order-cancel',
        command === '确认锻造委托' ? { token: arg } : { orderId },
        parseForgeOrder,
        next,
        feedback
      );

      if (response.handled) {
        return;
      }
      title = '锻造委托';
      showOrder(response.data);
    } else if (command === '锻造委托') {
      const page = arg ? Number(arg) : 1;

      if (!Number.isSafeInteger(page) || page < 1) {
        content.addText('请指定正整数页码。');
        await send();

        return;
      }
      const response = await runRobotBusiness(e, 'forge.orders', { page }, parseForgeOrders, next, feedback);

      if (response.handled) {
        return;
      }
      const data = response.data;

      title = '锻造委托';
      pageHeader = [{ label: '发起委托', command: '/委托锻造' }];
      data.items.forEach(o => showOrder(o, data.page));
      if (!data.items.length) {
        content.addText('暂无委托');
      }
      nav = { current: data.page, hasNext: data.hasMore, command: '/锻造委托 {page}' };
    } else if (command === '加入锻造师' || command === '打造') {
      const recipeId = Number(arg);

      if (command === '打造' && (!Number.isSafeInteger(recipeId) || recipeId <= 0)) {
        content.addText('请使用 /打造 图纸编号，或查看 /锻造图纸');
        await send();

        return;
      }
      const response = await runRobotBusiness(
        e,
        'forge.preview',
        { tutorial: command === '加入锻造师', recipeId: command === '打造' ? recipeId : 0 },
        parseForgePreview,
        next,
        feedback
      );

      if (response.handled) {
        return;
      }
      showPreview(response.data);
    } else if (command === '确认打造') {
      const response = await runRobotBusiness(e, 'forge.confirm', { token: arg }, parseForgeResult, next, feedback);

      if (response.handled) {
        return;
      }
      title = '打造结果';
      footer = [
        { label: '记录', command: '/锻造记录' },
        { label: '图纸', command: '/锻造图纸' }
      ];
      showResult(response.data);
    } else if (isForgeHistory) {
      const page = arg ? Number(arg) : 1;

      if (!Number.isSafeInteger(page) || page < 1) {
        content.addText('请使用 /锻造记录 正整数页码');
        await send();

        return;
      }
      const response = await runRobotBusiness(e, 'forge.history', { page }, parseForgeHistory, next, feedback);

      if (response.handled) {
        return;
      }
      const v: ForgeHistory = response.data;

      title = '锻造记录';
      footer = [
        { label: '图纸', command: '/锻造图纸' },
        { label: '锻造', command: '/我的锻造' }
      ];
      v.items.forEach(item => {
        content.addBlockquote(
          createQuoteMarkdown(
            [
              `【${item.result.craftId}】${item.result.name}${item.result.tutorial ? ' · 教学作品' : ''}`,
              `匠师：${item.result.crafter}${item.result.tutorial ? '' : ` · 经验 +${item.result.expGained}`}`,
              ...(!item.exists ? ['装备已不存在'] : !item.owned ? ['已转手'] : [])
            ],
            [{ label: '详情', command: `/锻造记录详情 ${item.result.craftId} ${v.page}` }]
          )
        );
      });
      if (!v.items.length) {
        content.addText('暂无锻造记录');
      }
      nav = { current: v.page, hasNext: v.hasMore, command: '/锻造记录 {page}' };
    } else if (command === '学习锻造图纸' && arg) {
      const storageId = /^\d+$/.test(arg) ? Number(arg) : 0;

      if (!Number.isSafeInteger(storageId) || storageId < 1) {
        content.addText('请在 /锻造图纸 可学习 中选择图纸。');
        await send();

        return;
      }
      const response = await runRobotBusiness(e, 'forge.learn', { storageId }, parseForgeLearnBlueprintResult, next, feedback);

      if (response.handled) {
        return;
      }
      title = '锻造图纸';
      content.addText(`已掌握【${response.data.recipeName}】锻造图纸。`).addNewline();
      footer = [{ label: '返回图谱', command: '/锻造图纸' }];
    } else {
      const advancing = command === '锻造进阶';
      const learning = command === '学习锻造图纸';
      const expectedLevel = Number(arg);

      if (advancing && (!arg || !Number.isSafeInteger(expectedLevel) || expectedLevel < 0)) {
        content.addText('请先查看 /我的锻造 中的晋升条件。');
        await send();

        return;
      }
      const response = await runRobotBusiness(
        e,
        advancing ? 'forge.advance' : learning ? 'forge.learn' : 'forge.overview',
        advancing ? { expectedLevel } : {},
        parseForgeOverview,
        next,
        feedback
      );

      if (response.handled) {
        return;
      }
      if (advancing) {
        title = '锻造晋升';
        content.addBold('✨ 晋升成功').addNewline();
      } else if (learning) {
        title = '锻造图纸';
        content.addText('达到对应锻造等级后自动解锁图纸。').addNewline();
        content.addText(`掌握图纸：${response.data.recipes.filter(recipe => recipe.learned).length} 张`).addNewline();
      }
      showOverview(response.data, catalogQuery ?? undefined, advancing || learning);
    }
    await send();
  } catch (error) {
    logger.error('锻造请求失败', error);
    await message.send(
      FormatGui({
        ...base,
        title: '锻造提示',
        content: Format.createMarkdown().addText(
          orderCommand ? '未能获取委托结果，请查看委托状态。' : command === '确认打造' ? '未能获取打造结果，请查看锻造记录。' : '暂时无法查看，请稍后重试。'
        ),
        footer: orderCommand
          ? [{ label: '查看委托', command: '/锻造委托' }]
          : [
              { label: '查看记录', command: '/锻造记录' },
              { label: '我的锻造', command: '/我的锻造' }
            ]
      })
    );
  }
});
