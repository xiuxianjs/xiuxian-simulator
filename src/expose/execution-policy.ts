import { Expose, type ExposeProvideConfig } from 'alemonjs';
import { authorizedEvent } from './access';
import { list, object, text } from './schema';

const observations = new WeakSet<object>();
const freshNames = new Set<string>();

export function declareFreshObservation(handler: object): void {
  observations.add(handler);
}
export function bindExecutionPolicies(configs: ExposeProvideConfig[]): void {
  freshNames.clear();
  for (const config of configs) {
    if (config.name !== 'xiuxian.player.v1') {
      continue;
    }
    for (const [name, action] of Object.entries(config.actions)) {
      if (observations.has(action.handler)) {
        freshNames.add(name);
      }
    }
  }
}
export const isFreshObservation = (action: string): boolean => freshNames.has(action);

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
        ...[...new Set(['get_onboarding', ...freshNames])].map(action => ({ action, mode: 'fresh' })),
        { action: 'continue_registration_guide', mode: 'operation', keyField: 'intentId' },
        { action: 'perform_onboarding_action', mode: 'operation', keyField: 'intentId' }
      ]
    })
  })
};
