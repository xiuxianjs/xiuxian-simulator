import { getAppConfig } from './appConfig';

type PolicyEvent = { name: string; Notice?: { type?: string } };

/** 只控制修仙包的事件处理，不修改框架或其他插件的事件配置。 */
export function isGameEventEnabled(event: PolicyEvent): boolean {
  const policy = getAppConfig().events;

  if (policy === undefined) {
    return true;
  }
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    return false;
  }
  const { allow, deny } = policy;
  const valid = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim().length > 0);

  // 错误配置不应意外放开本包事件；后续插件仍由调用方 next/pass 放行。
  if ((allow !== undefined && !valid(allow)) || (deny !== undefined && !valid(deny))) {
    return false;
  }
  const matches = (rules: string[]) => rules.some(rule => {
      const key = rule.trim();

      return key === event.name || (event.Notice?.type !== undefined && key === `${event.name}:${event.Notice.type}`);
    });

  return !(deny && matches(deny)) && (allow === undefined || matches(allow));
}
