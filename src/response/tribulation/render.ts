import { Format } from 'alemonjs';
import { createQuoteMarkdown, FormatGui } from '@src/utils/messageHelper';
import type { TribulationPanel } from '@src/response-apps/tribulation/app';

export function renderTribulationPanel(panel: TribulationPanel, params: { isPrivate: boolean; bid?: string }) {
  const content = Format.createMarkdown();

  if (!panel.sections.length && panel.emptyText) {
    content.addText(panel.emptyText);
  }

  for (const section of panel.sections) {
    content.addBlockquote(createQuoteMarkdown(section.lines, section.buttons));
    content.addNewline();
  }

  return FormatGui({ ...params, title: panel.title, content, header: panel.header, nav: panel.nav, footer: panel.footer });
}
