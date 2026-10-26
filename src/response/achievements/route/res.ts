import type { GameEvent } from '@src/types/event';
import type { Next } from 'alemonjs';
import categoryResponse from '@src/response/achievements/category/res';
import claimCombatPowerResponse from '@src/response/achievements/claimCombatPower/res';
import combatPowerResponse from '@src/response/achievements/combatPower/res';
import overviewResponse from '@src/response/achievements/overview/res';

type RouteExecutable = (event: GameEvent, next: Next) => unknown | Promise<unknown>;

function extractExecutables(target: unknown): RouteExecutable[] {
  const unwrapped =
    target && typeof target === 'object' && 'default' in (target as Record<string, unknown>) ? (target as Record<string, unknown>).default : target;

  if (typeof unwrapped === 'function') {
    return [unwrapped as RouteExecutable];
  }

  if (unwrapped && typeof unwrapped === 'object') {
    const current = (unwrapped as Record<string, unknown>).current;

    if (Array.isArray(current)) {
      return current.filter((item): item is RouteExecutable => typeof item === 'function');
    }

    if (typeof current === 'function') {
      return [current as RouteExecutable];
    }
  }

  return [];
}

function runResponse(target: unknown, event: GameEvent, next: Next) {
  const executables = extractExecutables(target);

  if (executables.length === 0) {
    return next();
  }

  let index = 0;

  const runNext = (): unknown => {
    const current = executables[index];

    index += 1;

    if (!current) {
      return true;
    }

    return current(event, runNext);
  };

  return runNext();
}

function getRouteText(event: GameEvent) {
  return String(event.__route?.text ?? event.MessageText ?? '').trim();
}

export default (event: GameEvent, next: Next) => {
  const text = getRouteText(event);
  const tokens = text.split(/\s+/).filter(Boolean);

  if (tokens[0] !== '成就') {
    return next();
  }

  if (tokens[1] === '战力') {
    if (tokens[2] === '领取' || tokens[2] === '一键领取') {
      return runResponse(claimCombatPowerResponse, event, next);
    }

    return runResponse(combatPowerResponse, event, next);
  }

  if (tokens.length === 1) {
    return runResponse(overviewResponse, event, next);
  }

  return runResponse(categoryResponse, event, next);
};
