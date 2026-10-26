import type { unequipBackendSoulArtifact } from '@src/api/bot/soul-artifact-unequip';
import type { BackendRequestContext } from '@src/api/bot/context';
import { commandBackendSoulArtifactUnequip } from '@src/api/bot/soul-artifact-commands';
import { logger } from 'alemonjs';

export type SoulArtifactUnequipResult =
  | { code: 'NOT_EQUIPPED'; data: { message: string } }
  | { code: 'CONFIRM'; data: { name: string; level: number; totalCost: number; refundQty: number } }
  | { code: 'DONE'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

function doneMessage(result: Awaited<ReturnType<typeof unequipBackendSoulArtifact>>): string {
  if (result.outcome === 'not_equipped') {
    // The old confirmed command went directly to unequipSoulArtifact and used
    // this model message; the unconfirmed branch intentionally retains its
    // separate \"当前未装备\" prompt below.
    return '当前没有炼化本命物';
  }
  const artifact = result.artifact!;
  const lines = [`已分离「${artifact.name ?? 'undefined'}」`];

  if (artifact.previousLevel > 0) {
    lines.push(`等级 Lv.${artifact.previousLevel} → Lv.0（已重置）`);
    lines.push(`退还筑灵石 ×${artifact.refundQuantity}（投入${artifact.totalCost}的60%）`);
  }
  lines.push('品级和洗涤附加已保留');

  return lines.join('\n');
}

export default async function App(params: {
  bid?: string;
  uid: number;
  confirmed: boolean;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<SoulArtifactUnequipResult> {
  try {
    const result = await commandBackendSoulArtifactUnequip(params.bid, params.uid, params.confirmed, params.request, params.messageText);

    if (!params.confirmed || result.outcome === 'confirmation') {
      const preview = result;

      if (preview.outcome === 'not_equipped') {
        return { code: 'NOT_EQUIPPED', data: { message: '当前未装备本命物' } };
      }
      if (preview.artifact!.previousLevel > 0) {
        const artifact = preview.artifact!;

        return {
          code: 'CONFIRM',
          data: { name: artifact.name ?? 'undefined', level: artifact.previousLevel, totalCost: artifact.totalCost, refundQty: artifact.refundQuantity }
        };
      }
    }

    if (result.outcome === 'confirmation') {
      throw new Error('分离本命物响应不完整');
    }

    return { code: 'DONE', data: { message: doneMessage(result) } };
  } catch (error) {
    logger.error('分离本命物失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '分离失败' } };
  }
}
