/**
 * 使用minio上传图片
 */
import { getFileURL, uploadFile, type FileCategory } from '@src/utils/minio';
import { Readable } from 'stream';
import { measureTransportStage } from './transportTiming';

// 文件地址
export const CDN_URL = 'https://oss-files.alemonjs.com';

// 图片专用地址（启用webp压缩，动图除外）
export const CDN_URL_IMAGE = 'https://oss-files.alemonjs.com/images-proxy';

//  图片缓存过期时间（秒），7天，超过这个时间会重新上传图片并更新缓存；如果图片内容不变，md5Key不变，则直接使用缓存的URL，无需重新上传
const IMAGE_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const IMAGE_CACHE_MAX_ENTRIES = 1024;

type CachedImage = { md5: string; url: string; expiresAt: number };

// 图片 URL 是客户端展示缓存，不参与游戏状态；限制条目数避免常驻进程无限增长。
const imageCache = new Map<string, CachedImage>();
const imageJobs = new Map<string, Promise<unknown>>();

function cacheImage(key: string, value: CachedImage): void {
  imageCache.delete(key);
  imageCache.set(key, value);

  while (imageCache.size > IMAGE_CACHE_MAX_ENTRIES) {
    const oldestKey = imageCache.keys().next().value;

    if (oldestKey === undefined) {
      break;
    }
    imageCache.delete(oldestKey);
  }
}

/**
 * 上传图片到 MinIO 并返回 CDN 地址
 *
 * @param category 分类（avatars, covers, emojis 等）
 * @param userId   用户标识
 * @param file     图片内容（Buffer 或 Readable）
 * @param size     文件大小（字节）
 * @param contentType MIME 类型（须为 image/*）
 * @returns CDN 完整地址或 null
 */
export const uploadImage = async (
  category: FileCategory,
  userId: string,
  file: Buffer | Readable,
  contentType: string
): Promise<{ cdnUrl: string; imageUrl: string; path: string } | null> => {
  const result = await uploadFile(category, userId, file, contentType);

  if (!result.success) {
    return null;
  }

  const relativePath = getFileURL(result.path);

  return {
    cdnUrl: `${CDN_URL}/${relativePath}`,
    imageUrl: `${CDN_URL_IMAGE}/${relativePath}`,
    path: result.path
  };
};

/**
 * 根据已有的 objectName 拼接 CDN 地址
 */
export const getCdnUrl = (objectName: string): string => {
  const relativePath = getFileURL(objectName);

  return `${CDN_URL}/${relativePath}`;
};

/**
 * 根据已有的 objectName 拼接图片优化 CDN 地址（webp压缩）
 */
export const getImageCdnUrl = (objectName: string): string => {
  const relativePath = getFileURL(objectName);

  return `${CDN_URL_IMAGE}/${relativePath}`;
};

/**
 * 上传游戏图片到 MinIO，返回 CDN 地址
 */
export const uploadAppImage = async (file: Buffer | Readable, userId = 'xiuxian') => {
  // 存储桶 xiuxian
  // 目录地址 xiuxian/{userId}/{timestamp}.png
  return await uploadImage('xiuxian', userId, file, 'image/png');
};

export class ImageCache {
  #key: string;
  #md5Key: string;
  constructor(options: { key: string; md5Key: string }) {
    this.#key = options.key;
    this.#md5Key = options.md5Key;
  }

  static create(options: { key: string; md5Key: string }) {
    return new ImageCache(options);
  }

  getURL(): Promise<string | null> {
    let status = 'miss';

    return measureTransportStage(
      () => `image.cache.${status}`,
      async () => {
        const cached = await this.readURL();

        if (cached) {
          status = 'hit';
        }

        return cached;
      }
    );
  }

  private readURL(): Promise<string | null> {
    const imageInfo = imageCache.get(this.#key);

    if (!imageInfo) {
      return Promise.resolve(null);
    }

    if (Date.now() >= imageInfo.expiresAt) {
      imageCache.delete(this.#key);

      return Promise.resolve(null);
    }

    // 内容指纹相同才复用；命中只更新容量淘汰顺序，不延长 7 天有效期。
    if (this.#md5Key === imageInfo.md5) {
      cacheImage(this.#key, imageInfo);

      return Promise.resolve(imageInfo.url);
    }

    return Promise.resolve(null);
  }

  /** Share identical content; time each caller, including a joined job. Miss time includes render/upload and is not additive. */
  getOrCreate<T>(create: () => Promise<T>): Promise<T | string> {
    let status = 'miss';

    return measureTransportStage(
      () => `image.cache.${status}`,
      async () => {
        const cached = await this.readURL();

        if (cached) {
          status = 'hit';

          return cached;
        }
        const key = JSON.stringify([this.#key, this.#md5Key]);
        const existing = imageJobs.get(key);

        if (existing) {
          status = 'join';

          return existing as Promise<T | string>;
        }
        const pending = Promise.resolve().then(create);

        imageJobs.set(key, pending);
        try {
          return await pending;
        } finally {
          if (imageJobs.get(key) === pending) {
            imageJobs.delete(key);
          }
        }
      }
    );
  }

  protected uploadAppImage(file: Buffer | Readable) {
    return uploadAppImage(file);
  }

  async uploadImage(options: { img: Buffer | Readable }) {
    const info = await this.uploadAppImage(options.img);

    if (!info) {
      return null;
    }
    if (!info.imageUrl) {
      return null;
    }

    cacheImage(this.#key, {
      md5: this.#md5Key,
      url: info.imageUrl,
      expiresAt: Date.now() + IMAGE_CACHE_TTL_SECONDS * 1000
    });

    return info.imageUrl;
  }
}
