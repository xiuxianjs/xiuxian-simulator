import { logger } from "alemonjs";

//#region src/notification/dispatch.ts
/** SSE 负责唤醒；仅失败的队列退避重试，已成功的队列不会被连带重跑。 */
var NotificationDispatcher = class {
	stopped = false;
	lanes;
	constructor(jobs) {
		this.lanes = jobs.map((job) => ({
			...job,
			running: false,
			pending: false,
			delay: 1e3
		}));
	}
	wake() {
		for (const lane of this.lanes) {
			lane.pending = true;
			if (!lane.running && !lane.timer) this.drain(lane);
		}
	}
	async drain(lane) {
		if (this.stopped || lane.running) return;
		lane.running = true;
		lane.pending = false;
		try {
			await lane.run();
			lane.delay = 1e3;
		} catch (error) {
			if (!this.stopped) {
				const delay = lane.delay;
				logger.error(`通知队列 ${lane.name} 失败，${delay}ms 后重试`, error);
				lane.delay = Math.min(delay * 2, 3e4);
				lane.timer = setTimeout(() => {
					lane.timer = void 0;
					this.drain(lane);
				}, delay);
				lane.timer.unref?.();
			}
		} finally {
			lane.running = false;
			if (!this.stopped && lane.pending && !lane.timer) this.drain(lane);
		}
	}
	stop() {
		this.stopped = true;
		for (const lane of this.lanes) {
			clearTimeout(lane.timer);
			lane.timer = void 0;
		}
	}
};

//#endregion
export { NotificationDispatcher };