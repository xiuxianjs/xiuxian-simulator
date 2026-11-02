import { Expose } from 'alemonjs';
import { createBackendRequestContext } from '../api/bot/context';
import { fetchBackendRobotIdentity } from '../api/bot/identity';
import { getBackendNewcomerGuide } from '../api/bot/newcomer-guide';
import { authorizedEvent } from './access';
import { boolean, integer, list, object, text } from './schema';

// Flow descriptions are separate from execution. This read never goes through
// the command middleware that can advance the legacy prologue.
export const guidanceFlowActions = {
  get_guidance_state: Expose.action({
    description:
      '开始或恢复修仙AI引导时首先调用。只读身份和序章游标，不注册、不推进剧情、不领奖。不要从角色查询被拦截推断未注册。按返回的流程和动作逐步询问玩家，生成Markdown及无斜杠按钮，不向玩家讲解命令。',
    effect: 'read',
    inputSchema: object({}),
    outputSchema: object({
      protocol: text,
      flow: text,
      step: text,
      accountExists: boolean,
      revision: integer,
      goal: text,
      narrator: text,
      actions: list(object({ id: text, label: text, capability: text }))
    }),
    authorize: (_input, context) => {
      authorizedEvent(context);

      return true;
    },
    handler: async (_input, context) => {
      const event = authorizedEvent(context);
      const request = { ...createBackendRequestContext(event), signal: context.signal };
      const identity = await fetchBackendRobotIdentity(event.UserId, request);
      const base = { protocol: 'plugin-guidance.v1', narrator: '{{guide.name}}' };

      if (identity.account.status === 'unregistered') {
        return {
          ...base,
          flow: 'registration',
          step: 'choose_name',
          accountExists: false,
          revision: 0,
          goal: '询问道号，再询问性别。只有两者都由玩家明确选择后才创建角色；缺失任何一个都不能代选。',
          actions: [
            { id: 'choose_name', label: '选择道号', capability: 'choose_registration_name' },
            { id: 'register', label: '创建角色', capability: 'register_player' }
          ]
        };
      }
      const progress = await getBackendNewcomerGuide(event.UserId, identity.account.playerId, request);

      if (progress.step !== null) {
        return {
          ...base,
          flow: 'prologue',
          step: `prologue_${progress.step}`,
          accountExists: true,
          revision: progress.version,
          goal: '角色已经创建。按玩家选择继续一段序章；查询本状态没有推进剧情。不可再次要求注册。',
          actions: [
            { id: 'continue', label: '继续', capability: 'continue_registration_guide' },
            { id: 'skip', label: '跳过序章', capability: 'skip_registration_guide' }
          ]
        };
      }

      return {
        ...base,
        flow: 'onboarding',
        step: 'inspect_lesson',
        accountExists: true,
        revision: progress.version,
        goal: '序章已不在进行中。查询当前教学状态，按玩家选择继续或自由探索。',
        actions: [
          { id: 'inspect', label: '看看下一步', capability: 'get_onboarding' },
          { id: 'resume', label: '继续教学', capability: 'resume_onboarding' }
        ]
      };
    }
  })
};
