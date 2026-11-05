import type { OnboardingView } from '@src/api/bot/onboarding';
import { getCommandPrefix, hasCommandPrefix, internalCommandText } from '@src/utils/commandPrefix';
import { mentionsRetiredFeature } from '../retiredFeatures';

export const canonicalOnboardingCommand = (value: string, prefix = '/'): string => internalCommandText(value, prefix)
    .trim()
    .replace(/^[/#＃!！]\s*/, '')
    .split(/\s+/)
    .join(' ');

// Exact read-only entries; arguments and unrelated commands remain controlled.
export const isOnboardingHelp = (command: string): boolean => ['修仙帮助', '我的天赋'].includes(command);

// A realm lesson must not swallow an explicit resolution of existing work.
// Normal handlers still validate the actual pending session/token.
export const isOnboardingResolution = (command: string, view: OnboardingView): boolean => view.phase.startsWith('milestone.') &&
  [
    '出关',
    '打坐结束',
    '结束打坐',
    '返程',
    '融臣结束',
    '确认培元丹',
    '取消培元丹',
    '确认明悟丹',
    '确认本命物洗涤',
    '取消本命物洗涤',
    '确认神魂',
    '普攻',
    '普通攻击',
    '战技',
    '神通',
    '自动',
    '切换自动',
    '逃跑'
  ].includes(command.split(' ')[0]);

// Keep the robot's existing retired-entry policy consistent with /天书.
// Actual business feedback/receipts are never filtered by this helper.
export const onboardingDisplayLines = (view: OnboardingView): string[] => view.lines.flatMap(line => line.split('\n')).filter(line => !view.phase.startsWith('milestone.') || !mentionsRetiredFeature(line));

type OnboardingInput = { name?: string; MessageText?: string; IsPrivate?: boolean; isPrivate?: boolean; InteractionData?: string };

export const onboardingButtonId = (version: number, index: number): string => `ob${version.toString(36)}.${index}`;

// undefined: unrelated/legacy input; null: our button with invalid metadata.
// QQ preserves resolved button_id/data in InteractionData without changing
// MessageText, so visible and manually typed commands remain real commands.
export function onboardingButtonVersion(event: { name?: string; MessageText?: string; InteractionData?: string }, prefix = '/'): number | null | undefined {
  const inline = /^继续引导 ([1-9]\d{0,15}) ([a-z][a-z0-9-]{0,63})$/.exec(canonicalOnboardingCommand(event.MessageText ?? '', prefix));

  if (inline) {
    const version = Number(inline[1]);

    return Number.isSafeInteger(version) && version > 0 ? version : null;
  }

  if (!event.name?.includes('interaction') || !event.InteractionData) {
    return undefined;
  }
  let data: { button_id?: unknown; button_data?: unknown };

  try {
    data = JSON.parse(event.InteractionData);
  } catch {
    return undefined;
  }
  if (!data || typeof data.button_id !== 'string' || !/^ob.*\./.test(data.button_id)) {
    return undefined;
  }
  const match = /^ob([0-9a-z]{1,11})\.([0-2])$/.exec(data.button_id);
  const version = match ? Number.parseInt(match[1], 36) : 0;

  if (
    !match ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    onboardingButtonId(version, Number(match[2])) !== data.button_id ||
    typeof data.button_data !== 'string' ||
    canonicalOnboardingCommand(data.button_data, prefix) !== canonicalOnboardingCommand(event.MessageText ?? '', prefix)
  ) {
    return null;
  }

  return version;
}
let matchesGameCommand: ((event: OnboardingInput) => boolean) | undefined;

// Supplied by the app's existing Router.match: recognize registered bare game
// commands without importing a second router, running importers or listing all
// commands again. Regular group conversation must still pass untouched.
export function configureOnboardingCommandMatcher(matcher?: (event: OnboardingInput) => boolean): void {
  matchesGameCommand = matcher;
}

export function isOnboardingAddressed(event: OnboardingInput, view: OnboardingView): boolean {
  const text = String(event.MessageText ?? '').trimStart();

  // Context 与路由保持一致：裸指令不能接管教学会话。
  if (!hasCommandPrefix(text)) {
    return false;
  }
  // 仅教学自己的回调可直接接管；私聊、命令前缀和其他插件按钮都不是归属凭据。
  if (onboardingButtonVersion(event, getCommandPrefix()) !== undefined) {
    return true;
  }
  const command = canonicalOnboardingCommand(text, getCommandPrefix());

  return (
    command === '继续引导' ||
    command === '退出引导' ||
    isOnboardingHelp(command) ||
    onboardingChoices(view).some(action => canonicalOnboardingCommand(action.command) === command) ||
    matchesGameCommand?.(event) === true
  );
}

export const onboardingChoices = (view: OnboardingView) => [
  ...view.actions,
  ...(view.entries ?? []),
  ...(view.branchMenu?.items ?? []).filter(item => !mentionsRetiredFeature(item.name))
];

export function onboardingFooter(view: OnboardingView): { label: string; command: string }[][] {
  if (view.branchMenu) {
    return [[{ label: '暂离引导', command: '/退出引导' }]];
  }
  if (view.status === 'active' || view.status === 'soft') {
    return [...(view.actions.length ? [view.actions] : []), [{ label: '暂离引导', command: '/退出引导' }]];
  }
  if (view.status === 'completed') {
    if (view.actions.length) {
      return view.actions.slice(0, 2).map(button => [button]);
    }

    return [[{ label: '出关结算 · /出关', command: '/出关' }], [{ label: '任务面板 · /任务面板', command: '/任务面板' }]];
  }
  if (view.status === 'exited') {
    return [[{ label: '继续引导', command: '/继续引导' }], [{ label: '任务面板', command: '/任务面板' }]];
  }

  return [[{ label: '任务面板 · /任务面板', command: '/任务面板' }]];
}
