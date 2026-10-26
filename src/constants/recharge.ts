/**
 * 货币换算比例
 * 1元 = 10道晶
 */
export const YUAN_TO_LINGRU_RATIO = 10;

/**
 * 月卡配置
 */
export const MONTH_CARD_MAX_TOTAL_DAYS = 180; // **[重要]** 180天上限

/**
 * 新人狂欢活动窗口天数（注册后14天内都算新人期）
 */
export const NEWCOMER_EVENT_DAYS = 14;

/**
 * 新人狂欢内容天数（签到+任务共7天）
 * 第1-6天：只能当天签到；第7天(终极奖励)：第6-14天任意一天可签
 */
export const NEWCOMER_CONTENT_DAYS = 7;
export const NEWCOMER_CONTENT_MONEY_DAYS = 14; // 充值奖励天数（第1-14天每天都有）
export const NEWCOMER_DAILY_THRESHOLD = 3000; // 每日最低充值(30元)

/**
 * 周周返利
 */
export const WEEKLY_REBATE_MIN_ACCOUNT_DAYS = 15; // 账号最低天数
export const WEEKLY_REBATE_DAILY_THRESHOLD = 3000; // 每日最低充值(30元)
export const WEEKLY_REBATE_FULL_ATTENDANCE_DAY = 8; // 满勤大奖的 day 索引
