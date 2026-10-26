import { resolve } from "node:path";
import { readFile, stat } from "node:fs/promises";

//#region src/utils/staticFileBytes.ts
/** One static asset per instance; cache bytes, never platform media receipts. */
var StaticFileBytesCache = class {
	path;
	cached;
	pending;
	constructor(path) {
		this.path = resolve(path);
	}
	async readBytes() {
		return await readFile(this.path);
	}
	async signature() {
		const value = await stat(this.path, { bigint: true });
		if (!value.isFile()) throw new Error("Static image must be a regular file");
		return [
			this.path,
			value.dev,
			value.ino,
			value.size,
			value.mtimeNs,
			value.ctimeNs,
			value.mode
		].join(":");
	}
	async load() {
		let signature;
		try {
			signature = await this.signature();
		} catch (error) {
			this.cached = void 0;
			throw error;
		}
		if (this.cached?.signature === signature) return this.cached.bytes;
		this.cached = void 0;
		if (this.pending?.signature === signature) return await this.pending.job;
		const owner = Symbol();
		const job = (async () => {
			const bytes = await this.readBytes();
			if (await this.signature() === signature && this.pending?.owner === owner) this.cached = {
				signature,
				bytes
			};
			return bytes;
		})();
		this.pending = {
			signature,
			job,
			owner
		};
		try {
			return await job;
		} finally {
			if (this.pending?.job === job) this.pending = void 0;
		}
	}
};

//#endregion
export { StaticFileBytesCache };