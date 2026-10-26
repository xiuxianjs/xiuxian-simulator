import { Format } from 'alemonjs';
import { recoveryEffectText, type RecoveryEffect, type ResourceRecoverySummary } from '@src/api/schemas/resource-recovery';

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
export function recoverySummaryMarkdown(summary: ResourceRecoverySummary) {
  const md = Format.createMarkdown();

  md.addText(`回灵效率：${summary.mp}%（上限 ${summary.cap}%）`);
  md.addNewline();
  md.addText(`回念效率：${summary.mental}%（上限 ${summary.cap}%）`);
  if (!summary.configured || !summary.enabled) {
    md.addNewline();
    md.addText(summary.configured ? '效率配置已关闭' : '尚未配置效率来源');
  }
  for (const source of summary.sources) {
    md.addNewline();
    md.addText(recoveryEffectText(source));
  }
  if (summary.mpTotal > summary.mp || summary.mentalTotal > summary.mental) {
    md.addNewline();
    md.addText(`来源合计：回灵 ${summary.mpTotal}%、回念 ${summary.mentalTotal}%；超出上限的部分不生效。`);
  }
  md.addNewline();
  md.addText(summary.note);

  return md;
}
