import { Format } from 'alemonjs';
import { section } from '@src/response/presentation';
import { recoveryEffectText, type RecoveryEffect } from '@src/api/schemas/resource-recovery';

export function recoveryEffectsMarkdown(effects: RecoveryEffect[]) {
  const md = Format.createMarkdown();

  md.addText('资源恢复固有效果');
  for (const effect of effects) {
    md.addNewline();
    md.addText(recoveryEffectText(effect));
    md.addNewline();
    md.addText(effect.conditionText);
  }

  return md;
}
export function appendRecoveryChanges(md: ReturnType<typeof Format.createMarkdown>, lines?: string[]) {
  if (lines?.length) {
    md.addNewline().addBlockquote(section({ lines }));
  }
}
