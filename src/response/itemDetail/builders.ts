import type { EncyclopediaDetailFacts } from '@src/api/schemas/encyclopedia';
import { createQuoteMarkdown } from '@src/utils/messageHelper';
import { type FormatMarkDown } from 'alemonjs';

/** Shared renderer for the server-owned item, equipment, tool and skill detail view. */
export const renderDetailView = (md: FormatMarkDown, facts: EncyclopediaDetailFacts) => {
  for (const block of facts.view) {
    switch (block.kind) {
      case 'text':
        md.addText(block.text ?? '');
        break;
      case 'newline':
        md.addNewline();
        break;
      case 'quote':
        md.addBlockquote(createQuoteMarkdown((block.text ?? '').split('\n')));
        break;
      case 'source':
        md.addBlockquote(createQuoteMarkdown([block.text ?? ''], block.command ? [{ label: '前往', command: block.command }] : []));
        break;
    }
  }
};

export const buildItemDetail = (_item: any, _grade: any, md: FormatMarkDown, _uid: number | undefined, facts: EncyclopediaDetailFacts) => {
  renderDetailView(md, facts);
};
export const buildEquipmentDetail = (_equip: any, _grade: any, md: FormatMarkDown, facts: EncyclopediaDetailFacts) => renderDetailView(md, facts);
export const buildProfessionToolDetail = (_tool: any, _grade: any, md: FormatMarkDown, facts: EncyclopediaDetailFacts) => renderDetailView(md, facts);
export const buildSkillBookDetail = (_skillBook: any, _grade: any, md: FormatMarkDown, facts: EncyclopediaDetailFacts) => renderDetailView(md, facts);
