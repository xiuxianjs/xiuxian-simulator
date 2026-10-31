import { isGameEventEnabled } from '@src/utils/eventPolicy';
import { createContext, configureContext, Format, logger, ResultCode } from 'alemonjs';
import { parseOnboarding, type OnboardingView } from '@src/api/bot/onboarding';
import { requestRobotBusiness } from '@src/api/bot/robot-business';
import type { GameEvent } from '@src/types/event';
import { FormatGui, createQuoteMarkdown } from '@src/utils/messageHelper';
import { isPrivateEvent } from '@src/utils/privateEvent';
import { useMessage } from '@src/utils/useMessage';
import { sendMiddlewareReply } from '../middlewareReply';

import {
  canonicalOnboardingCommand as canonical,
  isOnboardingAddressed,
  isOnboardingHelp,
  isOnboardingResolution,
  onboardingDisplayLines,
  onboardingFooter,
  onboardingButtonVersion
} from './policy';
import { hasBoundReturnChoices, onboardingKeyboard } from './keyboard';

const onboarding = createContext({
  name: 'xiuxian-onboarding',
  events: ['message.create', 'private.message.create', 'interaction.create', 'private.interaction.create'],
  // UID-owned progress is authoritative across conversations. Only explicitly
  // addressed commands below are claimed; ordinary group conversation passes.
  scope: ['Platform', 'UserId'],
  expiresIn: '30m',
  onError: 'keep',
  initialState: (payload: unknown) => ({ view: payload as OnboardingView }),
  handlers: {
    async listen(event, state, action) {
      const gameEvent = event as GameEvent;
      const text = String(gameEvent.MessageText ?? '');

      if (!isGameEventEnabled(gameEvent) || !isOnboardingAddressed(gameEvent, state.view)) {
        action.pass();

        return;
      }
      const command = canonical(text);
      const buttonVersion = onboardingButtonVersion(gameEvent);

      if (isOnboardingResolution(command, state.view) && buttonVersion === undefined) {
        action.close();
        action.pass();

        return;
      }

      if (command === '继续引导' || command === '退出引导' || isOnboardingHelp(command)) {
        action.pass();

        return;
      }
      const choice = state.view.actions.find(button => canonical(button.command) === command);

      if (!choice) {
        if (state.view.status === 'soft' && buttonVersion === undefined) {
          action.close();
          action.pass();

          return;
        }
      }
      try {
        const execute = buttonVersion !== null && (choice !== undefined || buttonVersion !== undefined);
        const result = await requestRobotBusiness(
          gameEvent,
          execute ? 'onboarding.action' : 'onboarding.view',
          execute ? { version: buttonVersion ?? state.view.version, command: choice?.command ?? text.trim() } : {},
          parseOnboarding
        );

        if (result.success && result.branch === 'business') {
          if (execute && typeof buttonVersion === 'number') {
            result.data.feedback.unshift(`你选择了：${text.trim()}`);
          }
          if (!execute) {
            result.data.feedback.push('先选择当前目标；也可以暂离教学后自由探索，进度会保留。');
          }
          await showOnboarding(gameEvent, result.data);
        } else {
          for (const reply of result.middleware.replies) {
            await sendMiddlewareReply(gameEvent, reply);
          }
        }
      } catch (error) {
        await showOnboardingRecovery(gameEvent, error);
      }
    }
  }
});

export const onboardingContent = configureContext({ contexts: { onboarding } });

export function listenOnboarding(view: OnboardingView): void {
  onboarding.listen(view);
}

type TeachingMessage = Parameters<ReturnType<typeof useMessage>[0]['send']>[0];

// Framework send failures may be result codes rather than rejected promises.
// A fallback only resends presentation, never the already-issued game command.
export async function sendTeachingMessage(event: GameEvent, bubble: TeachingMessage, lines: string[]): Promise<void> {
  const [message] = useMessage(event);
  const delivered = async (payload: TeachingMessage): Promise<boolean> => {
    try {
      const receipts = await message.send(payload);

      return receipts.length > 0 && receipts.every(receipt => receipt.code === ResultCode.Ok);
    } catch {
      return false;
    }
  };

  if (await delivered(bubble)) {
    return;
  }
  const text = ['按钮气泡未确认送达，以下为同一教学进度的文字版；可手动发送末尾指令。', ...lines].join('\n');

  if (!(await delivered({ format: Format.create().addText(text) }))) {
    logger.warn('[onboarding] 按钮与文字消息均未确认送达；保留当前上下文，不重放教学操作。');
  }
}

export async function showOnboarding(event: GameEvent, view: OnboardingView, introduction?: string): Promise<void> {
  const md = Format.createMarkdown();

  if (introduction) {
    md.addBlockquote(createQuoteMarkdown(introduction.split('\n')));
  }
  if (view.feedback.length) {
    md.addBlockquote(createQuoteMarkdown(view.feedback.flatMap(line => line.split('\n'))));
  }
  for (const line of onboardingDisplayLines(view)) {
    md.addText(line).addNewline();
  }
  const active = view.status === 'active' || view.status === 'soft';
  const buttons = onboardingFooter(view);

  // Each action opens a fresh Context instance; carry the current server view
  // explicitly instead of assuming state survives a handler transition.
  if (active) {
    listenOnboarding(view);
  } else {
    onboarding.cancel();
  }
  const choices = buttons.flat().map(button => (button.label.includes(button.command) ? button.label : `${button.label} · ${button.command}`));
  const native = event.Platform === 'qq-bot' && (active || hasBoundReturnChoices(view));
  const bubble = FormatGui({
    isPrivate: isPrivateEvent(event),
    bid: event.UserId,
    title: view.title,
    content: md,
    footer: native ? undefined : buttons,
    bar: false
  });

  if (native) {
    bubble.format.addButtonGroup(onboardingKeyboard(event.UserId, isPrivateEvent(event), buttons));
  }

  await sendTeachingMessage(event, bubble, [
    view.title,
    ...(introduction ? [introduction] : []),
    ...view.feedback,
    ...onboardingDisplayLines(view),
    '可选指令：',
    ...choices
  ]);
}

// Recovery is presentation only. It never repeats a gameplay request, even
// when the previous action or prologue reward has already committed.
export async function showOnboardingRecovery(event: GameEvent, error: unknown, introduction?: string): Promise<void> {
  const md = Format.createMarkdown();

  if (introduction) {
    md.addBlockquote(createQuoteMarkdown(introduction.split('\n')));
  }
  md.addText('宋玉停住脚步：“先核对进度，别急着重复操作。”').addNewline();
  const reason = error instanceof Error ? error.message : '教学进度暂时无法确认，请稍后继续。';

  md.addText(reason);
  await sendTeachingMessage(
    event,
    FormatGui({
      isPrivate: isPrivateEvent(event),
      bid: event.UserId,
      title: '宋玉 · 操作暂未确认',
      content: md,
      footer: [[{ label: '核对当前进度 · /继续引导', command: '/继续引导' }], [{ label: '暂离教学 · /退出引导', command: '/退出引导' }]],
      bar: false
    }),
    [
      '宋玉 · 操作暂未确认',
      ...(introduction ? [introduction] : []),
      '宋玉停住脚步：“先核对进度，别急着重复操作。”',
      reason,
      '可选指令：',
      '核对当前进度 · /继续引导',
      '暂离教学 · /退出引导'
    ]
  );
}

export async function startOnboardingAfterPrologue(event: GameEvent, introduction: string): Promise<boolean> {
  const result = await requestRobotBusiness(event, 'onboarding.view', {}, parseOnboarding);

  if (result.success && result.branch === 'business') {
    if (result.data.status === 'active' || result.data.status === 'soft') {
      await showOnboarding(event, result.data, introduction);

      return true;
    }

    return false;
  }

  // Do not discard captcha/maintenance replies and fall back to a broad menu.
  // A deliberately silent middleware refusal (e.g. mute limits) stays silent.
  if (result.middleware.replies.length) {
    await showOnboardingRecovery(event, new Error('教学入口暂被系统检查拦截。请先处理下方提示，再继续引导。'), introduction);
    for (const reply of result.middleware.replies) {
      await sendMiddlewareReply(event, reply);
    }
  }

  return true;
}
