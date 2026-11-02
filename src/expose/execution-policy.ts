import { Expose } from 'alemonjs';
import { authorizedEvent } from './access';
import { list, object, text } from './schema';

export const executionPolicyActions = {
  get_execution_policy: Expose.action<Record<string, never>, unknown>({
    description: '只读静态执行策略。教学状态需每次查询原服务端；序章与教学动作按原intentId重放。不会授权操作，也不替代服务端版本校验与幂等结算。',
    effect: 'read',
    inputSchema: object({}),
    outputSchema: object({
      protocol: { type: 'string', enum: ['plugin-execution-policy.v1'] },
      actions: list(object({ action: text, mode: { type: 'string', enum: ['fresh', 'operation'] }, keyField: text }, ['keyField']))
    }),
    authorize: (_input, context) => {
      authorizedEvent(context);

      return true;
    },
    handler: () => ({
      protocol: 'plugin-execution-policy.v1',
      actions: [
        { action: 'get_onboarding', mode: 'fresh' },
        { action: 'continue_registration_guide', mode: 'operation', keyField: 'intentId' },
        { action: 'perform_onboarding_action', mode: 'operation', keyField: 'intentId' }
      ]
    })
  })
};
