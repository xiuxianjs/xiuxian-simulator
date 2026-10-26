import { getAppConfig } from '@src/utils/appConfig';
import { randomBytes } from 'crypto';
import { Client } from 'minio';
import { Readable } from 'stream';

/**
 * 文件分类（作为对象路径前缀使用）
 */
export type FileCategory = 'xiuxian';

// MinIO 客户端单例
let minioClient: Client | null = null;

export const getMinioClient = () => {
  if (!minioClient) {
    const value = getAppConfig();

    if (!value.minio) {
      return null;
    }
    const { endpoint, port, secure, access_key: accessKey, secret_key: secretKey } = value.minio;

    // 如果没有配置，直接返回null
    if (!endpoint || !accessKey || !secretKey) {
      return null;
    }

    minioClient = new Client({
      endPoint: endpoint,
      port,
      useSSL: secure,
      accessKey: accessKey,
      secretKey: secretKey
    });

    return minioClient;
  }

  return minioClient;
};

/**
 * 获取存储桶名称（单桶模式，所有分类使用同一个桶）
 */
const getBucket = (): string => {
  const { bucket_name: defaultBucket } = getAppConfig().minio;

  return defaultBucket ?? 'xiuxian';
};

/**
 * 根据 contentType 推断扩展名，与 bubble 保持一致
 */
const getExtensionFromContentType = (contentType: string): string => {
  const ct = contentType.toLowerCase();

  if (ct.includes('jpeg') || ct.includes('jpg')) {
    return 'jpg';
  }
  if (ct.includes('png')) {
    return 'png';
  }
  if (ct.includes('gif')) {
    return 'gif';
  }
  if (ct.includes('webp')) {
    return 'webp';
  }

  return 'bin';
};

/** 已确认存在的存储桶缓存 */
const checkedBuckets = new Set<string>();
const bucketChecks = new Map<string, Promise<void>>();

/**
 * 确保存储桶存在（每个桶只检查一次）
 */
const ensureBucket = async (client: Client, bucketName: string) => {
  if (checkedBuckets.has(bucketName)) {
    return;
  }
  const existing = bucketChecks.get(bucketName);

  if (existing) {
    return existing;
  }
  const pending = Promise.resolve().then(async () => {
    const exists = await client.bucketExists(bucketName);

    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1');
    }
    checkedBuckets.add(bucketName);
  });

  bucketChecks.set(bucketName, pending);
  try {
    await pending;
  } finally {
    if (bucketChecks.get(bucketName) === pending) {
      bucketChecks.delete(bucketName);
    }
  }
};

/**
 * 通用文件上传
 * 路径格式: {bucket}/{category}/{userId}/{timestamp}_{rand}.{ext}
 *
 * @param category 文件分类
 * @param userId   用户标识（字符串）
 * @param file     文件内容（Buffer 或 Readable）
 * @param contentType MIME 类型
 * @param size     文件大小（字节），Buffer 时可省略
 * @returns objectName 格式: {bucket}/{category}/{userId}/{timestamp}_{rand}.{ext}
 */
export const uploadFile = async (
  category: FileCategory,
  userId: string,
  file: Buffer | Readable,
  contentType: string,
  size?: number
): Promise<{ success: true; path: string; url: string } | { success: false; message: string }> => {
  const client = getMinioClient();

  if (!client) {
    return { success: false, message: 'MinIO 配置不完整，无法上传文件' };
  }

  const fileSize = size ?? (Buffer.isBuffer(file) ? file.byteLength : undefined);
  const bucketName = getBucket();
  const ext = getExtensionFromContentType(contentType);
  const timestamp = Math.floor(Date.now() / 1000);
  const rand = randomBytes(3).toString('hex');
  const objectName = `${category}/${userId}/${timestamp}_${rand}.${ext}`;

  try {
    await ensureBucket(client, bucketName);
    await client.putObject(bucketName, objectName, file, fileSize, { 'Content-Type': contentType });

    const fullPath = `${bucketName}/${objectName}`;

    return {
      success: true,
      path: fullPath,
      url: createMinioURL(fullPath)
    };
  } catch (error: any) {
    return { success: false, message: error?.message ?? '文件上传失败' };
  }
};

/**
 * 上传本地文件到 MinIO（保留旧接口兼容）
 */
export const uploadFileToMinio = async (objectName: string, filePath: string) => {
  const client = getMinioClient();

  if (!client) {
    return {
      success: false,
      message: 'MinIO 配置不完整，无法上传文件'
    };
  }

  const value = getAppConfig();
  const { bucket_name: bucketName } = value.minio;

  try {
    await ensureBucket(client, bucketName);
    const res = await client.fPutObject(bucketName, objectName, filePath);

    return {
      success: true,
      etag: res
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message ?? '文件上传失败'
    };
  }
};

/**
 * 删除 MinIO 文件
 * objectName 格式: {bucket}/{objectName} 或 {objectName}（向后兼容）
 */
export const deleteFile = async (objectName: string): Promise<void> => {
  if (!objectName) {
    return;
  }

  const client = getMinioClient();

  if (!client) {
    return;
  }

  const { bucket, objName } = splitBucketPath(objectName);

  await client.removeObject(bucket, objName);
};

/**
 * 从 objectName 拆分桶名和对象名
 */
const splitBucketPath = (objectName: string): { bucket: string; objName: string } => {
  const defaultBucket = getBucket();
  const slashIdx = objectName.indexOf('/');

  if (slashIdx > 0 && objectName.slice(0, slashIdx) === defaultBucket) {
    return { bucket: defaultBucket, objName: objectName.slice(slashIdx + 1) };
  }

  return { bucket: defaultBucket, objName: objectName };
};

/**
 * 获取文件相对路径: {bucket}/{objectName}
 */
export const getFileURL = (objectName: string): string => {
  if (!objectName) {
    return '';
  }
  const { bucket, objName } = splitBucketPath(objectName);

  return `${bucket}/${objName}`;
};

/**
 * 得到文件的完整下载链接（直连 MinIO）
 */
export const createMinioURL = (objectName: string) => {
  const { endpoint, port, secure } = getAppConfig().minio;
  const protocol = secure ? 'https' : 'http';
  const portPart = (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443) ? '' : `:${port}`;

  const { bucket, objName } = splitBucketPath(objectName);

  return `${protocol}://${endpoint}${portPart}/${bucket}/${objName}`;
};
