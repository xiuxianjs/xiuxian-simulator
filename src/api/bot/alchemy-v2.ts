import { BackendAPIError } from './client';
import { validMiddlewareNav, type RobotMiddlewareReply } from './middleware-entry';

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const button = (value: unknown): boolean => record(value) && typeof value.label === 'string' && typeof value.command === 'string';

export function parseAlchemyV2Reply(value: unknown): RobotMiddlewareReply {
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

  return value as RobotMiddlewareReply;
}
