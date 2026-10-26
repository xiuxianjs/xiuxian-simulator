import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";

//#region src/notification/chatContactOutbox.ts
const observationKey = (item) => JSON.stringify([
	item.botId,
	item.kind.startsWith("group") ? "group" : "friend",
	item.kind.startsWith("group") ? item.groupId ?? "" : "",
	["group_allow", "group_block"].includes(item.kind) ? "permission" : ["group_join", "group_exit"].includes(item.kind) ? "presence" : "member",
	[
		"group_join",
		"group_exit",
		"group_allow",
		"group_block"
	].includes(item.kind) ? "" : item.memberId ?? item.openId,
	item.aliasId ? item.openId : ""
]);
const negative = (item) => [
	"removed",
	"group_leave",
	"group_exit",
	"group_block"
].includes(item.kind);
const newerObservation = (a, b) => {
	return a.occurredAt > b.occurredAt || a.occurredAt === b.occurredAt && (negative(a) || !negative(b) && !!a.aliasId);
};
/** Durable transport spool, not a relationship authority. Immutable filenames
* make acknowledgements safe when another process writes to the same volume. */
var ChatContactOutbox = class {
	directory;
	writes = Promise.resolve();
	latest = /* @__PURE__ */ new Map();
	constructor(directory) {
		this.directory = directory;
	}
	put(item) {
		const operation = this.writes.then(async () => {
			const key = observationKey(item);
			const previous = this.latest.get(key);
			if (previous && !newerObservation(item, previous.item)) return;
			await mkdir(this.directory, {
				recursive: true,
				mode: 448
			});
			const path = join(this.directory, `${randomUUID()}.json`);
			const temporary = `${path}.tmp`;
			const file = await open(temporary, "wx", 384);
			try {
				await file.writeFile(JSON.stringify(item));
				await file.sync();
			} finally {
				await file.close();
			}
			await rename(temporary, path);
			const directory = await open(this.directory, "r");
			try {
				await directory.sync();
			} finally {
				await directory.close();
			}
			this.latest.delete(key);
			this.latest.set(key, {
				item,
				path
			});
			while (this.latest.size > 5e3) this.latest.delete(this.latest.keys().next().value);
			if (previous) await rm(previous.path, { force: true });
		});
		this.writes = operation.catch(() => {});
		return operation;
	}
	async batch() {
		await this.writes;
		await mkdir(this.directory, {
			recursive: true,
			mode: 448
		});
		const selected = /* @__PURE__ */ new Map();
		for (const name of (await readdir(this.directory)).filter((name) => name.endsWith(".json")).sort()) {
			const path = join(this.directory, name);
			let item;
			try {
				item = JSON.parse(await readFile(path, "utf8"));
			} catch (error) {
				if (error.code === "ENOENT") continue;
				throw error;
			}
			const key = observationKey(item);
			const previous = selected.get(key);
			if (previous) {
				previous.paths.push(path);
				if (newerObservation(item, previous.item)) previous.item = item;
			} else if (selected.size < 100) selected.set(key, {
				item,
				paths: [path]
			});
		}
		return [...selected.values()];
	}
	async acknowledge(batch) {
		for (const entry of batch) {
			for (const path of entry.paths) await rm(path, { force: true });
			const key = observationKey(entry.item);
			const latest = this.latest.get(key);
			if (latest && entry.paths.includes(latest.path)) this.latest.delete(key);
		}
	}
	async idle() {
		await this.writes;
	}
};

//#endregion
export { ChatContactOutbox, newerObservation, observationKey };