import { observeChatContact, resetChatContactObserver, stopChatContactObserver } from './notification/chatContacts';
import { assertChannelRobotEvent, getBackendConfig } from './api/bot/config';
import { startFeatureVisibility } from './utils/featureVisibility';
import { platform } from '@alemonjs/qq-bot';
import { observePlayerGroupActivity } from './notification/activity';
import { normalizeRobotBid } from './api/bot/robot-bid';
import { startNotificationStream, stopNotificationStream } from './notification/stream';
import { handleCommandError } from './response/commandError';
import router, { matchesGameCommand } from './router';
import { onboardingContent } from './response/onboarding/context';
import { configureOnboardingCommandMatcher } from './response/onboarding/policy';
import { normalizePrivateEvent } from './utils/privateEvent';
import { startTransportEvent, transportCheckpoint } from './utils/transportTiming';

configureOnboardingCommandMatcher(matchesGameCommand);

const isProduction = process.env.NODE_ENV !== 'development';
const isQQBot = process.env.login === platform;

export default defineChildren({
  // 应用创建阶段触发。
  onCreated: async () => {
    if (!getBackendConfig().channelMode) {
      await resetChatContactObserver();
    } else {
      logger.warn('渠道模式：聊天运营接口尚未接入，暂停聊天观察与投递。');
    }
    try {
      await startFeatureVisibility();
    } catch {
      logger.error('功能展示规则加载失败，未确认的功能入口将隐藏，后续消息会重试。');
    }
    // QQ 平台通知由 SSE 唤醒投递。
    if (isProduction && isQQBot) {
      startNotificationStream();
    }
    logger.info('修仙机器人已启动');
  },
  // 事件生命周期开始时触发。
  onEventStart: async ({ event }) => {
    assertChannelRobotEvent(event);
    normalizePrivateEvent(event);
    // 在身份缓存和幂等键构造前统一数字平台 ID。
    if (typeof event.UserId === 'number' || typeof event.UserId === 'bigint') {
      event.UserId = normalizeRobotBid(event.UserId);
    }
    observePlayerGroupActivity(event);
    if (!getBackendConfig().channelMode) {
      await observeChatContact(event);
    }
    // 记录事件处理阶段的时间戳。
    startTransportEvent(event);
  },
  // 事件生命周期结束时触发。
  onEventFinished: ({ event }) => transportCheckpoint('event.processor.finished', event),
  // 事件生命周期异常时触发。
  onEventError: handleCommandError,
  // 应用销毁阶段触发。
  onDispose: async () => {
    stopNotificationStream();
    await stopChatContactObserver();
  },
  // 注册路由
  register() {
    return {
      responseContent: onboardingContent,
      response: router
    };
  }
});
