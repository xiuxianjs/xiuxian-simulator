import { appendMiddlewareAdvice } from '@src/response/middlewareReply';
import type { RobotMiddlewareReply } from './middleware-entry';
import { parseTreasureEffects, type TreasureEffectNotice } from './treasure-effects';
import { appendTreasureEffects } from '@src/response/treasureEffects';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parseBackendCaveOverview } from './cave-overview-queries';
import { parseBackendCaveVisit } from './cave-visit-queries';
import type { CavePlantOptions } from './cave-plant-options-query';
import { Format } from 'alemonjs';
import { FormatGui } from '@src/utils/messageHelper';
import type { CaveAccessQueryData } from '../schemas/cave-access-query';
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('灵田聚合响应不完整');
  }

  return value as Record<string, unknown>;
}
export async function getBackendCaveView(bid: string, uid: number) {
  const data = record(await requestBackend(bid, 'get_players_id_cave_view', { path: { id: uid } }));

  return parseBackendCaveView(data);
}
export function parseBackendCaveView(value: unknown) {
  const data = record(value);
  const access = record(data.access);

  if (
    typeof access.canUseCave !== 'boolean' ||
    typeof access.lockedMessage !== 'string' ||
    (access.realmName !== null && typeof access.realmName !== 'string') ||
    (access.canUseCave ? typeof access.hasCavePlot !== 'boolean' : access.hasCavePlot !== null)
  ) {
    throw new Error('灵田资格响应不完整');
  }
  const parsedAccess: CaveAccessQueryData = {
    canUseCave: access.canUseCave,
    lockedMessage: access.lockedMessage,
    realmName: access.realmName,
    hasCavePlot: access.hasCavePlot as boolean | null
  };

  return { access: parsedAccess, overview: data.overview ? parseBackendCaveOverview(data.overview) : null };
}
export async function getBackendCavePlantQuery(bid: string, uid: number, plotIndex?: number) {
  const data = record(await requestBackend(bid, 'get_players_id_cave_plant_query', { path: { id: uid }, query: { plotIndex: plotIndex ?? 0 } }));

  return parseBackendCavePlantQuery(data);
}
export function parseBackendCavePlantQuery(value: unknown) {
  const data = record(value);

  return { options: plantOptions(data.options), overview: parseBackendCaveOverview(data.overview) };
}
function plantOptions(value: unknown): CavePlantOptions {
  const data = record(value);

  if (!Number.isInteger(data.plotIndex) || !Number.isInteger(data.remainingPlots) || !Array.isArray(data.options)) {
    throw new Error('播种聚合选项响应不完整');
  }
  for (const value of data.options) {
    const option = record(value);

    if (
      typeof option.seedName !== 'string' ||
      typeof option.cropName !== 'string' ||
      typeof option.matureHours !== 'number' ||
      !Number.isFinite(option.matureHours) ||
      !Number.isInteger(option.quantity)
    ) {
      throw new Error('播种聚合选项响应不完整');
    }
  }

  return data as CavePlantOptions;
}
export type CaveCommandInput = {
  action: 'cultivate' | 'plant' | 'care' | 'harvest' | 'upgrade' | 'accelerate' | 'collaborate' | 'steal';
  plotIndex?: number;
  seedName?: string;
  accelerator?: 'lingfei' | 'greenBottle' | 'spiritStone' | 'ripen';
  count?: number;
  ownerId?: number;
  ownerBid?: string;
  careAction?: 'water' | 'worm' | 'weed' | 'harvest';
};
export async function executeBackendCaveCommand(bid: string, uid: number, body: CaveCommandInput, request: BackendRequestContext) {
  const data = record(await requestBackend(bid, 'post_players_id_cave_command', { path: { id: uid }, body, ...writeContext(request) }));

  return parseBackendCaveCommand(data);
}
export function parseBackendCaveCommand(value: unknown) {
  const data = record(value);

  if (typeof data.message !== 'string' || (data.needsSeedSelection !== undefined && typeof data.needsSeedSelection !== 'boolean')) {
    throw new Error('灵田操作聚合响应不完整');
  }

  return {
    treasureEffects: parseTreasureEffects(data.treasureEffects),
    message: data.message,
    ownerUid: typeof data.ownerUid === 'number' ? data.ownerUid : null,
    snapshotError: typeof data.snapshotError === 'string' ? data.snapshotError : null,
    needsSeedSelection: data.needsSeedSelection === true,
    overview: data.overview ? parseBackendCaveOverview(data.overview) : null,
    visit: data.visit ? parseBackendCaveVisit(data.visit) : null,
    options: data.options ? plantOptions(data.options) : null
  };
}

export function sendCaveCommandFallback(
  result: { message: string; snapshotError: string | null; treasureEffects?: TreasureEffectNotice[] },
  bid: string | undefined,
  isPrivate: boolean,
  message: { send: (value: ReturnType<typeof FormatGui>) => unknown },
  title: string,
  advice: RobotMiddlewareReply['advice'] = []
) {
  const md = Format.createMarkdown().addText(result.message);

  appendTreasureEffects(md, result.treasureEffects);
  if (result.snapshotError) {
    md.addNewline().addText(result.snapshotError);
  }
  appendMiddlewareAdvice(md, advice);

  return message.send(FormatGui({ bid, isPrivate, title, content: md, footer: [{ label: '我的灵田', command: '/灵田' }] }));
}
