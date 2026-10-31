import type { TreasureEffectNotice } from '@src/api/bot/treasure-effects';
import type { FormatMarkDown } from 'alemonjs';

/** Keep treasure prose and actual gains separate from the ordinary receipt. */
export function appendTreasureEffects(md: FormatMarkDown, notices?: TreasureEffectNotice[]): void {
  for (const notice of notices ?? []) {
    md.addNewline().addNewline().addText(notice.description);
    for (const benefit of notice.benefits) {
      md.addNewline().addBold(benefit);
    }
  }
}
