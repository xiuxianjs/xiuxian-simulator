import type { BackendRequestContext } from '@src/api/bot/context';
import {
  chooseBackendSoulPath,
  getBackendSoulPathState,
  nurtureBackendSoulPath,
  setBackendSoulSupplyDirection,
  type SoulNurtureDirection,
  type SoulPathKey
} from '@src/api/bot/soul-path';
import { logger } from 'alemonjs';

const PATH_INPUT_MAP: Record<string, SoulPathKey> = { 玄法: 'xuan_fa', 玄法道: 'xuan_fa', 炼体: 'lian_ti', 炼体道: 'lian_ti', 御器: 'yu_qi', 御器道: 'yu_qi' };
const DIRECTION_INPUT_MAP: Record<string, SoulNurtureDirection> = { 定魂: 'ding_hun', 养魄: 'yang_po', 悟道: 'wu_dao', 出窍: 'chu_qiao' };

export const parseSoulPathInput = (value: string): SoulPathKey | null => PATH_INPUT_MAP[value.trim()] ?? null;
export const parseSoulNurtureDirection = (value: string): SoulNurtureDirection | null => DIRECTION_INPUT_MAP[value.trim()] ?? null;

export async function executeSoulSupplyChoice(bid: string | undefined, uid: number, input: string, request?: BackendRequestContext) {
  const direction = parseSoulNurtureDirection(input);

  if (!direction && input.trim() !== '自动') {
    return { success: false as const, message: '用法：/神魂补给 <自动|定魂|养魄|悟道|出窍>' };
  }
  try {
    return { success: true as const, data: await setBackendSoulSupplyDirection(bid, uid, direction, request), message: '' };
  } catch (error) {
    logger.error('[神魂补给] 设置失败:', error);

    return { success: false as const, message: error instanceof Error ? error.message : '补给设置失败，请稍后再试。' };
  }
}
export async function loadSoulPanel(bid: string | undefined, uid: number, request?: BackendRequestContext) {
  try {
    return { success: true as const, data: await getBackendSoulPathState(bid, uid, request) };
  } catch (error) {
    logger.error('[元婴神魂] 面板加载失败:', error);

    return { success: false as const, message: error instanceof Error ? error.message : '元婴神魂面板加载失败，请稍后再试。' };
  }
}
export const loadSoulPathDetails = loadSoulPanel;
export async function executeSoulNurture(bid: string | undefined, uid: number, directionInput: string, request?: BackendRequestContext) {
  const direction = parseSoulNurtureDirection(directionInput);

  if (!direction) {
    return { success: false as const, message: '用法：/神魂温养 <定魂|养魄|悟道|出窍>' };
  }
  try {
    return { success: true as const, data: await nurtureBackendSoulPath(bid, uid, direction, request) };
  } catch (error) {
    logger.error('[神魂温养] 执行失败:', error);

    return { success: false as const, message: error instanceof Error ? error.message : '神魂温养失败，请稍后再试。' };
  }
}
export async function executeSoulChoose(bid: string | undefined, uid: number, pathInput: string, request?: BackendRequestContext) {
  const pathKey = parseSoulPathInput(pathInput);

  if (!pathKey) {
    return { success: false as const, message: '用法：/选择道途 <玄法|炼体|御器>' };
  }
  try {
    return { success: true as const, data: await chooseBackendSoulPath(bid, uid, pathKey, request) };
  } catch (error) {
    logger.error('[选择道途] 执行失败:', error);

    return { success: false as const, message: error instanceof Error ? error.message : '选择道途失败，请稍后再试。' };
  }
}
