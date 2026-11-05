import { Format } from 'alemonjs';
import type { FishingView, FishingAction, FishingSection } from '@src/api/bot/fishing';
import { fishingBaits, fishingChums } from '@src/api/bot/fishing';
import { FormatGui, type GuiFooter } from '@src/utils/messageHelper';
import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { renderSubTabs } from '@src/response/storage/newBag/tabs';
import { isPrivateEvent } from '@src/utils/privateEvent';
import type { GameEvent } from '@src/types/event';

const manual = (actions: FishingAction[]) => actions.map(action => ({ ...action, autoEnter: false as const }));
const parentCommands = new Map([
  ['start', '/垂钓'], ['gear', '/垂钓'], ['history', '/垂钓'], ['help', '/垂钓'], ['operation', '/垂钓'],
  ['catalog', '/储物袋 渔获']
]);
const footerRows = (data: FishingView, actions: FishingAction[]): GuiFooter => {
  if (data.view === 'overview') {
    return [actions.slice(0, 3), actions.slice(3, 5), actions.slice(5)].filter(row => row.length > 0).map(manual);
  }
  const width = data.view.startsWith('contest') ? 3 : 4;

  return actions.length > width ? [manual(actions.slice(0, width)), manual(actions.slice(width))] : manual(actions);
};

/** Text facts and asset choices stay authoritative on the service. */
export function fishingBubble(data: FishingView, event: GameEvent, confirmationCommand?: string) {
  const md = Format.createMarkdown();

  type Markdown = typeof md;
  const itemViews = new Set(['packages', 'chum', 'gear', 'tools', 'materials', 'catalog', 'species', 'bag-materials', 'instances', 'blessing', 'fish']);
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

        if (index >= 0 && index < next) { next = index; name = candidate; }
      }
      if (!name) {
 target.addText(value.slice(cursor));

 return;
}
      if (next > cursor) { target.addText(value.slice(cursor, next)); }
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
  const block = (section: FishingSection, quote: boolean, inline = false, titleActions = false, terminal = false, number?: number) => {
    quote = section.quote ?? quote;
    const target = Format.createMarkdown();
    const recordView = ['history', 'cast', 'pending'].includes(data.view);
    const showID = !['gear', 'history', 'cast', 'species', 'catalog', 'instances'].includes(data.view) &&
      !(data.view === 'pending' && section.id.startsWith('fc_'));
    const title = [section.title, showID && section.id ? `#${section.id}` : '', section.suffix].filter(Boolean).join(' ');
    const objectList = itemViews.has(data.view) && !(data.view === 'blessing' && data.status === 'overview');
    const itemTitle = quote && Boolean(section.title) && !data.confirmationRef &&
      (objectList || (Boolean(section.id) && !recordView) || Object.hasOwn(fishingBaits, section.title) || Object.hasOwn(fishingChums, section.title));

    if (title) {
      if (number !== undefined) { target.addBold(`【${number}】${title}`); } else if (itemTitle && data.view === 'bag-materials') {
        target.addBold(title);
      } else if (itemTitle) {
        target.addBold(section.title);
        if (showID && section.id) { target.addText(` #${section.id}`); }
        if (section.suffix) { target.addText(` ${section.suffix}`); }
      } else { text(target, title); }
      if (titleActions) { buttons(target, section.actions); }
      if (section.lines.length) {
        target.addNewline();
      }
    }
    section.lines.forEach((line, index) => {
      if (index) {
        target.addNewline();
      }
      text(target, line);
      if (inline && section.actions[index]) {
        buttons(target, [section.actions[index]]);
      }
    });
    const rest = titleActions ? [] : inline ? section.actions.slice(section.lines.length) : section.actions;

    if (rest.length) {
      if (title || section.lines.length) { target.addNewline(); }
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

  if (data.view === 'overview' && (data.sections.length === 4 || data.sections.length === 5)) {
    data.sections.forEach((section, index) => {
      if (index === data.sections.length - 1) {
        section.lines.forEach(line => { md.addBold(line).addNewline(); });
        if (section.actions.length) {
          const controls = Format.createMarkdown();

          section.actions.forEach((action, i) => {
            if (i > 0) { controls.addNewline(); }
            buttons(controls, [action]);
          });
          md.addBlockquote(controls);
        }
      } else { block(section, index !== 0, index <= 2); }
    });
  } else if (data.view === 'rod-upgrade-preview' && data.sections.length === 3) {
    data.sections.forEach((section, index) => block(section, index === 1, false, false, index === 2));
  } else if (['species', 'bag-materials'].includes(data.view) && data.navRows?.length) {
    for (const row of data.navRows) {
      renderSubTabs(md, row, data.status);
    }
    md.addNewline();
    data.sections.forEach(section => block(section, Boolean(section.title || section.id)));
  } else if (data.view === 'blessing') {
    const intro = data.navRows?.length && !data.sections[0]?.title && !data.sections[0]?.id ? data.sections[0] : undefined;

    if (intro) { block(intro, false); }
    for (const row of data.navRows ?? []) {
      buttons(md, row);
      md.addNewline();
    }
    if (data.navRows?.length) { md.addNewline(); }
    data.sections.slice(intro ? 1 : 0).forEach(section => block(section, Boolean(section.title), false, Boolean(section.title)));
  } else if (data.view === 'packages') {
    for (const row of data.navRows ?? []) {
      buttons(md, row, data.status);
      md.addNewline();
    }
    if (data.navRows?.length) { md.addNewline(); }
    data.sections.forEach(section => block(section, Boolean(section.title || section.id)));
  } else if (['boss', 'boss-drops', 'boss-battle', 'boss-rewards', 'contest', 'contest-species', 'contest-ranking', 'contest-rewards', 'contest-history'].includes(data.view)) {
    const intro = data.navRows?.length && !data.sections[0]?.title && !data.sections[0]?.id ? data.sections[0] : undefined;

    if (intro) { block(intro, false); }
    for (const row of data.navRows ?? []) {
      buttons(md, row);
      md.addNewline();
    }
    if (data.navRows?.length) { md.addNewline(); }
    data.sections.slice(intro ? 1 : 0).forEach(section => block(section, Boolean(section.title || section.id)));
  } else if (data.view === 'net-receipt') {
    const result = Format.createMarkdown();

    data.sections.forEach((section, index) => {
      if (index) { result.addNewline(); }
      if (section.title) {
        if (section.title === '待入袋') { result.addText(section.title); } else { result.addBold(section.title); }
        if (section.lines.length) { result.addText(' · '); }
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

    const categories = ['饵料', '窝料', '钓具', '渔具', '素材', '鱼类'];
    const serverCategories = data.navRows?.flat().filter(action => categories.includes(action.label)) ?? [];
    const typeActions = serverCategories.length ? serverCategories : categories.slice(0, 5).map((label, index) => ({ label, command: `/垂钓 渔市 ${['bait', 'chum', 'rod', 'net', 'material'][index]} 1` }));

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

    footer = [confirm, cancel];
    if (data.view !== 'rod-upgrade-preview' && !data.sections.some(section => section.lines.some(line => /5分钟|有效期|有效.*分钟/.test(line)))) {
      md.addText('预览有效5分钟，确认后按本次原预览结算。').addNewline();
    }
  }
  const parent = parentCommands.get(data.view);

  if (parent && !footer.some(action => action.label.includes('返回') || action.label.includes('取消'))) {
    const parentIndex = footer.findIndex(action => action.command === parent || (data.view === 'catalog' && /^\/(?:垂钓 )?渔获(?: 1)?$/.test(action.command)));
    const back = { label: '返回', command: parent };

    footer = parentIndex < 0 ? [...footer, back] : footer.map((action, index) => index === parentIndex ? back : action);
  }
  if (data.view === 'overview') {
    md.addNewline().addText('——————');
  }
  const bagParent = data.view === 'species' ? '/储物袋' : data.view === 'bag-materials' ? '/储物袋 渔获' : undefined;

  return FormatGui({
    bid: event.UserId,
    isPrivate: isPrivateEvent(event),
    title: data.title,
    header: bagParent ? manual([{ label: '返回', command: bagParent }]) : undefined,
    content: md,
    nav: data.nav ? { current: data.nav.page, total: data.nav.totalPages, count: data.nav.total, command: data.nav.command, autoEnter: false } : undefined,
    footer: footerRows(data, footer)
  });
}
