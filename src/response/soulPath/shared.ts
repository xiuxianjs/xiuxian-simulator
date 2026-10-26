import { FormatGui, type GuiButton, type GuiFooter } from '@src/utils/messageHelper';
import { Format } from 'alemonjs';

export const addSoulQuote = (md: ReturnType<typeof Format.createMarkdown>, text: string) => {
  md.addBlockquote(Format.createMarkdown().addText(`${text}`));
};

/** 按服务端返回的变化行保留原卡片加粗和换行布局。 */
export const addSoulEffectChanges = (
  md: ReturnType<typeof Format.createMarkdown>,
  changes: Array<{ label: string; before: number; after: number; deltaText: string }>,
  emptyMessage: string
) => {
  for (const change of changes) {
    md.addText(`${change.label} ${change.before} → `);
    md.addBold(String(change.after));
    md.addText(`（${change.deltaText}）`);
    md.addNewline();
  }
  if (emptyMessage) {
    addSoulQuote(md, emptyMessage);
  }
};

type SoulGuiEvent = {
  name?: string;
  isPrivate?: boolean;
  UserId?: string;
};

export const getCommandArgument = (messageText: string | undefined, command: string): string => {
  const text = messageText?.trim() ?? '';
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^[!！/#＃]?${escaped}\\s+(.+)$`));

  return match?.[1]?.trim() ?? '';
};

export const sendSoulGui = (e: SoulGuiEvent, title: string, content: ReturnType<typeof Format.createMarkdown>, footer: GuiFooter = []) => {
  const [isPrivate, bid] = [e.isPrivate ?? e.name?.startsWith('private.') ?? false, e?.UserId];
  const rows = Array.isArray(footer[0]) ? (footer as GuiButton[][]) : [footer as GuiButton[]];
  const navigation: GuiFooter = rows.filter(row => row.length > 0);

  return FormatGui({ isPrivate, bid, title, content, footer: navigation });
};

export const isSoulConfirmationToken = (token: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token);
