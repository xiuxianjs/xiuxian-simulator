import type { RobotBusinessResult, RobotBusinessOperation } from '../api/bot/robot-business';
import { parseBackendRegistration } from '../api/bot/registration';
import { GUIDE_ACTION_BAR, NEWCOMER_PROLOGUE, newcomerGreeting, guideActionBar } from '../constants/newcomerGuide';
import { parseOnboarding } from '../api/bot/onboarding';
import { object, text } from './schema';

export const onboardingPresentationSchema = object({
  protocol: { type: 'string', enum: ['system-guide.v1'] },
  delivery: { type: 'string', enum: ['pending'] },
  text
});

// The provider returns data only. A Link reply failure must never replay gameplay.
export function onboardingPresentation(value: unknown) {
  const view = parseOnboarding(value);

  if (view.branchMenu) {
    return {
      protocol: 'system-guide.v1',
      delivery: 'pending',
      text: [
        view.title,
        ...view.feedback,
        ...view.branchMenu.lines,
        ...(view.entries ?? []).map(entry => `${entry.label} · ${entry.command}`),
        ...view.branchMenu.items.map(item => `${item.name}（${item.learned ? '已读' : '未读'}）\n${item.description}\n${item.command}`),
        '暂离教学 · /退出引导'
      ].join('\n\n')
    };
  }
  const commands = view.actions.map(action => action.command);

  if (['active', 'soft'].includes(view.status) && !commands.includes('/退出引导')) {
    commands.push('/退出引导');
  }

  return {
    protocol: 'system-guide.v1',
    delivery: 'pending',
    text: [
      view.title,
      ...view.feedback,
      ...view.lines,
      ...(view.entries ?? []).map(entry => `${entry.label} · ${entry.command}`),
      ...(commands.length ? ['可选指令：', ...commands] : [])
    ].join('\n\n')
  };
}

/** All text comes from parsed game receipts; producing it never executes a game action. */
export function gameGuidePresentation(operation: RobotBusinessOperation, response: RobotBusinessResult) {
  const sections: string[] = [];
  const guide = response.middleware.guide;

  if (guide) {
    const p = guide.presentation;

    sections.push(p.title, p.heading, p.text);
    if (p.showActionBar) {
      sections.push(...guideActionBar(guide.action).map(button => `${button.label} · ${button.command}`));
    } else {
      sections.push(...p.advice.map(tip => `${tip.description} · ${tip.command}`), '系统会按实际进度安排后续教学，可发送 /继续引导 查看。');
    }
  } else if (response.branch === 'middleware' || operation.startsWith('onboarding.') || operation.startsWith('guide.')) {
    for (const reply of response.middleware.replies) {
      sections.push(reply.title, reply.heading, reply.text, reply.quote ?? '', ...(reply.rawLines ?? []));
      for (const block of reply.blocks ?? []) {
        sections.push(block.text, ...(block.inlineButtons ?? []).map(button => `${button.label} · ${button.command}`));
      }
      sections.push(...reply.buttons.map(button => `${button.label} · ${button.command}`), ...reply.advice.map(tip => `${tip.description} · ${tip.command}`));
    }
  }
  if (response.success && response.branch === 'business') {
    if (operation === 'account.register') {
      const registration = parseBackendRegistration(response.data);

      sections.push('系统 · 初入仙途');
      if (registration.code === 'OK') {
        sections.push(newcomerGreeting(registration.data.playerName));
        const { spiritRoot, talents } = registration.data;

        if (spiritRoot?.granted) {
          sections.push(`先天灵根：${spiritRoot.title} · 闭关修为+${spiritRoot.bonusPercent}%`);
        }
        if (talents?.granted) {
          sections.push(
            '先天天赋',
            ...talents.talents.map(talent => `【${talent.category}】${talent.name}：${talent.description}${talent.enabled ? '' : '（暂未开启）'}`)
          );
        }
        sections.push(NEWCOMER_PROLOGUE, ...GUIDE_ACTION_BAR.map(button => `${button.label} · ${button.command}`));
      } else if (registration.code === 'EXISTING_USER') {
        sections.push('已有修仙角色，可发送 /我 查看账号信息，或发送 /继续引导 核对当前进度。');
      } else if (registration.code === 'NEED_NAME') {
        sections.push('请先选择道号。');
      } else if (registration.code === 'NEED_GENDER') {
        sections.push(`道号：${registration.data.playerName}。请先选择角色性别。`);
      }
    }
    if (operation.startsWith('onboarding.')) {
      sections.push(onboardingPresentation(response.data).text);
    } else if (response.onboarding) {
      sections.push(onboardingPresentation(response.onboarding).text);
    }
    if (response.onboardingPending) {
      sections.push('系统 · 下一步指引暂时无法读取。请先核对本次操作结果，再发送 /继续引导 查看进度，不要重复提交原操作。');
    }
  }
  const content = sections.filter(Boolean).join('\n\n');

  return content ? { protocol: 'system-guide.v1', delivery: 'pending', text: content } : undefined;
}
