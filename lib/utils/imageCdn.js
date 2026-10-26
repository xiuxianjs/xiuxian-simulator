import { measureTransportStage } from "./transportTiming.js";
import { getFileURL, uploadFile } from "./minio.js";

//#region src/utils/imageCdn.ts
/**
* 使用minio上传图片
*/
const CDN_URL = "https://oss-files.alemonjs.com";
const CDN_URL_IMAGE = "https://oss-files.alemonjs.com/images-proxy";
const IMAGE_CACHE_TTL_SECONDS = 604800;
const IMAGE_CACHE_MAX_ENTRIES = 1024;
const imageCache = /* @__PURE__ */ new Map();
const imageJobs = /* @__PURE__ */ new Map();
function cacheImage(key, value) {
	imageCache.delete(key);
	imageCache.set(key, value);
	while (imageCache.size > IMAGE_CACHE_MAX_ENTRIES) {
		const oldestKey = imageCache.keys().next().value;
		if (oldestKey === void 0) break;
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
const uploadImage = async (category, userId, file, contentType) => {
	const result = await uploadFile(category, userId, file, contentType);
	if (!result.success) return null;
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
const getCdnUrl = (objectName) => {
	const relativePath = getFileURL(objectName);
	return `${CDN_URL}/${relativePath}`;
};
/**
* 根据已有的 objectName 拼接图片优化 CDN 地址（webp压缩）
*/
const getImageCdnUrl = (objectName) => {
	const relativePath = getFileURL(objectName);
	return `${CDN_URL_IMAGE}/${relativePath}`;
};
/**
* 上传游戏图片到 MinIO，返回 CDN 地址
*/
const uploadAppImage = async (file, userId = "xiuxian") => {
	return await uploadImage("xiuxian", userId, file, "image/png");
};
var ImageCache = class ImageCache {
	#key;
	#md5Key;
	constructor(options) {
		this.#key = options.key;
		this.#md5Key = options.md5Key;
	}
	static create(options) {
		return new ImageCache(options);
	}
	getURL() {
		let status = "miss";
		return measureTransportStage(() => `image.cache.${status}`, async () => {
			const cached = await this.readURL();
			if (cached) status = "hit";
			return cached;
		});
	}
	readURL() {
		const imageInfo = imageCache.get(this.#key);
		if (!imageInfo) return Promise.resolve(null);
		if (Date.now() >= imageInfo.expiresAt) {
			imageCache.delete(this.#key);
			return Promise.resolve(null);
		}
		if (this.#md5Key === imageInfo.md5) {
			cacheImage(this.#key, imageInfo);
			return Promise.resolve(imageInfo.url);
		}
		return Promise.resolve(null);
	}
	/** Share identical content; time each caller, including a joined job. Miss time includes render/upload and is not additive. */
	getOrCreate(create) {
		let status = "miss";
		return measureTransportStage(() => `image.cache.${status}`, async () => {
			const cached = await this.readURL();
			if (cached) {
				status = "hit";
				return cached;
			}
			const key = JSON.stringify([this.#key, this.#md5Key]);
			const existing = imageJobs.get(key);
			if (existing) {
				status = "join";
				return existing;
			}
			const pending = Promise.resolve().then(create);
			imageJobs.set(key, pending);
			try {
				return await pending;
			} finally {
				if (imageJobs.get(key) === pending) imageJobs.delete(key);
			}
		});
	}
	uploadAppImage(file) {
		return uploadAppImage(file);
	}
	async uploadImage(options) {
		const info = await this.uploadAppImage(options.img);
		if (!info) return null;
		if (!info.imageUrl) return null;
		cacheImage(this.#key, {
			md5: this.#md5Key,
			url: info.imageUrl,
			expiresAt: Date.now() + IMAGE_CACHE_TTL_SECONDS * 1e3
		});
		return info.imageUrl;
	}
};

//#endregion
export { CDN_URL, CDN_URL_IMAGE, ImageCache, getCdnUrl, getImageCdnUrl, uploadAppImage, uploadImage };