import { measureTransportStage } from './transportTiming';
/**
 * 面板图片缓存渲染：以 md5(data) 为内容指纹写入客户端媒体缓存，
 * 同一指纹复用 CDN URL，避免重复 Puppeteer 渲染。
 */
import { ImageCache } from '@src/utils/imageCdn';
import { renderComponentIsHtmlToBuffer } from 'jsxp';
import { createHash } from 'node:crypto';

/** 计算 props 的 md5 指纹 */
function computeFingerprint(data: unknown): string {
  return createHash('md5')
    .update(JSON.stringify(data ?? null))
    .digest('hex');
}

/**
 * 缓存渲染：
 * - 命中缓存返回 CDN URL（string）
 * - 未命中则渲染并上传；若 CDN 上传失败则退回返回 Buffer，消息仍可发送
 * - 两者都失败返回 null
 *
 * keyPrefix 建议使用 "panel:<route>"（例如 "panel:battle:leaderboard"），
 * 缓存键会在其后追加内容指纹，天然内容可寻址，无需手工管理失效。
 */
export function renderCachedImage<P>(Component: any, data: P, keyPrefix: string): Promise<Buffer | string | null> {
  const fingerprint = computeFingerprint(data);
  const cache = ImageCache.create({ key: `${keyPrefix}:${fingerprint}`, md5Key: fingerprint });

  return cache.getOrCreate(async () => {
    const buf = await measureTransportStage('image.render', () => renderComponentIsHtmlToBuffer(Component, { data }));

    if (!buf || typeof buf === 'boolean') {
      return null;
    }
    const url = await measureTransportStage('image.upload', () => cache.uploadImage({ img: buf }));

    return url ?? buf;
  });
}
