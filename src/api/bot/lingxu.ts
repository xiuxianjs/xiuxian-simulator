import { commandCharacterLength } from '@src/utils/commandPrefix';
import { lingxuBagSubtypes, lingxuBagTypes, lingxuJournalFilters, lingxuMapTiers, parseLingxuCommand } from '@src/response/lingxu/commands';

export type LingxuAction = { label: string; command: string };
export type LingxuSection = {
  title?: string;
  id?: string;
  lines: string[];
  experience?: string[];
  harvest?: string[];
  actions?: LingxuAction[];
};
export type LingxuPage = {
  title: string;
  tabs?: LingxuAction[];
  subTabs?: LingxuAction[];
  sections: LingxuSection[];
  actions?: LingxuAction[];
  nav?: { page: number; totalPages: number; total?: number; command: string };
  privateOnly: boolean;
};

const invalid = (): never => {
  throw new Error('Invalid lingxu page');
};
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : invalid();
const text = (value: unknown, maximum = 2000): string => (typeof value === 'string' && value.length <= maximum ? value : invalid());
const integer = (value: unknown, minimum = 1): number => (typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum ? value : invalid());
const lines = (value: unknown): string[] => (Array.isArray(value) && value.length <= 30 ? value.map(line => text(line)) : invalid());
const actions = (value: unknown, maximum: number): LingxuAction[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length > maximum) {
    return invalid();
  }

  return value.map(raw => {
    const entry = object(raw);
    const label = text(entry.label, 16);
    const command = text(entry.command, 80);
    const parsed = parseLingxuCommand(command);

    if (!label.trim() || !parsed || 'error' in parsed || commandCharacterLength(command) > 80) {
      return invalid();
    }

    return { label, command };
  });
};

const bagCommand = '/灵墟洞天 行囊';
const bagSubTabLimit = Math.max(...Object.values(lingxuBagSubtypes).map(tabs => tabs.length));
const selectedTab = (tabs: LingxuAction[]) => tabs.findIndex(tab => tab.label.startsWith('▶'));
const matchingTab = (action: LingxuAction, label: string, command: string) => (action.label === label || action.label === `▶${label}`) && (action.command === command || (label === '全部' && action.command === `${command} 全部`));

function bagPageCommand(tabs: LingxuAction[], subTabs: LingxuAction[], sections: LingxuSection[], pageActions: LingxuAction[] | undefined) {
  const mainIndex = selectedTab(tabs);
  const type = lingxuBagTypes[mainIndex];

  if (
    type === undefined ||
    tabs.length !== lingxuBagTypes.length ||
    tabs.filter(tab => tab.label.startsWith('▶')).length !== 1 ||
    sections.length > 3 ||
    (pageActions?.length ?? 0) > 3
  ) {
    return invalid();
  }
  if (
    !tabs.every((tab, index) => {
      const label = lingxuBagTypes[index];

      return matchingTab(tab, label, label === '全部' ? bagCommand : `${bagCommand} ${label}`);
    })
  ) {
    return invalid();
  }

  const base = type === '全部' ? bagCommand : `${bagCommand} ${type}`;
  const labels = lingxuBagSubtypes[type];

  if (subTabs.length !== labels.length) {
    return invalid();
  }
  if (labels.length === 0) {
    return base;
  }
  const subIndex = selectedTab(subTabs);

  if (
    subIndex < 0 ||
    subTabs.filter(tab => tab.label.startsWith('▶')).length !== 1 ||
    !subTabs.every((tab, index) => {
      const label = labels[index];

      return matchingTab(tab, label, label === '全部' ? base : `${base} ${label}`);
    })
  ) {
    return invalid();
  }

  return labels[subIndex] === '全部' ? base : `${base} ${labels[subIndex]}`;
}

/** A malformed response never falls back to made-up gameplay data. */
export function parseLingxuPage(value: unknown): LingxuPage {
  const raw = object(value);
  const title = text(raw.title, 64);

  if (typeof raw.privateOnly !== 'boolean' || !/^(灵墟洞天|阵法师)(?: · |$)/.test(title) || !Array.isArray(raw.sections) || raw.sections.length > 12) {
    return invalid();
  }
  const sections: LingxuSection[] = raw.sections.map(item => {
    const entry = object(item);

    return {
      ...(entry.title === undefined ? {} : { title: text(entry.title, 80) }),
      ...(entry.id === undefined ? {} : { id: text(entry.id, 64) }),
      lines: lines(entry.lines),
      ...(entry.experience === undefined ? {} : { experience: lines(entry.experience) }),
      ...(entry.harvest === undefined ? {} : { harvest: lines(entry.harvest) }),
      ...(entry.actions === undefined ? {} : { actions: actions(entry.actions, 3) })
    };
  });
  const pageActions = actions(raw.actions, 8);
  const isJournal = title === '灵墟洞天 · 行记';
  const isBag = title === '灵墟洞天 · 墟行囊';
  const tabs = actions(raw.tabs, isBag ? lingxuBagTypes.length : isJournal ? lingxuJournalFilters.length : lingxuMapTiers.length);
  const subTabs = actions(raw.subTabs, bagSubTabLimit);
  const selected = tabs?.filter(tab => tab.label.startsWith('▶')) ?? [];

  if (subTabs && (!isBag || !tabs)) {
    return invalid();
  }
  const bagPage = isBag && tabs ? bagPageCommand(tabs, subTabs ?? [], sections, pageActions) : undefined;
  let nav: LingxuPage['nav'];

  if (tabs && isJournal) {
    const validFilters =
      tabs.length === lingxuJournalFilters.length &&
      tabs.every(({ label, command }, index) => {
        const filter = lingxuJournalFilters[index];

        return (label === filter && command === `/灵墟洞天 行记 ${filter}`) || (label === `▶${filter}` && command === '/灵墟洞天 行记');
      });

    if (!validFilters || selected.length > 1 || sections.length > 3 || (pageActions?.length ?? 0) > 3) {
      return invalid();
    }
  } else if (tabs && !isBag) {
    const validTabs =
      tabs.length === lingxuMapTiers.length &&
      tabs.every(({ label, command }, index) => {
        const tier = lingxuMapTiers[index];

        return command === `/灵墟洞天 地图 ${tier}` && (label === tier || label === `▶${tier}`);
      }) &&
      selected.length === 1;
    const validRegions =
      sections.length > 0 &&
      sections.length <= 8 &&
      sections.every(entry => {
        const moves = entry.actions ?? [];

        return (
          entry.title &&
          entry.id === undefined &&
          entry.experience === undefined &&
          entry.harvest === undefined &&
          entry.lines.length === 2 &&
          entry.lines[0].startsWith('产出：') &&
          entry.lines[1].startsWith('出口：') &&
          moves.length <= 1 &&
          moves.every(action => action.label === '前往' && action.command.startsWith('/灵墟洞天 前往 '))
        );
      });

    if (title !== '灵墟洞天 · 地图' || !validTabs || !validRegions || (pageActions?.length ?? 0) > 2 || raw.nav !== undefined) {
      return invalid();
    }
  }

  if (raw.nav !== undefined) {
    const entry = object(raw.nav);
    const page = integer(entry.page);
    const totalPages = integer(entry.totalPages);
    const command = text(entry.command, 80);

    const filter = selected[0]?.label.slice(1);
    const validNavigation = bagPage
      ? command === `${bagPage} {page}` || (command === `${bagPage} 全部 {page}` && bagPage.split(' ').length <= 3)
      : isJournal && tabs
        ? command === `/灵墟洞天 行记${filter ? ` ${filter}` : ''} {page}`
        : /^\/灵墟洞天 (地图|行囊|行记|提取回执) \{page\}$|^\/阵法师 阵盘 \{page\}$/.test(command);

    if (page > totalPages || !validNavigation || commandCharacterLength(command.replace('{page}', String(totalPages))) > 80) {
      return invalid();
    }
    nav = { page, totalPages, command, ...(entry.total === undefined ? {} : { total: integer(entry.total, 0) }) };
  }
  const sectionActions = sections.reduce((sum, entry) => sum + (entry.actions?.length ?? 0), 0);
  const tabCount = (tabs?.length ?? 0) + (subTabs?.length ?? 0);
  const count = sectionActions + (pageActions?.length ?? 0) + tabCount + (nav && nav.page > 1 ? 1 : 0) + (nav && nav.page < nav.totalPages ? 1 : 0);

  if (count > (bagPage ? 22 : tabs ? 13 : 10)) {
    return invalid();
  }

  return { title, ...(tabs ? { tabs } : {}), ...(subTabs ? { subTabs } : {}), sections, actions: pageActions, nav, privateOnly: raw.privateOnly };
}
