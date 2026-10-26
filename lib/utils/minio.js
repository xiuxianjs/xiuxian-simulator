import { getAppConfig } from "./appConfig.js";
import { randomBytes } from "crypto";
import { Client } from "minio";

//#region src/utils/minio.ts
let minioClient = null;
const getMinioClient = () => {
	if (!minioClient) {
		const value = getAppConfig();
		if (!value.minio) return null;
		const { endpoint, port, secure, access_key: accessKey, secret_key: secretKey } = value.minio;
		if (!endpoint || !accessKey || !secretKey) return null;
		minioClient = new Client({
			endPoint: endpoint,
			port,
			useSSL: secure,
			accessKey,
			secretKey
		});
		return minioClient;
	}
	return minioClient;
};
/**
* 获取存储桶名称（单桶模式，所有分类使用同一个桶）
*/
const getBucket = () => {
	const { bucket_name: defaultBucket } = getAppConfig().minio;
	return defaultBucket ?? "xiuxian";
};
/**
* 根据 contentType 推断扩展名，与 bubble 保持一致
*/
const getExtensionFromContentType = (contentType) => {
	const ct = contentType.toLowerCase();
	if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
	if (ct.includes("png")) return "png";
	if (ct.includes("gif")) return "gif";
	if (ct.includes("webp")) return "webp";
	return "bin";
};
/** 已确认存在的存储桶缓存 */
const checkedBuckets = /* @__PURE__ */ new Set();
const bucketChecks = /* @__PURE__ */ new Map();
/**
* 确保存储桶存在（每个桶只检查一次）
*/
const ensureBucket = async (client, bucketName) => {
	if (checkedBuckets.has(bucketName)) return;
	const existing = bucketChecks.get(bucketName);
	if (existing) return existing;
	const pending = Promise.resolve().then(async () => {
		if (!await client.bucketExists(bucketName)) await client.makeBucket(bucketName, "us-east-1");
		checkedBuckets.add(bucketName);
	});
	bucketChecks.set(bucketName, pending);
	try {
		await pending;
	} finally {
		if (bucketChecks.get(bucketName) === pending) bucketChecks.delete(bucketName);
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
const uploadFile = async (category, userId, file, contentType, size) => {
	const client = getMinioClient();
	if (!client) return {
		success: false,
		message: "MinIO 配置不完整，无法上传文件"
	};
	const fileSize = size ?? (Buffer.isBuffer(file) ? file.byteLength : void 0);
	const bucketName = getBucket();
	const ext = getExtensionFromContentType(contentType);
	const objectName = `${category}/${userId}/${Math.floor(Date.now() / 1e3)}_${randomBytes(3).toString("hex")}.${ext}`;
	try {
		await ensureBucket(client, bucketName);
		await client.putObject(bucketName, objectName, file, fileSize, { "Content-Type": contentType });
		const fullPath = `${bucketName}/${objectName}`;
		return {
			success: true,
			path: fullPath,
			url: createMinioURL(fullPath)
		};
	} catch (error) {
		return {
			success: false,
			message: error?.message ?? "文件上传失败"
		};
	}
};
/**
* 上传本地文件到 MinIO（保留旧接口兼容）
*/
const uploadFileToMinio = async (objectName, filePath) => {
	const client = getMinioClient();
	if (!client) return {
		success: false,
		message: "MinIO 配置不完整，无法上传文件"
	};
	const { bucket_name: bucketName } = getAppConfig().minio;
	try {
		await ensureBucket(client, bucketName);
		return {
			success: true,
			etag: await client.fPutObject(bucketName, objectName, filePath)
		};
	} catch (error) {
		return {
			success: false,
			message: error?.message ?? "文件上传失败"
		};
	}
};
/**
* 删除 MinIO 文件
* objectName 格式: {bucket}/{objectName} 或 {objectName}（向后兼容）
*/
const deleteFile = async (objectName) => {
	if (!objectName) return;
	const client = getMinioClient();
	if (!client) return;
	const { bucket, objName } = splitBucketPath(objectName);
	await client.removeObject(bucket, objName);
};
/**
* 从 objectName 拆分桶名和对象名
*/
const splitBucketPath = (objectName) => {
	const defaultBucket = getBucket();
	const slashIdx = objectName.indexOf("/");
	if (slashIdx > 0 && objectName.slice(0, slashIdx) === defaultBucket) return {
		bucket: defaultBucket,
		objName: objectName.slice(slashIdx + 1)
	};
	return {
		bucket: defaultBucket,
		objName: objectName
	};
};
/**
* 获取文件相对路径: {bucket}/{objectName}
*/
const getFileURL = (objectName) => {
	if (!objectName) return "";
	const { bucket, objName } = splitBucketPath(objectName);
	return `${bucket}/${objName}`;
};
/**
* 得到文件的完整下载链接（直连 MinIO）
*/
const createMinioURL = (objectName) => {
	const { endpoint, port, secure } = getAppConfig().minio;
	const protocol = secure ? "https" : "http";
	const portPart = protocol === "http" && port === 80 || protocol === "https" && port === 443 ? "" : `:${port}`;
	const { bucket, objName } = splitBucketPath(objectName);
	return `${protocol}://${endpoint}${portPart}/${bucket}/${objName}`;
};

//#endregion
export { createMinioURL, deleteFile, getFileURL, getMinioClient, uploadFile, uploadFileToMinio };