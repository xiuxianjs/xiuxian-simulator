import { randomBytes } from 'node:crypto';
import { getCurrentEvent } from 'alemonjs';
import { guiNavigation, type GuiNav } from '@src/utils/messageHelper';
import type { OnboardingView } from '@src/api/bot/onboarding';
import { mentionsRetiredFeature } from '../retiredFeatures';

type Scope = { Platform?: string; BotId?: string; ChannelId?: string; UserId?: string };
type Snapshot = { scope: string; expires: number; view: OnboardingView };
const menus = new Map<string, Snapshot>();
const key = (event: Scope) => JSON.stringify([event.Platform, event.BotId, event.ChannelId, event.UserId]);

export const menuPagePattern = /^\s*[/#＃]?引导目录分页\s+([a-f0-9]{12})\s+([1-9]\d{0,2})\s*$/u;

/** Presentation snapshot only; original versioned commands still go to server validation. */
export function createOnboardingMenu(view: OnboardingView, event: Scope = getCurrentEvent() ?? {}) {
  if (!event.UserId || !view.branchMenu) {
    throw new Error('目录缺少玩家或分支内容');
  }
  for (const [id, entry] of menus) {
    if (entry.expires <= Date.now()) {
      menus.delete(id);
    }
  }
  if (menus.size >= 2000) {
    menus.delete(menus.keys().next().value!);
  }
  let id: string;

  do {
    id = randomBytes(6).toString('hex');
  } while (menus.has(id));

  menus.set(id, { scope: key(event), expires: Date.now() + 30 * 60000, view: structuredClone(view) });

  return onboardingMenuPage(id, 1, event)!;
}

export function onboardingMenuPage(id: string, page: number, event: Scope = getCurrentEvent() ?? {}) {
  const entry = menus.get(id);

  if (!entry || !event.UserId || entry.scope !== key(event) || entry.expires <= Date.now()) {
    return undefined;
  }
  const items = entry.view.branchMenu!.items.filter(item => !mentionsRetiredFeature(item.name));
  const total = Math.max(1, Math.ceil(items.length / 6));

  if (!Number.isInteger(page) || page < 1 || page > total) {
    return undefined;
  }
  const view = structuredClone(entry.view);

  view.branchMenu!.items = items.slice((page - 1) * 6, page * 6);
  const nav: GuiNav = { current: page, total, count: items.length, command: `/引导目录分页 ${id} {page}`, autoEnter: false };

  return { id, view, nav };
}
export type OnboardingMenuPage = NonNullable<ReturnType<typeof onboardingMenuPage>>;

export function menuPageFallback(page?: OnboardingMenuPage): string[] {
  if (!page) {
    return [];
  }
  const navigation = guiNavigation(page.nav);

  return [navigation.text, ...navigation.actions.map(action => `${action.label}：${action.command}`)];
}

export function conversationalMenuPage(page: OnboardingMenuPage, narrator = ''): string {
  const { view } = page;
  const navigation = guiNavigation(page.nav);
  const option = (command: string) => `[[${command.replace(/^\//u, '')}]]`;

  return [
    view.title.replace(/^(?:系统|\{\{guide.name\}\})[ ·:：]*/u, narrator ? `${narrator} · ` : ''),
    ...view.branchMenu!.lines,
    ...view.branchMenu!.items.map(item => `\n${item.name} · ${item.learned ? '已读' : '未读'}\n说明：${item.description}\n${option(item.command)}`),
    `\n${navigation.text} ${navigation.actions.map(item => option(item.command)).join(' ')}`,
    [...(view.entries ?? []), ...view.actions].map(item => option(item.command)).join(' ')
  ].join('\n');
}
