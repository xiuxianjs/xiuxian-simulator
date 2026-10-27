import { onWatchConfigValue } from 'alemonjs';
import { getQQBotAppIds } from './utils/qqBotIdentity';
import { platform } from '@alemonjs/qq-bot';
import { gameExpose } from './expose';
import { assertChannelRobotEvent, getBackendConfig } from './api/bot/config';
import { normalizeRobotBid } from './api/bot/robot-bid';
import { observePlayerGroupActivity } from './notification/activity';
import { observeChatContact, resetChatContactObserver, stopChatContactObserver } from './notification/chatContacts';
import { startNotificationStream, stopNotificationStream } from './notification/stream';
import { handleCommandError } from './response/commandError';
import { onboardingContent } from './response/onboarding/context';
import { configureOnboardingCommandMatcher } from './response/onboarding/policy';
import router, { matchesGameCommand } from './router';
import { isGameEventEnabled } from './utils/eventPolicy';
import { startFeatureVisibility } from './utils/featureVisibility';
import { normalizePrivateEvent } from './utils/privateEvent';
import { startTransportEvent, transportCheckpoint } from './utils/transportTiming';

configureOnboardingCommandMatcher(matchesGameCommand);

const isProduction = process.env.NODE_ENV !== 'development';
const isQQBot = process.env.login === platform;

let stopWaitingForAppId: (() => void) | undefined;
let servicesStarted = false;
let disposed = false;

async function startReadyServices(): Promise<void> {
  if (disposed || servicesStarted) {
    return;
  }
  if ((isQQBot || getBackendConfig().channelMode) && !getQQBotAppIds().length) {
    stopWaitingForAppId ??= onWatchConfigValue(() => {
      void startReadyServices().catch(error => logger.error('机器人服务启动失败', error));
    });

    return;
  }
  stopWaitingForAppId?.();
  stopWaitingForAppId = undefined;
  servicesStarted = true;
  await resetChatContactObserver();
  try {
    await startFeatureVisibility();
  } catch {
    logger.error('功能展示规则加载失败，未确认的功能入口将隐藏，后续消息会重试。');
  }
  if (!disposed && isProduction && isQQBot) {
    startNotificationStream();
  }
}

export default defineChildren({
  // 应用创建阶段触发。
  onCreated: async () => {
    disposed = false;
    servicesStarted = false;
    await startReadyServices();
    logger.info('修仙机器人已启动');
  },
  // 事件生命周期开始时触发。
  onEventStart: async ({ event }) => {
    if (!isGameEventEnabled(event)) {
      return;
    }
    assertChannelRobotEvent(event);
    normalizePrivateEvent(event);
    // 在身份缓存和幂等键构造前统一数字平台 ID。
    if (typeof event.UserId === 'number' || typeof event.UserId === 'bigint') {
      event.UserId = normalizeRobotBid(event.UserId);
    }
    observePlayerGroupActivity(event);
    await observeChatContact(event);
    // 记录事件处理阶段的时间戳。
    startTransportEvent(event);
  },
  // 事件生命周期结束时触发。
  onEventFinished: ({ event }) => {
    if (isGameEventEnabled(event)) {
      transportCheckpoint('event.processor.finished', event);
    }
  },
  // 事件生命周期异常时触发。
  onEventError: handleCommandError,
  // 应用销毁阶段触发。
  onDispose: async () => {
    disposed = true;
    stopWaitingForAppId?.();
    stopWaitingForAppId = undefined;
    stopNotificationStream();
    await stopChatContactObserver();
  },
  // 注册路由
  register() {
    return {
      expose: gameExpose,
      responseContent: onboardingContent,
      response: router
    };
  }
});
