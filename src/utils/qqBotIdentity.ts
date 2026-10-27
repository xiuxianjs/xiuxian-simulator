import { getConfigValue } from 'alemonjs';

/** 与 QQ 适配器共用配置来源；每次读取以接收扫码后的配置更新。 */
export function getQQBotAppIds(): string[] {
  const values = getConfigValue() ?? {};
  const config = { ...values['qq-bot'], ...values['@alemonjs/qq-bot'] };
  const ids = config.bots && Object.keys(config.bots).length ? Object.keys(config.bots) : [String(config.app_id ?? '').trim()];

  return ids.filter(id => /^[1-9]\d*$/.test(id));
}

export function getQQBotAppId(): string {
  const ids = getQQBotAppIds();

  const values = getConfigValue() ?? {};
  const config = { ...values['qq-bot'], ...values['@alemonjs/qq-bot'] };
  const defaultBot = String(config.default_bot ?? '').trim();

  return ids.length === 1 ? ids[0] : ids.includes(defaultBot) ? defaultBot : '';
}
