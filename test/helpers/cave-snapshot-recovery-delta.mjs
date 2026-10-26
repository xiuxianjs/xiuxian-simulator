export const caveSnapshotAdvice = () => [
 { text: '刷新失败不代表操作回滚', command: '/灵田' },
 { text: '按原回执核对消耗与收获', command: '/储物袋' }
];
export const hasCaveSnapshotFailure = result => Boolean(result && (!result.overview || result.snapshotError));
