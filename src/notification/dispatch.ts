import { logger } from 'alemonjs';

type Lane = { name: string; run: () => Promise<void>; running: boolean; pending: boolean; delay: number; timer?: ReturnType<typeof setTimeout> };

/** SSE 负责唤醒；仅失败的队列退避重试，已成功的队列不会被连带重跑。 */
export class NotificationDispatcher {
  private stopped = false;
  private readonly lanes: Lane[];

  constructor(jobs: { name: string; run: () => Promise<void> }[]) {
    this.lanes = jobs.map(job => ({ ...job, running: false, pending: false, delay: 1000 }));
  }

  wake(): void {
    for (const lane of this.lanes) {
      lane.pending = true;
      if (!lane.running && !lane.timer) {
        void this.drain(lane);
      }
    }
  }

  private async drain(lane: Lane): Promise<void> {
    if (this.stopped || lane.running) {
      return;
    }
    lane.running = true;
    lane.pending = false;
    try {
      await lane.run();
      lane.delay = 1000;
    } catch (error) {
      if (!this.stopped) {
        const delay = lane.delay;

        logger.error(`通知队列 ${lane.name} 失败，${delay}ms 后重试`, error);
        lane.delay = Math.min(delay * 2, 30000);
        lane.timer = setTimeout(() => {
          lane.timer = undefined;
          void this.drain(lane);
        }, delay);
        lane.timer.unref?.();
      }
    } finally {
      lane.running = false;
      if (!this.stopped && lane.pending && !lane.timer) {
        void this.drain(lane);
      }
    }
  }

  stop(): void {
    this.stopped = true;
    for (const lane of this.lanes) {
      clearTimeout(lane.timer);
      lane.timer = undefined;
    }
  }
}
