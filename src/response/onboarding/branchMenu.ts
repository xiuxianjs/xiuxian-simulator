import { markdownButtonLabel } from '@src/utils/buttonLabel';
import { Format, type FormatMarkDown } from 'alemonjs';
import type { OnboardingBranchMenu, OnboardingView } from '@src/api/bot/onboarding';
import { mentionsRetiredFeature } from '../retiredFeatures';

// Markdown input links live beside their description; never a large keyboard.
export function appendOnboardingBranchMenu(md: FormatMarkDown, menu: OnboardingBranchMenu): void {
  for (const line of menu.lines) {
    md.addText(line).addNewline();
  }
  for (const item of menu.items) {
    if (mentionsRetiredFeature(item.name)) {
      continue;
    }
    const quote = Format.createMarkdown();

    quote
      .addBold(item.name)
      .addText(item.learned ? ' · 已读' : ' · 未读')
      .addNewline();
    quote.addText(item.description).addNewline();
    quote.addButton(markdownButtonLabel(item.learned ? '再看本分支' : '学习本分支'), { data: item.command, autoEnter: false });
    md.addBlockquote(quote).addNewline();
  }
}

export function appendOnboardingEntries(md: FormatMarkDown, entries: OnboardingView['entries']): void {
  if (!entries?.length) {
    return;
  }
  const quote = Format.createMarkdown().addText('可选入口：').addNewline();

  for (const entry of entries) {
    quote.addButton(markdownButtonLabel(entry.label), { data: entry.command, autoEnter: false }).addNewline();
  }
  md.addBlockquote(quote).addNewline();
}
