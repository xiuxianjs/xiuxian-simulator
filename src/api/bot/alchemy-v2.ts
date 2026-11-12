import { BackendAPIError } from './client';
import { parseTreasureEffects } from './treasure-effects';
import { validMiddlewareNav, type RobotMiddlewareReply } from './middleware-entry';

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const button = (value: unknown): boolean => record(value) && typeof value.label === 'string' && typeof value.command === 'string';

export type AlchemySettlement = {
  count: number;
  successCount: number;
  failedCount: number;
  exp: number;
  replayed: boolean;
};

function isAlchemySettlement(value: unknown): value is AlchemySettlement {
  if (!record(value)) {
    return false;
  }
  const { count, successCount, failedCount, exp, replayed } = value;
  const nonnegativeInteger = (entry: unknown): entry is number => typeof entry === 'number' && Number.isSafeInteger(entry) && entry >= 0;

  return (
    nonnegativeInteger(count) &&
    count > 0 &&
    nonnegativeInteger(successCount) &&
    nonnegativeInteger(failedCount) &&
    successCount + failedCount === count &&
    nonnegativeInteger(exp) &&
    typeof replayed === 'boolean'
  );
}

export function parseAlchemyV2Reply(value: unknown): RobotMiddlewareReply & { alchemySettlement?: AlchemySettlement } {
  if (
    !record(value) ||
    (value.nav !== undefined && !validMiddlewareNav(value.nav)) ||
    !['title', 'heading', 'text'].every(key => typeof value[key] === 'string') ||
    !Array.isArray(value.buttons) ||
    !value.buttons.every(button) ||
    !Array.isArray(value.advice) ||
    !value.advice.every(tip => record(tip) && typeof tip.command === 'string' && typeof tip.description === 'string') ||
    (value.blocks !== undefined &&
      (!Array.isArray(value.blocks) ||
        !value.blocks.every(
          block => record(block) &&
            typeof block.text === 'string' &&
            typeof block.quoted === 'boolean' &&
            (block.inlineButtons === undefined || (Array.isArray(block.inlineButtons) && block.inlineButtons.every(button)))
        )))
  ) {
    throw new BackendAPIError('炼丹响应不完整，请稍后重试', 'SDK_INVALID_RESPONSE');
  }

  parseTreasureEffects(value.treasureEffects);

  const { alchemySettlement, ...reply } = value;

  return {
    ...(reply as RobotMiddlewareReply),
    ...(isAlchemySettlement(alchemySettlement) ? { alchemySettlement } : {})
  };
}
