/**
 * 主题外观类型定义
 *
 * 仅存放纯类型，供视图/应用层与数据库模型共享；
 * 真实的表结构与写入逻辑由 Go 服务端负责（`user_themes` 表）；客户端只消费该结构。
 */

/** 主题来源：system=称号/运营赠予，custom=玩家自定义 */
export type ThemeSource = 'system' | 'custom';

/** 墨色模式：ink=宣纸水墨（默认），dark=深底浅字 */
export type InkMode = 'ink' | 'dark';

/**
 * 主题配置结构（存入 config 字段的 JSON）
 */
export type ThemeConfig = {
  /** 面板背景图 URL 集（随机取一张） */
  backgrounds?: string[];
  /** 头部横幅图 URL */
  banner?: string;
  /** 墨色模式：一键切换文字/边框/卡片整套风格
   *  ink=宣纸水墨（默认），dark=深底浅字 */
  inkMode?: InkMode;
  /** 背景遮罩色，控制背景图透出深浅
   *  CSS rgba，例如 "rgba(232,218,192,0.52)"（浅）或 "rgba(20,15,10,0.65)"（暗） */
  overlayColor?: string;
  /** 头部环境光：英雄头部区渐变色调 */
  headerColor?: string;
  /** 主强调色（头像边框、境界标签、战力框、装饰线、进度条高亮）
   *  CSS color，例如 "#c22a12"
   *  引擎自动派生 cinnabarBg / cinnabarBorder */
  accentColor?: string;
  /** 冷调辅色（战斗面板防御/抗暴等冷色数值、装饰云纹）
   *  CSS color，默认 "#526F7A" */
  secondaryColor?: string;
  /** 主要文字色（道号、属性数值）；优先级高于 inkColor */
  textPrimaryColor?: string;
  /** 次要文字色（标签名）；浅色层自动派生；优先级高于 inkColor */
  textSecondaryColor?: string;
  /** 卡片底色（半透明背景基色） */
  cardColor?: string;
  /** 边框色（自动派生深浅三层） */
  borderColor?: string;
  /** 墨色基调（批量设置主/次/浅三层文字色；textPrimaryColor / textSecondaryColor 优先级更高） */
  inkColor?: string;
};
