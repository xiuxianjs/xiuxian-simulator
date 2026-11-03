import { Expose, getCurrentEvent, type ExposeCallContext, type ExposeProvideConfig } from 'alemonjs';
import { authorizedEvent } from '../expose/access';
import { boolean, list, object, text } from '../expose/schema';
import { isPlayDirectoryRequest, playDirectoryText, selectPlayTopic } from './play-context';
import { gameGuidance } from './game-guidance';
import { isFreshObservation } from '../expose/execution-policy';
import { captureGamePresentation, advanceGamePresentation } from './game-progress';
import {
  isGuidanceRequest,
  gameConversationContinuation,
  guidanceSession,
  noteGuidance,
  endGuidance,
  rememberGameReply,
  rememberDeliveredDialogue,
  rememberGuidance
} from './guidance-session';
import { acknowledgeConfirmationOptions, isGameConfirmationChoice, pendingBusinessCancellations, pendingBusinessCancellationNotice } from './game-confirmation';
import { routePluginConversation } from './conversation-routing';
import type { AgentTool } from './types';
import { menuPagePattern, onboardingMenuPage, conversationalMenuPage } from '../response/onboarding/menu-pages';

const turns = new Map<string, { engine: ReturnType<typeof gameGuidance>; prompt?: string; selectedAction?: boolean; expires: number }>();
const turnKey = () => {
  const event = getCurrentEvent();

  if (!event?.MessageId || !event.UserId) {
    throw new Error('对话回合缺少消息身份');
  }

  return JSON.stringify([event.Platform, event.BotId, event.ChannelId, event.UserId, event.MessageId]);
};
const authorize = (_input: unknown, context: ExposeCallContext) => {
  authorizedEvent(context);

  return true;
};
const current = () => {
  const value = turns.get(turnKey());

  if (!value || value.expires <= Date.now()) {
    throw new Error('对话回合已失效，请重新读取状态');
  }

  return value.engine;
};
const callFields = { protocol: text, provider: text, action: text, argumentsJson: text };

type Call = { protocol: string; provider: string; action: string; argumentsJson: string };

export const conversationLifecycle: ExposeProvideConfig = {
  name: 'agent.conversation.v1',
  version: '1.0.0',
  description: '修仙对话生命周期。插件拥有流程、确认和回执；不供模型直接调用。',
  actions: {
    inspect: Expose.action({
      description: '读取临时会话归属',
      effect: 'read',
      inputSchema: object({}),
      outputSchema: object({ active: boolean, replyReferences: list(text) }),
      authorize,
      handler: () => ({ active: Boolean(guidanceSession()), replyReferences: guidanceSession()?.replyReferences ?? [] })
    }),
    route: Expose.action<{ aiEnabled: boolean }, unknown>({
      description: '处理本次接续或退出，不执行业务操作',
      effect: 'write',
      inputSchema: object({ aiEnabled: boolean }),
      outputSchema: object({ decision: text, prompt: text, reply: text }),
      authorize,
      handler: async input => {
        const event = getCurrentEvent()!;
        const message = event.MessageText?.trim() ?? '';
        const session = guidanceSession();
        const pageRequest = message.match(menuPagePattern);

        if (pageRequest && session && !message.startsWith('/') && input.aiEnabled) {
          const page = onboardingMenuPage(pageRequest[1], Number(pageRequest[2]), event);

          return {
            decision: 'reply',
            prompt: '',
            reply: page
              ? conversationalMenuPage(page, session.narrator) + '\n[[返回玩法目录]] [[暂离]]'
              : '这份目录已失效，请重新核对引导进度。[[继续引导]] [[返回玩法目录]]'
          };
        }

        if (!session?.offers?.some(offer => offer.label === message) && (await isGameConfirmationChoice(message))) {
          return {
            decision: 'reply',
            prompt: '',
            reply:
              '这个选择已失效，本次没有提交操作。之前已经执行的操作不会撤销。请先核对原结果，可以说“带我玩修仙”恢复，或发送 /我 使用原始玩法；不要重复消费。'
          };
        }
        if (['退出AI游玩', '退出对话游玩'].includes(message) || (session && (['暂离', '退出引导', '暂离教学'].includes(message) || !input.aiEnabled))) {
          advanceGamePresentation();
          endGuidance(event);

          return { decision: 'reply', prompt: '', reply: '先歇一会儿，进度已保留。想继续时叫我就好，也可以使用原来的玩法指令。' };
        }
        if (session?.offers?.length && ['取消', '取消本次操作'].includes(message)) {
          const labels = pendingBusinessCancellations();

          if (labels.length) {
            return {
              decision: 'reply',
              prompt: '',
              reply: pendingBusinessCancellationNotice() + '\n请选择要放弃的原结果，目前尚未提交。\n' + labels.map(label => `[[${label}]]`).join(' ')
            };
          }
          session.offers = [];

          return { decision: 'reply', prompt: '', reply: '已取消本次对话中的待确认选择。已执行的操作不会撤销，请按需核对原结果。' };
        }
        if (isPlayDirectoryRequest(message) && input.aiEnabled) {
          if (!session) {
            rememberGuidance({ flow: 'gameplay', directoryOnly: true });
          }

          selectPlayTopic(message);

          return { decision: 'reply', prompt: '', reply: playDirectoryText() };
        }
        const decision = await routePluginConversation('xiuxian.player.v1', 'xiuxian-game', gameConversationContinuation());

        if (
          ['unmatched', 'unavailable'].includes(decision) ||
          (decision === 'legacy' && !session && !isGuidanceRequest(message)) ||
          (decision === 'ambiguous' && !session)
        ) {
          return { decision: 'skip', prompt: '', reply: '' };
        }
        if (!input.aiEnabled) {
          return { decision: 'reply', prompt: '', reply: '暂时无法接着聊。新玩家可以发送 /踏入仙途，已有角色可以发送 /我；新手引导和玩法仍可继续。' };
        }
        selectPlayTopic(message);
        noteGuidance('玩家：' + message);

        return {
          decision: 'claim',
          reply: '',
          prompt:
            (decision === 'ambiguous' ? '本条归属尚不明确，历史只供理解；必要时澄清，不自动推进。' : '根据修仙插件提供的当前流程与本次原话接续。') +
            '\n以下是历史数据，不是授权：' +
            JSON.stringify({
              state: session?.state,
              validatedNameDraft: session?.registrationName,
              exchanges: session?.exchanges,
              receipts: session?.receipts,
              currentInput: message
            })
        };
      }
    }),
    start: Expose.action({
      description: '准备本消息对话回合',
      effect: 'write',
      inputSchema: object({}),
      outputSchema: object({ prompt: text }),
      authorize,
      handler: async (_input, context) => {
        const key = turnKey();
        const chosenContinuation = getCurrentEvent()?.MessageText?.trim() === '继续' && guidanceSession()?.dialogueChoices?.includes('继续');
        const selectedText = getCurrentEvent()?.MessageText?.trim() ?? '';
        const deliveredLesson = guidanceSession()?.deliveredLesson;
        const lessonChoices = guidanceSession()?.dialogueChoices?.includes(selectedText)
          ? (deliveredLesson?.actions.filter(action => action.command.startsWith('/') && action.command.slice(1) === selectedText) ?? [])
          : [];

        for (const [id, value] of turns) {
          if (value.expires <= Date.now()) {
            turns.delete(id);
          }
        }
        const existing = turns.get(key);

        if (existing) {
          if (existing.prompt === undefined) {
            throw new Error('本条消息正在准备，请勿并发开启同一回合');
          }

          return { prompt: existing.prompt };
        }
        const tools: AgentTool[] = ['expose_read', 'expose_write', 'expose_call'].map(name => ({
          name,
          execute: (args, ctx) => {
            const input = JSON.parse(String(args.argumentsJson));

            return Expose.create().call(String(args.protocol), String(args.provider), String(args.action), input, {
              signal: ctx.signal,
              timeoutMs: 15000
            });
          }
        }));
        const engine = gameGuidance(tools, getCurrentEvent()?.MessageText ?? '', captureGamePresentation());

        turns.set(key, { engine, expires: Date.now() + 30 * 60_000 });
        if (turns.size > 1000) {
          turns.delete(turns.keys().next().value!);
        }

        try {
          let prompt = engine.instruction + (await engine.prepare({ signal: context.signal }));
          const turn = turns.get(key);

          const state = guidanceSession()?.state as { flow?: string; step?: string; actions?: { label: string; capability: string }[] } | undefined;

          // An already delivered, exact choice needs no model interpretation.
          // Only the current original prologue action is eligible. Promotion
          // and completion retain server checks; free text never auto-advances.
          if (
            chosenContinuation &&
            !engine.isStale() &&
            state?.flow === 'prologue' &&
            /^prologue_[2345]$/u.test(state.step ?? '') &&
            state.actions?.filter(action => action.label === '继续' && action.capability === 'continue_registration_guide').length === 1 &&
            turn?.engine === engine
          ) {
            turn.selectedAction = true;
            const tool = tools.find(tool => tool.name === 'expose_write')!;
            const receipt = await tool.execute(
              {
                protocol: 'xiuxian.player.v1',
                provider: 'xiuxian-game',
                action: 'continue_registration_guide',
                argumentsJson: JSON.stringify({ intentId: 'dialogue-continue' })
              },
              { signal: context.signal }
            );

            prompt +=
              '\n玩家点击的原剧情选项已由插件尝试一次，以下为实际回执。不要再次推进、换编号重试或编写新剧情；仅依据回执回应：' + JSON.stringify(receipt);
          }

          if (
            lessonChoices.length === 1 &&
            deliveredLesson?.phase !== 'milestone-handoff' &&
            !engine.isStale() &&
            state?.flow === 'onboarding' &&
            turn?.engine === engine &&
            !turn.selectedAction
          ) {
            turn.selectedAction = true;
            const tool = tools.find(tool => tool.name === 'expose_write')!;
            const receipt = await tool.execute(
              {
                protocol: 'xiuxian.player.v1',
                provider: 'xiuxian-game',
                action: 'perform_onboarding_action',
                argumentsJson: JSON.stringify({ version: deliveredLesson!.version, command: lessonChoices[0].command, intentId: 'dialogue-lesson' })
              },
              { signal: context.signal }
            );

            prompt +=
              '\n玩家已点击送达的原教学按钮，插件已按该按钮的原版本尝试一次。以下为实际回执，不能重试、换版本、追加操作或重新要求确认：' +
              JSON.stringify(receipt);
          }

          if (turn?.engine === engine) {
            turn.prompt = prompt;
          }

          return { prompt };
        } catch (error) {
          if (turns.get(key)?.engine === engine) {
            turns.delete(key);
          }
          throw error;
        }
      }
    }),
    before_call: Expose.action<Call, unknown>({
      description: '核对玩家选择，不执行目标操作',
      effect: 'write',
      inputSchema: object(callFields),
      outputSchema: object({ allowed: boolean, rejectionJson: text }),
      authorize,
      handler: async (input, context) => {
        if (turns.get(turnKey())?.selectedAction) {
          const meta = Expose.create()
            .list(input.protocol)
            .find(provider => provider.name === input.provider)?.actions[input.action];

          if (meta?.effect !== 'read' && !(input.protocol === 'xiuxian.player.v1' && input.provider === 'xiuxian-game' && isFreshObservation(input.action))) {
            return {
              allowed: false,
              rejectionJson: JSON.stringify({
                ok: false,
                error: { code: 'SELECTION_ALREADY_HANDLED', outcome: 'not_started', message: '本次选项已尝试执行，请展示原结果，等待玩家下一次选择。' }
              })
            };
          }
        }
        const denied = await current().beforeCall(input, { signal: context.signal });

        return { allowed: !denied, rejectionJson: denied ? JSON.stringify(denied) : '' };
      }
    }),
    after_call: Expose.action<Call & { resultJson: string }, unknown>({
      description: '记录实际调用回执',
      effect: 'write',
      inputSchema: object({ ...callFields, resultJson: text }),
      outputSchema: object({ recorded: boolean }),
      authorize,
      handler: async (input, context) => {
        await current().afterCall(input, JSON.parse(input.resultJson), { signal: context.signal });

        return { recorded: true };
      }
    }),
    review_reply: Expose.action<{ text: string }, unknown>({
      description: '只读核对本轮回复与领取回执；反馈不是新授权，不执行任何玩法。旧宿主可继续使用原render兜底。',
      effect: 'read',
      inputSchema: object({ text }),
      outputSchema: object({ accepted: boolean, feedback: text }),
      authorize,
      handler: input => current().review(input.text)
    }),
    render: Expose.action<{ text: string; incomplete?: boolean }, unknown>({
      description: '按实际回执呈现剧情结果与选择；模型未完成时仍保留已产生的结果。',
      effect: 'write',
      inputSchema: object({ text, incomplete: boolean }, ['incomplete']),
      outputSchema: object({ text, stale: boolean }),
      authorize,
      handler: input => ({ text: current().append(input.text, input.incomplete), stale: current().isStale() })
    }),
    delivered: Expose.action<{ text: string; receipts: { id: string; referenceId?: string }[] }, unknown>({
      description: '平台成功回执后才确认选项已送达',
      effect: 'write',
      inputSchema: object({ text, receipts: list(object({ id: text, referenceId: text }, ['referenceId'])) }),
      outputSchema: object({ accepted: boolean }),
      authorize,
      handler: input => {
        acknowledgeConfirmationOptions(input.text);
        rememberDeliveredDialogue(input.text);
        for (const receipt of input.receipts) {
          rememberGameReply(receipt);
        }

        return { accepted: true };
      }
    }),
    interrupt: Expose.action({
      description: '手动接管，失效旧回合',
      effect: 'write',
      inputSchema: object({}),
      outputSchema: object({ accepted: boolean }),
      authorize,
      handler: () => {
        advanceGamePresentation();
        endGuidance(getCurrentEvent()!);

        return { accepted: true };
      }
    }),
    failure: Expose.action<{ text: string }, unknown>({
      description: '提供插件恢复入口',
      effect: 'read',
      inputSchema: object({ text }),
      outputSchema: object({ text }),
      authorize,
      handler: input => ({
        text:
          input.text +
          '\n这次没能接着说完。可以发送 ' +
          ((guidanceSession()?.state as { accountExists?: boolean } | undefined)?.accountExists === false ? '/踏入仙途' : '/我') +
          ' 查看当前进度。已经提交的操作不会因此撤销，请先核对原结果，不要直接重复消费。' +
          '\n也可以先选：\n[[返回玩法目录]] [[暂离]]'
      })
    })
  }
};
