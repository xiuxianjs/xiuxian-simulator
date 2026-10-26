export type PeiyuanCancelResult =
  { outcome: 'cancelled'; pendingJson: string; message: string } | { outcome: 'not_pending'; pendingJson: null; message: string };
