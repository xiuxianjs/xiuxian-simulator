import { getAppConfig } from './appConfig';

/** 网页入口沿用当前机器人的服务器选择，保留各页面的业务参数。 */
export function createOnlineUrl(path: string): URL {
  const url = new URL(path, 'https://tatian-online.alemonjs.com');

  if (getAppConfig().backend?.channel_mode === true) {
    url.searchParams.set('server', 'channel');
  }

  return url;
}
