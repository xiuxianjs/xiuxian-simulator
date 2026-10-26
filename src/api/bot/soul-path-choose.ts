import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import { parseSoulPathReceipt, type SoulPathReceipt } from '../schemas/soul-path-receipt';

export type SoulPathChoosePreview = { token: string; message: string };
export type SoulPathChooseResult = SoulPathReceipt;

type Row = Record<string, unknown>;

const row = (value: unknown): Row => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {});

export function parseSoulChoosePreview(value: unknown): SoulPathChoosePreview {
  const data = row(value);

  if (typeof data.token !== 'string' || !/^[0-9a-f-]{36}$/.test(data.token) || typeof data.message !== 'string') {
    throw new Error('道途选择预览响应不完整');
  }

  return { token: data.token, message: data.message };
}

export function parseSoulChooseResult(value: unknown): SoulPathChooseResult {
  return parseSoulPathReceipt(value, '道途选择确认响应不完整');
}

export async function previewBackendSoulPathChoose(
  bid: string | undefined,
  uid: number,
  pathKey: SoulPathChooseResult['pathKey'],
  request?: BackendRequestContext
): Promise<SoulPathChoosePreview> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseSoulChoosePreview(
    await requestBackend(bid, 'post_players_id_soul_path_choose_preview', {
      path: { id: uid },
      body: { pathKey },
      ...writeContext(request)
    })
  );
}

export async function confirmBackendSoulPathChoose(
  bid: string | undefined,
  uid: number,
  token: string,
  request?: BackendRequestContext
): Promise<SoulPathChooseResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseSoulChooseResult(
    await requestBackend(bid, 'post_players_id_soul_path_choose_confirm', {
      path: { id: uid },
      body: { token },
      ...writeContext(request)
    })
  );
}
