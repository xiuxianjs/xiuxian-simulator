import { getConfig } from 'alemonjs';
import packageInfo from '../../package.json' with { type: 'json' };

/** 平台适配配置不依赖游戏数据库和缓存配置。 */
export const getAppConfig = () => {
  const values = getConfig().value ?? {};

  return values[packageInfo.name] ?? {};
};
