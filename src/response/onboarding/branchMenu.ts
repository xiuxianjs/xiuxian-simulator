import { type FormatMarkDown } from 'alemonjs';
import type { OnboardingBranchMenu, OnboardingView } from '@src/api/bot/onboarding';
import { mentionsRetiredFeature } from '../retiredFeatures';
import { section } from '../presentation';

// Markdown input links live beside their description; never a large keyboard.
export function appendOnboardingBranchMenu(md: FormatMarkDown, menu: OnboardingBranchMenu): void {
  for (const line of menu.lines) {
    md.addText(line).addNewline();
  }
  for (const item of menu.items) {
    if (mentionsRetiredFeature(item.name)) {
      continue;
    }
    md.addBlockquote(
      section({
        title: item.name,
        lines: [item.description],
        actions: [{ label: item.learned ? '再次查看' : '了解玩法', command: item.command, autoEnter: false }]
      })
    ).addNewline();
  }
}

export function appendOnboardingEntries(md: FormatMarkDown, entries: OnboardingView['entries']): void {
  if (!entries?.length) {
    return;
  }
  md.addBlockquote(section({ lines: [], actions: entries.map(entry => ({ ...entry, autoEnter: false })) })).addNewline();
}
