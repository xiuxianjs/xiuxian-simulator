/**
 * 气泡展示层统一出口。
 *
 * 批次 0 只提供词表与组件，不改变任何页面行为；
 * 后续批次按页面类型逐个迁移到 `buildBubble` / `presets`。
 */
export * from './tokens';
export * from './format';
export * from './sections';
export * from './bubble';
export * from './presets';
