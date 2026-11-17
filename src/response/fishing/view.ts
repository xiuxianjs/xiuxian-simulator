import { Format } from 'alemonjs';
import type { FishingView, FishingAction, FishingSection } from '@src/api/bot/fishing';
import { fishingBaits, fishingChums, validFishingEventID } from '@src/api/bot/fishing';
import { FormatGui, type GuiFooter } from '@src/utils/messageHelper';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { renderSubTabs } from '@src/response/storage/newBag/tabs';
import { isPrivateEvent } from '@src/utils/privateEvent';
import type { GameEvent } from '@src/types/event';

const manual = (actions: FishingAction[]) => actions.map(action => ({ ...action, autoEnter: false as const }));
const parentCommands = new Map([
  ['start', '/垂钓'],
  ['gear', '/垂钓'],
  ['history', '/垂钓'],
  ['help', '/垂钓'],
  ['operation', '/垂钓'],
  ['catalog', '/储物袋 渔获']
]);
const footerRows = (data: FishingView, actions: FishingAction[]): GuiFooter => {
  if (data.view === 'overview' && data.status !== 'home-compact') {
    return [actions.slice(0, 3), actions.slice(3)].filter(row => row.length > 0).map(manual);
  }
  const width = data.view.startsWith('contest') ? 3 : 4;

  return actions.length > width ? [manual(actions.slice(0, width)), manual(actions.slice(width))] : manual(actions);
};

/** Text facts and asset choices stay authoritative on the service. */
export function fishingBubble(data: FishingView, event: GameEvent, confirmationCommand?: string) {
  const md = Format.createMarkdown();

  type Markdown = typeof md;
  const itemViews = new Set([
    'packages',
    'chum',
    'gear',
    'tools',
    'materials',
    'catalog',
    'species',
    'bag-materials',
    'instances',
    'blessing',
    'fish',
    'sell-realm',
    'market-fish-species',
    'market-fish-instances'
  ]);
  const emphasisNames = [...new Set(data.emphasisNames ?? [])].filter(Boolean).sort((a, b) => b.length - a.length);
  const text = (target: Markdown, value: string) => {
    if (!emphasisNames.length || !value.length) {
      target.addText(value);

      return;
    }
    let cursor = 0;

    while (cursor < value.length) {
      let next = value.length;
      let name = '';

      for (const candidate of emphasisNames) {
        const index = value.indexOf(candidate, cursor);

        if (index >= 0 && index < next) {
          next = index;
          name = candidate;
        }
      }
      if (!name) {
        target.addText(value.slice(cursor));

        return;
      }
      if (next > cursor) {
        target.addText(value.slice(cursor, next));
      }
      target.addBold(name);
      cursor = next + name.length;
    }
  };
  const buttons = (target: Markdown, actions: FishingAction[], selectedSKU?: string) => {
    actions.forEach(action => {
      target.addText(' ');
      const selected = Boolean(selectedSKU && action.command.trim().split(/\s+/).at(-1) === selectedSKU);

      target.addButton(markdownButtonLabel(action.label, selected), { data: action.command, autoEnter: false });
    });
  };
  const block = (section: FishingSection, quote: boolean, inline = false, titleActions = false, terminal = false, number?: number, actionOffset = 0) => {
    quote = section.quote ?? quote;
    const target = Format.createMarkdown();
    const recordView = ['history', 'cast', 'pending'].includes(data.view);
    const showID =
      !['gear', 'history', 'cast', 'species', 'catalog', 'instances', 'market-fish-species'].includes(data.view) &&
      !(data.view === 'pending' && section.id.startsWith('fc_'));
    const title = [section.title, showID && section.id ? `#${section.id}` : '', section.suffix].filter(Boolean).join(' ');
    const objectList = itemViews.has(data.view) && !(data.view === 'blessing' && data.status === 'overview');
    const itemTitle =
      quote &&
      Boolean(section.title) &&
      !data.confirmationRef &&
      (objectList ||
        (data.view === 'probabilities' && ['渔获与杂获', '鱼的境界', '鱼的稀有度'].includes(section.title)) ||
        (Boolean(section.id) && !recordView) ||
        Object.hasOwn(fishingBaits, section.title) ||
        Object.hasOwn(fishingChums, section.title));

    if (title) {
      if (number !== undefined) {
        target.addBold(`【${number}】${title}`);
      } else if (itemTitle && data.view === 'bag-materials') {
        target.addBold(title);
      } else if (itemTitle) {
        target.addBold(section.title);
        if (showID && section.id) {
          target.addText(` #${section.id}`);
        }
        if (section.suffix) {
          target.addText(` ${section.suffix}`);
        }
      } else {
        text(target, title);
      }
      if (titleActions) {
        buttons(target, section.actions);
      }
      if (section.lines.length) {
        target.addNewline();
      }
    }
    section.lines.forEach((line, index) => {
      if (index) {
        target.addNewline();
      }
      if (data.view === 'probabilities' && line.startsWith('当前钓力：')) {
        target.addBold(line);
      } else {
        text(target, line);
      }
      const inlineAction = inline ? section.actions[index - actionOffset] : undefined;

      if (inlineAction) {
        buttons(target, [inlineAction]);
      }
    });
    const rest = titleActions ? [] : inline ? section.actions.slice(Math.max(0, section.lines.length - actionOffset)) : section.actions;

    if (rest.length) {
      if (title || section.lines.length) {
        target.addNewline();
      }
      buttons(target, rest);
    }
    if (quote) {
      md.addBlockquote(target);
    } else {
      md.absorb(target);
    }
    if (!quote && !terminal) {
      md.addNewline();
      if (section.lines.length) {
        md.addNewline();
      }
    }
  };
  let footer = data.footer;
  let overviewHeader: FishingAction[] | undefined;
  const encounter = data.view === 'overview' ? data.sections.find(section => section.title === '上古龙鲤') : undefined;
  const sections = encounter ? data.sections.filter(section => section !== encounter) : data.sections;

  if (data.view === 'overview') {
    const encounterPrefix = '/垂钓 奇遇 ';
    const entry = encounter?.actions.find(({ command }) => command.startsWith(encounterPrefix) && validFishingEventID(command.slice(encounterPrefix.length)));

    overviewHeader = entry ? [{ ...entry, label: '垂钓奇遇' }] : undefined;
    footer = footer.filter(action => action.label !== '垂钓奇遇');
  } else if (data.view === 'contest') {
    footer = [...footer, { label: '返回活动', command: '/我的活动' }];
  }

  if (data.view === 'overview' && data.status === 'home-unified') {
    sections.forEach((section, index) => {
      if (index === 0) {
        block(section, true, true, false, false, undefined, 1);
      } else if (index === 1 && section.actions.length) {
        md.addText(section.title || '操作').addNewline();
        const controls = Format.createMarkdown();
        const quickHourLabels = ['3小时', '6', '12'];
        const firstRowCount = quickHourLabels.every((label, index) => section.actions[index + 1]?.label === label) ? 4 : 1;

        buttons(controls, section.actions.slice(0, firstRowCount));
        for (const action of section.actions.slice(firstRowCount)) {
          controls.addNewline();
          buttons(controls, [action]);
        }
        md.addBlockquote(controls).addNewline();
      }
    });
  } else if (data.view === 'overview' && data.status === 'home-compact') {
    sections.forEach(section => block(section, true));
  } else if (data.view === 'start' && data.status === 'config-compact') {
    sections.forEach(section => block(section, true, section.lines.length >= section.actions.length));
  } else if (data.view === 'overview' && sections.length === 4) {
    sections.forEach((section, index) => {
      if (index === sections.length - 1) {
        section.lines.forEach(line => {
          md.addBold(line).addNewline();
        });
        section.actions.forEach(action => {
          buttons(md, [action]);
          md.addNewline();
        });
      } else {
        block(section, index !== 0, index <= 2);
      }
    });
  } else if (data.view === 'rod-upgrade-preview' && data.sections.length === 3) {
    data.sections.forEach((section, index) => block(section, index === 1, false, false, index === 2));
  } else if (['history', 'species', 'bag-materials', 'market-fish-species', 'market-fish-instances'].includes(data.view) && data.navRows?.length) {
    for (const row of data.navRows) {
      renderSubTabs(md, row, data.status);
    }
    md.addNewline();
    data.sections.forEach(section => block(section, Boolean(section.title || section.id)));
  } else if (data.view === 'blessing') {
    const intro = data.navRows?.length && !data.sections[0]?.title && !data.sections[0]?.id ? data.sections[0] : undefined;

    if (intro) {
      block(intro, false);
    }
    for (const row of data.navRows ?? []) {
      buttons(md, row);
      md.addNewline();
    }
    if (data.navRows?.length) {
      md.addNewline();
    }
    data.sections.slice(intro ? 1 : 0).forEach(section => block(section, Boolean(section.title), false, Boolean(section.title)));
  } else if (data.view === 'packages') {
    for (const row of data.navRows ?? []) {
      buttons(md, row, data.status);
      md.addNewline();
    }
    if (data.navRows?.length) {
      md.addNewline();
    }
    data.sections.forEach(section => block(section, Boolean(section.title || section.id)));
  } else if (
    ['boss', 'boss-drops', 'boss-battle', 'boss-rewards', 'contest', 'contest-species', 'contest-ranking', 'contest-rewards', 'contest-history'].includes(
      data.view
    )
  ) {
    const intro = data.navRows?.length && !data.sections[0]?.title && !data.sections[0]?.id ? data.sections[0] : undefined;

    if (intro) {
      block(intro, false);
    }
    for (const row of data.navRows ?? []) {
      buttons(md, row);
      md.addNewline();
    }
    if (data.navRows?.length) {
      md.addNewline();
    }
    data.sections.slice(intro ? 1 : 0).forEach(section => block(section, Boolean(section.title || section.id)));
  } else if (data.view === 'net-receipt') {
    const result = Format.createMarkdown();

    data.sections.forEach((section, index) => {
      if (index) {
        result.addNewline();
      }
      if (section.title) {
        if (section.title === '待入袋') {
          result.addText(section.title);
        } else {
          result.addBold(section.title);
        }
        if (section.lines.length) {
          result.addText(' · ');
        }
      }
      text(result, section.lines.join(' '));
      buttons(result, section.actions);
    });
    md.addBlockquote(result);
  } else if (data.view === 'shop-purchase-preview' || data.view === 'shop-purchase-receipt') {
    data.sections.forEach(section => block(section, false));
  } else if (data.view === 'shop') {
    const modeActions = data.navRows?.flat().filter(action => ['转为出售', '转为购买'].includes(action.label)) ?? [];
    const buying = modeActions.some(action => action.label === '转为出售');
    const balance = data.sections[0];
    const sellCatch = { label: '出售渔获', command: '/储物袋 渔获' };
    const inlineSale = buying && Boolean(balance?.lines.length);

    if (balance) {
      block(inlineSale ? { ...balance, actions: [sellCatch, ...balance.actions] } : balance, inlineSale, inlineSale);
    }
    if (!inlineSale && modeActions.length) {
      buttons(md, buying ? [sellCatch] : modeActions);
      md.addNewline().addNewline();
    }
    const tabs = footer.filter(action => ['灵鳞钱', '灵石', '灵晶', '道晶'].includes(action.label));

    const categories = ['饵料', '窝料', '钓具', '渔具', '素材', '货币兑换', '鱼类'];
    const serverCategories = data.navRows?.flat().filter(action => categories.includes(action.label)) ?? [];
    const typeActions = serverCategories.length
      ? serverCategories
      : categories.slice(0, 5).map((label, index) => ({ label, command: `/垂钓 渔市 ${['bait', 'chum', 'rod', 'net', 'material'][index]} 1` }));

    buttons(md, typeActions);
    md.addNewline().addNewline();

    data.sections.slice(1).forEach((section, index) => block(section, true, false, false, false, buying ? index + 1 : undefined));
    footer = footer.filter(action => !tabs.includes(action));
  } else {
    data.sections.forEach(section => block(section, Boolean(section.title || section.id || data.confirmationRef)));
  }

  if (data.confirmationRef) {
    const command = confirmationCommand ?? `/垂钓 确认 ${data.confirmationRef}`;
    const confirm = footer.find(action => action.command === command) ?? { label: '确认', command };
    const cancel = footer.find(action => action.label.includes('取消')) ?? { label: '取消', command: '/垂钓' };

    const adjust = footer.find(
      action => (action.label === '调整范围' && action.command === '/出售 渔获') || (action.label === '更换水域' && action.command === '/垂钓 渔具 水域')
    );

    footer = adjust ? [confirm, adjust, cancel] : [confirm, cancel];
    if (data.view !== 'rod-upgrade-preview' && !data.sections.some(section => section.lines.some(line => /5分钟|有效期|有效.*分钟/.test(line)))) {
      md.addText('预览有效5分钟，确认后按本次原预览结算。').addNewline();
    }
  }
  const parent = parentCommands.get(data.view);

  if (parent && !footer.some(action => action.label.includes('返回') || action.label.includes('取消'))) {
    const parentIndex = footer.findIndex(action => action.command === parent || (data.view === 'catalog' && /^\/(?:垂钓 )?渔获(?: 1)?$/.test(action.command)));
    const back = { label: '返回', command: parent };

    footer = parentIndex < 0 ? [...footer, back] : footer.map((action, index) => (index === parentIndex ? back : action));
  }
  const bagParent = data.view === 'bag-materials' ? '/储物袋 渔获' : undefined;

  return FormatGui({
    bid: event.UserId,
    isPrivate: isPrivateEvent(event),
    title: data.title,
    header: overviewHeader ? manual(overviewHeader) : bagParent ? manual([{ label: '返回', command: bagParent }]) : undefined,
    content: md,
    nav: data.nav ? { current: data.nav.page, total: data.nav.totalPages, count: data.nav.total, command: data.nav.command, autoEnter: false } : undefined,
    footer: footerRows(data, footer)
  });
}
