/**
 * 统一游戏反馈文案
 *
 * 规范:
 * - 统一使用「你」而非「您」
 * - 末尾不加句号
 * - 「」用于包裹游戏内名称
 * - （）用于注释限制条件
 */

// ===================== 通用消息 =====================

export const MSG_COMMON = {
  /** 用户不存在 */
  USER_NOT_FOUND: '用户不存在',
  /** 操作失败 */
  OPERATION_FAILED: '操作失败，请稍后再试',
  /** 操作冲突 */
  OPERATION_CONFLICT: '操作冲突，请稍后重试',
  /** 操作太频繁 */
  TOO_FREQUENT: '操作太频繁，请稍后再试',
  /** 内容不能为空 */
  CONTENT_EMPTY: '内容不能为空',
  /** 内容包含不适当的内容 */
  CONTENT_INAPPROPRIATE: '内容包含不适当的内容',
  /** 权限不足 */
  PERMISSION_DENIED: '权限不足',
  /** 余额不足 */
  BALANCE_INSUFFICIENT: '余额不足',
  /** 精力不足 */
  MENTAL_INSUFFICIENT: '精力不足',
  /** 元力不足 */
  HP_INSUFFICIENT: '元力不足',
  /** 请先踏入仙途 */
  NOT_IN_XIUXIAN: '请先踏入仙途',
  /** 内容长度不能超过 N 个字符 */
  contentTooLong: (max: number) => `内容长度不能超过${max}个字符`,
  /** 内容长度不能少于 N 个字符 */
  contentTooShort: (min: number) => `内容长度不能少于${min}个字符`,
  /** 请输入有意义的内容 */
  CONTENT_NO_MEANING: '请输入有意义的内容，不能全是数字或特殊字符',
  /** 无效的用户ID */
  INVALID_USER_ID: '无效的用户ID',
  /** 系统繁忙 */
  SYSTEM_BUSY: '系统繁忙，请稍后再试',
  /** 操作繁忙 */
  OPERATION_BUSY: '操作繁忙，请稍后再试',
  /** 未找到用户信息 */
  USER_INFO_NOT_FOUND: '未找到用户信息',
  /** 玩家信息异常 */
  PLAYER_DATA_ERROR: '玩家信息异常',
  /** 境界不足 */
  REALM_INSUFFICIENT: '境界不足'
} as const;

// ===================== 宗门消息 =====================

export const MSG_GUILD = {
  // ---------- 成员状态 ----------
  /** 你还未加入任何宗门 */
  NOT_JOINED: '你还未加入任何宗门',
  /** 宗门不存在 */
  NOT_EXISTS: '宗门不存在',
  /** 宗门不存在或已解散 */
  NOT_EXISTS_OR_DISSOLVED: '宗门不存在或已解散',
  /** 你已经加入了宗门，不能创建新宗门 */
  ALREADY_JOINED_CANNOT_CREATE: '你已经加入了宗门，不能创建新宗门',
  /** 你已经加入了宗门，不能申请加入其他宗门 */
  ALREADY_JOINED_CANNOT_APPLY: '你已经加入了宗门，不能申请加入其他宗门',
  /** 你刚退出宗门，24小时内无法使用宗门相关功能 */
  COOLDOWN_24H: '你刚退出宗门，24小时内无法使用宗门相关功能',
  /** 该玩家在宗门冷却期内，无法通过申请 */
  PLAYER_IN_COOLDOWN: '该玩家在宗门冷却期内，无法通过申请',
  /** 该玩家已加入其他宗门，无法通过申请 */
  PLAYER_IN_OTHER_GUILD: '该玩家已加入其他宗门，无法通过申请',

  // ---------- 申请 ----------
  /** 你已经申请过该宗门，请等待审核 */
  ALREADY_APPLIED: '你已经申请过该宗门，请等待审核',
  /** 你的待审核申请已达上限 */
  APPLICATION_LIMIT: '你的待审核申请已达上限（最多5个），请先取消部分申请',
  /** 申请记录不存在或已处理 */
  APPLICATION_NOT_FOUND: '申请记录不存在或已处理',
  /** 该申请已被处理 */
  APPLICATION_ALREADY_PROCESSED: '该申请已被处理',
  /** 未找到该用户的待审核申请 */
  PENDING_APPLICATION_NOT_FOUND: '未找到该用户的待审核申请',
  /** 宗门人数已满 */
  guildFull: (current: number, max: number) => `宗门人数已满（${current}/${max}），无法通过申请`,
  /** 宗门已不存在，无法通过申请 */
  GUILD_DISSOLVED_CANNOT_APPROVE: '宗门已不存在，无法通过申请',

  // ---------- 简介/公告/精华 ----------
  /** 宗门简介不能超过30字 */
  INTRO_TOO_LONG: '宗门简介不能超过30字',
  /** 宗门简介不能为空 */
  INTRO_EMPTY: '宗门简介不能为空',
  /** 简介内容包含不适当的内容 */
  INTRO_INAPPROPRIATE: '简介内容包含不适当的内容',
  /** 宗门公告不能超过50字 */
  NOTICE_TOO_LONG: '宗门公告不能超过50字',
  /** 宗门公告不能为空 */
  NOTICE_EMPTY: '宗门公告不能为空',
  /** 公告内容包含不适当的内容 */
  NOTICE_INAPPROPRIATE: '公告内容包含不适当的内容',
  /** 暂无公告 */
  NO_NOTICE: '暂无公告',
  /** 精华内容不能超过50字 */
  ESSENCE_TOO_LONG: '精华内容不能超过50字',
  /** 精华内容不能为空 */
  ESSENCE_EMPTY: '精华内容不能为空',
  /** 精华内容包含不适当的内容 */
  ESSENCE_INAPPROPRIATE: '精华内容包含不适当的内容',
  /** 宗门精华已达上限 */
  ESSENCE_LIMIT: '宗门精华已达上限（20个），请先移除旧的精华再添加',
  /** 精华不存在 */
  ESSENCE_NOT_FOUND: '精华不存在',
  /** 只能移除本宗门的精华 */
  ESSENCE_NOT_OWN: '只能移除本宗门的精华',

  // ---------- 等级/升级 ----------
  /** 宗门等级已达到最高级 */
  LEVEL_MAX: '宗门等级已达到最高级',
  /** 宗门等级配置不存在 */
  LEVEL_CONFIG_NOT_FOUND: '宗门等级配置不存在，请联系运营',
  /** 当前宗门等级信息不存在 */
  LEVEL_INFO_NOT_FOUND: '当前宗门等级信息不存在',
  /** 灵脉等级已达到最高级 */
  VEIN_LEVEL_MAX: '灵脉等级已达到最高级',
  /** 灵脉未开放 */
  VEIN_NOT_OPEN: '宗门灵脉未开放，请提升宗门等级以解锁',
  /** 灵脉功能未解锁 */
  VEIN_NOT_UNLOCKED: '当前宗门等级未解锁灵脉功能',
  /** 灵脉等级达到宗门等级上限 */
  veinLevelCap: (cap: number) => `灵脉等级已达到当前宗门等级上限(${cap}级)`,
  /** 商店等级已达到最高级 */
  SHOP_LEVEL_MAX: '商店等级已达到最高级',
  /** 商店功能未解锁 */
  SHOP_NOT_UNLOCKED: '当前宗门等级未解锁商店功能',
  /** 商店等级达到宗门等级上限 */
  shopLevelCap: (cap: number) => `商店等级已达到当前宗门等级上限(${cap}级)`,
  /** 宗门资源不足 */
  resourceInsufficient: (resources: string) => `宗门资源不足：${resources}`,

  // ---------- 权限 ----------
  /** 只有宗主才能执行此操作 */
  ONLY_LEADER: '只有宗主才能执行此操作',
  /** 只有宗主才能设置最低境界 */
  ONLY_LEADER_REALM: '只有宗主才能设置最低境界',
  /** 只有宗主才能解散宗门 */
  ONLY_LEADER_DISSOLVE: '只有宗主才能解散宗门',
  /** 只有宗主才能请假 */
  ONLY_LEADER_LEAVE: '只有宗主才能请假',
  /** 只有副宗主及以上才能执行此操作 */
  ONLY_VICE_OR_ABOVE: '只有副宗主及以上才能执行此操作',
  /** 只有长老及以上才能执行此操作 */
  ONLY_ELDER_OR_ABOVE: '只有长老及以上才能执行此操作',
  /** 只有宗主和副宗主才能任命职位 */
  ONLY_LEADER_VICE_APPOINT: '只有宗主和副宗主才能任命职位',
  /** 副宗主只能任命长老和弟子 */
  VICE_APPOINT_LIMIT: '副宗主只能任命长老和弟子',
  /** 你没有踢人权限 */
  NO_KICK_PERMISSION: '你没有踢人权限',
  /** 你没有权限任命此职位 */
  NO_APPOINT_PERMISSION: '你没有权限任命此职位',
  /** 你没有审核权限 */
  NO_REVIEW_PERMISSION: '你没有审核权限，仅长老及以上职位可以审核申请',
  /** 不能踢出宗主 */
  CANNOT_KICK_LEADER: '不能踢出宗主',
  /** 不能踢出自己 */
  CANNOT_KICK_SELF: '不能踢出自己',
  /** 不能任命宗主职位 */
  CANNOT_APPOINT_LEADER: '不能任命宗主职位',
  /** 你的职位无权踢出该成员 */
  KICK_RANK_INSUFFICIENT: '你的职位无权踢出该成员',
  /** 缺少目标职位信息 */
  TARGET_POSITION_MISSING: '缺少目标职位信息',
  /** 未知的权限操作 */
  UNKNOWN_PERMISSION: '未知的权限操作',
  /** 检查权限失败 */
  PERMISSION_CHECK_FAILED: '检查权限失败',
  /** 只有宗主才能改名 */
  ONLY_LEADER_RENAME: '只有宗主才能改名',

  // ---------- 成员管理 ----------
  /** 目标职位不存在 */
  POSITION_NOT_FOUND: '目标职位不存在',
  /** 宗门内没有其他成员可以继任宗主 */
  NO_SUCCESSOR: '宗门内没有其他成员可以继任宗主',
  /** 宗门内没有其他成员，无法指定代理人 */
  NO_DEPUTY: '宗门内没有其他成员，无法指定代理人',
  /** 未找到宗门成员信息 */
  MEMBER_NOT_FOUND: '未找到宗门成员信息',
  /** 未找到宗主 */
  LEADER_NOT_FOUND: '未找到宗主',
  /** 未找到宗主信息 */
  LEADER_INFO_NOT_FOUND: '未找到宗主信息',
  /** 未找到宗门信息 */
  GUILD_INFO_NOT_FOUND: '未找到宗门信息',
  /** 目标成员不在同一宗门 */
  TARGET_NOT_IN_GUILD: '目标成员不在同一宗门',
  /** 目标成员未加入任何宗门 */
  TARGET_NOT_IN_ANY_GUILD: '目标成员未加入任何宗门',
  /** 目标玩家不在你的宗门中 */
  TARGET_NOT_IN_YOUR_GUILD: '目标玩家不在你的宗门中',
  /** 宗主职位配置错误 */
  LEADER_ROLE_CONFIG_ERROR: '宗主职位配置错误',
  /** 宗门职位配置错误 */
  ROLE_CONFIG_ERROR: '宗门职位配置错误',
  /** 你已经是弟子，无需卸任 */
  ALREADY_DISCIPLE: '你已经是弟子，无需卸任',

  // ---------- 签到 ----------
  /** 你今天已经签到过了 */
  ALREADY_CHECKED_IN: '你今天已经签到过了',

  // ---------- 俸禄 ----------
  /** 当前职位暂无俸禄 */
  STIPEND_NO_SALARY: '当前职位暂无俸禄',
  /** 你这周已经领取过俸禄了 */
  STIPEND_ALREADY_CLAIMED: '你这周已经领取过俸禄了',
  /** 本周活跃度未达标 */
  stipendActivityInsufficient: (threshold: number) => `本周活跃度未达${threshold}，暂无法领取俸禄`,

  // ---------- 弹劾 ----------
  /** 今日已有成员弹劾过宗主 */
  IMPEACH_DAILY_LIMIT: '今日已有成员弹劾过宗主，每天全宗门只能弹劾一次',
  /** 宗主7天内仍活跃 */
  IMPEACH_LEADER_ACTIVE: '宗主7天内仍活跃，暂不能进行弹劾',

  // ---------- 商店 ----------
  /** 宗门商店未开放 */
  SHOP_NOT_OPEN: '宗门商店未开放，请提升宗门等级以解锁',
  /** 宗门商店未初始化 */
  SHOP_NOT_INITIALIZED: '宗门商店未初始化',
  /** 商店暂无商品 */
  SHOP_NO_ITEMS: '商店暂无商品，请宗主或副宗主刷新商店',
  /** 商店数据异常 */
  SHOP_DATA_ERROR: '商店数据异常，请宗主或副宗主刷新商店',
  /** 宗门数据异常 */
  GUILD_DATA_ERROR: '宗门数据异常',
  /** 今日刷新次数已用完 */
  SHOP_REFRESH_LIMIT: '今日刷新次数已用完（每日最多3次）',
  /** 已兑换该商品 */
  SHOP_ALREADY_EXCHANGED: '已兑换该商品，刷新商店后可再次兑换',
  /** 兑换处理中 */
  SHOP_EXCHANGE_BUSY: '兑换处理中，请稍后再试',
  /** 贡献点不足 */
  shopContributionInsufficient: (required: number, current: number) => `贡献点不足，需要${required}点，当前拥有${current}点`,
  /** 商品编号无效 */
  shopInvalidIndex: (max: number) => `商品编号无效，请输入1-${max}之间的数字`,
  /** 刷新商店资源不足 */
  shopRefreshInsufficient: (cost: number, current: number) => `刷新商店需要${cost}宗门灵石，当前灵池不足（${current}/${cost}）`,

  // ---------- 大比 ----------
  /** 宗门未报名本届大比 */
  COMPETITION_NOT_REGISTERED: '宗门未报名本届大比',
  /** 已报名，无需重复报名 */
  COMPETITION_ALREADY_REGISTERED: '已报名，无需重复报名',
  /** 参赛队伍人数已满 */
  COMPETITION_TEAM_FULL: '参赛队伍人数已满（最多6人）',
  /** 挑战次数已用完 */
  COMPETITION_CHALLENGE_LIMIT: '挑战次数已用完（每期最多10次）',
  /** 不允许重复挑战同一宗门 */
  COMPETITION_NO_DUPLICATE: '不允许重复挑战同一宗门',
  /** 本宗门尚未添加参赛成员 */
  COMPETITION_NO_MEMBERS: '本宗门尚未添加参赛成员，请先添加后再挑战',
  /** 暂无未领取的宗门大比奖励 */
  COMPETITION_NO_REWARD: '暂无未领取的宗门大比奖励',
  /** 目标宗门未报名或不存在 */
  COMPETITION_TARGET_NOT_FOUND: '目标宗门未报名或不存在',
  /** 当前不在报名阶段 */
  COMPETITION_NOT_SIGNUP_PHASE: '当前不在报名阶段，无法报名',
  /** 当前不在淘汰赛阶段 */
  COMPETITION_NOT_BATTLE_PHASE: '当前不在淘汰赛阶段，无法挑战',
  /** 本宗门未报名本届大比 */
  COMPETITION_SELF_NOT_REGISTERED: '本宗门未报名本届大比',
  /** 该成员已在参赛队伍中 */
  COMPETITION_MEMBER_ALREADY_IN: '该成员已在参赛队伍中',
  /** 宗门等级不足2级 */
  COMPETITION_LEVEL_INSUFFICIENT: '宗门等级不足2级，无法报名',
  /** 位置无效 */
  COMPETITION_INVALID_POSITION: '位置无效，请输入1-6之间的数字',
  /** 位置已被占用 */
  competitionPositionOccupied: (pos: number) => `位置${pos}已被占用`,
  /** 位置没有成员 */
  competitionPositionEmpty: (pos: number) => `位置${pos}没有成员`,
  /** 原位置与新位置相同 */
  COMPETITION_SAME_POSITION: '原位置与新位置相同',
  /** 目标成员不在本宗门 */
  COMPETITION_TARGET_NOT_IN_GUILD: '目标成员不在本宗门',

  // ---------- 押注 ----------
  /** 赔率尚未生成 */
  BET_ODDS_NOT_READY: '赔率尚未生成，请稍后重试',
  /** 你还未押注 */
  BET_NOT_PLACED: '你还未押注，请先使用押注指令',
  /** 结算中 */
  BET_SETTLING: '结算中，请稍后重试',
  /** 当前不在开盘/晋级赛阶段 */
  BET_NOT_IN_PHASE: '当前不在开盘/晋级赛阶段',
  /** 当前不在押注时间范围内 */
  BET_NOT_IN_TIME: '当前不在押注时间范围内',
  /** 本届已押注过宗门 */
  BET_ALREADY_PLACED: '本届已押注过宗门，请使用追投指令',
  /** 该宗门不在晋级赛名单中 */
  BET_GUILD_NOT_IN_LIST: '该宗门不在晋级赛名单中',
  /** 原押注宗门已不在本届晋级赛中 */
  BET_ORIGINAL_GUILD_OUT: '原押注宗门已不在本届晋级赛中',
  /** 数量必须大于0 */
  BET_AMOUNT_INVALID: '数量必须大于0',
  /** 赔率刷新繁忙 */
  BET_REFRESH_BUSY: '赔率刷新繁忙，请稍后重试',
  /** 晋级宗门不足 */
  BET_NOT_ENOUGH_GUILDS: '晋级宗门不足4个，不开启开盘',
  /** 单届押注总额上限 */
  betTotalLimit: (max: number) => `单届押注总额上限为${max}灵石`,
  /** 单届押注总额上限（含已押注） */
  betTotalLimitWithCurrent: (max: number, current: number) => `单届押注总额上限为${max}灵石，你已押注${current}`,

  // ---------- 活跃度 ----------
  /** 你尚未加入宗门 */
  ACTIVITY_NOT_JOINED: '你尚未加入宗门',
  /** 未找到该里程碑配置 */
  MILESTONE_NOT_FOUND: '未找到该里程碑配置',
  /** 该奖励已领取 */
  REWARD_ALREADY_CLAIMED: '该奖励已领取',
  /** 活跃度不足 */
  activityInsufficient: (current: number, required: number) => `活跃度不足，当前：${current}，需要：${required}`,

  // ---------- 红包 ----------
  /** 该红包已过期 */
  RED_PACKET_EXPIRED: '该红包已过期，无法领取',

  // ---------- 境界要求 ----------
  /** 请输入境界名称 */
  REALM_INPUT_REQUIRED: '请输入境界名称',
  /** 未找到匹配的境界 */
  REALM_NOT_FOUND: '未找到匹配的境界',
  /** 指定的境界不存在 */
  REALM_NOT_EXISTS: '指定的境界不存在',
  /** 搜索境界失败 */
  REALM_SEARCH_FAILED: '搜索境界失败'
} as const;

// ===================== 装备消息 =====================

export const MSG_EQUIPMENT = {
  /** 未找到该装备 */
  NOT_FOUND: '未找到该装备',
  /** 未找到该装备或装备已被装备 */
  NOT_FOUND_OR_EQUIPPED: '未找到该装备或装备已被装备',
  /** 未找到该装备或装备已在使用中 */
  NOT_FOUND_OR_IN_USE: '未找到该装备或装备已在使用中',
  /** 装备不存在或已被删除 */
  NOT_EXISTS_OR_DELETED: '装备不存在或已被删除',
  /** 装备不存在或不属于你 */
  NOT_YOURS: '装备不存在或不属于你',
  /** 未找到该装备类型 */
  TYPE_NOT_FOUND: '未找到该装备类型',
  /** 暂无装备类型数据 */
  NO_TYPE_DATA: '暂无装备类型数据',
  /** 境界不足，无法装备该品级的装备 */
  REALM_INSUFFICIENT: '境界不足，无法装备该品级的装备',
  /** 境界不足，无法使用该品级的天工工具 */
  REALM_INSUFFICIENT_CRAFT: '境界不足，无法使用该品级的天工工具',
  /** 已装备的装备无法上架 */
  EQUIPPED_CANNOT_LIST: '已装备的装备无法上架，请先卸下',
  /** 未找到指定类型的装备 */
  typeNotFound: (typeName: string) => `未找到${typeName}类型的装备`,
  /** 装备类型不存在 */
  typeNotExists: (typeName: string) => `装备类型"${typeName}"不存在`,
  /** 该装备属于天工工具 */
  CRAFT_EQUIP_USE_REPLACE: '该物品属于天工工具，请使用 /替换 指令切换',
  /** 该装备不是天工工具 */
  NOT_CRAFT_EQUIP: '该物品不是天工工具，请使用 /装备 指令',
  /** 装备失败 */
  EQUIP_FAILED: '装备失败，请稍后重试',
  /** 卸下装备失败 */
  UNEQUIP_FAILED: '卸下装备失败，请稍后重试',
  /** 替换失败 */
  REPLACE_FAILED: '替换失败，请稍后重试',
  /** 无效的装备ID */
  INVALID_EQUIP_ID: '无效的装备ID',
  /** 无效的装备实例ID */
  INVALID_INSTANCE_ID: '无效的装备实例ID',
  /** 创建数量必须大于0 */
  CREATE_AMOUNT_INVALID: '创建数量必须大于0',
  /** 请先卸下装备再删除 */
  UNEQUIP_BEFORE_DELETE: '请先卸下装备再删除',
  /** 一键装备失败 */
  AUTO_EQUIP_FAILED: '一键装备失败，请稍后重试',
  /** 请先卸下装备再分解 */
  UNEQUIP_BEFORE_DECOMPOSE: '请先卸下装备再分解',
  /** 该装备已锁定，无法分解 */
  LOCKED_CANNOT_DECOMPOSE: '该装备已锁定，无法分解。请先解锁',
  /** 分解失败 */
  DECOMPOSE_FAILED: '分解失败，请稍后再试',
  /** 没有可分解的装备 */
  NO_DECOMPOSABLE: '没有可分解的装备（需未装备、未锁定）'
} as const;

// ===================== 物品消息 =====================

export const MSG_ITEM = {
  /** 物品不存在 */
  NOT_FOUND: '物品不存在',
  /** 物品不存在或不属于你 */
  NOT_YOURS: '物品不存在或不属于你',
  /** 物品不存在或已被删除 */
  NOT_EXISTS_OR_DELETED: '物品不存在或已被删除',
  /** 物品模板不存在 */
  TEMPLATE_NOT_FOUND: '物品模板不存在',
  /** 物品列表为空 */
  LIST_EMPTY: '物品列表为空',
  /** 物品ID列表为空 */
  ID_LIST_EMPTY: '物品ID列表为空',
  /** 没有有效的物品ID */
  NO_VALID_ID: '没有有效的物品ID',
  /** 物品已用完 */
  USED_UP: '物品已用完',
  /** 背包中不存在该物品 */
  NOT_IN_BAG: '背包中不存在该物品',
  /** 背包中不存在该装备 */
  NOT_IN_BAG_EQUIP: '背包中不存在该装备',
  /** 背包中不存在该功法 */
  NOT_IN_BAG_SKILL: '背包中不存在该功法',
  /** 该分类下没有物品 */
  CATEGORY_EMPTY: '该分类下没有物品',
  /** 没有可锁定的物品 */
  NO_LOCKABLE_ITEMS: '没有可锁定的物品',
  /** 没有可解锁的物品 */
  NO_UNLOCKABLE_ITEMS: '没有可解锁的物品',
  /** 没有可锁定的装备 */
  NO_LOCKABLE_EQUIP: '没有可锁定的装备',
  /** 没有可解锁的装备 */
  NO_UNLOCKABLE_EQUIP: '没有可解锁的装备',
  /** 没有可锁定的天工工具 */
  NO_LOCKABLE_CRAFT_EQUIP: '没有可锁定的天工工具',
  /** 没有可解锁的天工工具 */
  NO_UNLOCKABLE_CRAFT_EQUIP: '没有可解锁的天工工具',
  /** 背包中没有指定名称的物品 */
  notInBagNamed: (name: string) => `背包中没有「${name}」`,
  /** 数量不足 */
  quantityInsufficient: (name: string, quantity: number) => `【${name}】数量不足（拥有 ${quantity}）`,
  /** 无效的物品ID */
  INVALID_ITEM_ID: '无效的物品ID',
  /** 物品数据异常 */
  DATA_ERROR: '物品数据异常',
  /** 物品已锁定 */
  LOCKED: '物品已锁定',
  /** 物品未锁定 */
  NOT_LOCKED: '物品未锁定',
  /** 变更数量不能为0 */
  AMOUNT_CANNOT_ZERO: '变更数量不能为0',
  /** 需要的数量必须大于0 */
  AMOUNT_MUST_POSITIVE: '需要的数量必须大于0',
  /** 该物品已锁定，无法上架 */
  LOCKED_CANNOT_LIST: '该物品已锁定，无法上架',
  /** 该物品不允许交易 */
  NOT_TRADABLE: '该物品不允许交易'
} as const;

// ===================== 功法消息 =====================

export const MSG_SKILL = {
  /** 该功法已经学习过了 */
  ALREADY_LEARNED: '该功法已经学习过了',
  /** 功法不存在或不可分解 */
  NOT_DECOMPOSABLE: '功法不存在或不可分解',
  /** 储物袋中没有功法 */
  NO_SKILLS_IN_BAG: '储物袋中没有功法',
  /** 没有使用中的功法 */
  NO_EQUIPPED_SKILL: '没有使用中的功法，请先学习并装备功法',
  /** 该功法所有属性已达到上限 */
  ALL_ATTRIBUTES_MAX: '该功法所有属性已达到上限，无法继续升级',
  /** 该技能不存在 */
  SKILL_NOT_EXISTS: '该技能不存在',
  /** 功法不存在或已被删除 */
  NOT_FOUND_OR_DELETED: '功法不存在或已被删除',
  /** 该功法已被锁定，无法学习 */
  LOCKED_CANNOT_LEARN: '该功法已被锁定，无法学习',
  /** 该功法已被锁定，无法分解 */
  LOCKED_CANNOT_DECOMPOSE: '该功法已被锁定，无法分解',
  /** 经验道具不足 */
  EXP_ITEM_INSUFFICIENT: '经验道具不足',
  /** 功法不存在或未学习 */
  NOT_LEARNED: '功法不存在或未学习',
  /** 该功法无法升级 */
  CANNOT_UPGRADE: '该功法无法升级',
  /** 该功法已在使用中 */
  ALREADY_IN_USE: '该功法已在使用中'
} as const;

// ===================== 道侣消息 =====================

export const MSG_COMPANION = {
  /** 你们还不是好友，请先结交 */
  NOT_FRIEND: '你们还不是好友，请先结交',
  /** 没有待处理的道侣申请 */
  NO_PENDING_APPLICATION: '没有待处理的道侣申请',
  /** 你当前没有道侣 */
  NO_COMPANION: '你当前没有道侣',
  /** 你当前没有道侣，无法双修 */
  NO_COMPANION_DUAL: '你当前没有道侣，无法双修',
  /** 该道侣申请已过期 */
  APPLICATION_EXPIRED: '该道侣申请已过期',
  /** 不能与自己结为道侣 */
  CANNOT_PROPOSE_SELF: '不能与自己结为道侣',
  /** 无效的誓约道具 */
  INVALID_VOW_ITEM: '无效的誓约道具',
  /** 你已有道侣 */
  ALREADY_HAS_COMPANION: '你已有道侣，请先解除当前道侣关系',
  /** 对方已有道侣 */
  TARGET_HAS_COMPANION: '对方已有道侣',
  /** 你已向对方发送过道侣申请 */
  ALREADY_PROPOSED: '你已向对方发送过道侣申请，请等待回应',
  /** 该申请缺少誓约道具信息 */
  APPLICATION_MISSING_VOW: '该申请缺少誓约道具信息，请让对方重新发起申请',
  /** 双修失败 */
  DUAL_CULTIVATION_FAILED: '双修失败，请稍后再试',
  /** 不能给自己赠送礼物 */
  CANNOT_GIFT_SELF: '不能给自己赠送礼物',
  /** 对方不是你的好友 */
  TARGET_NOT_FRIEND: '对方不是你的好友',
  /** 好友关系异常 */
  FRIEND_DATA_ERROR: '好友关系异常',
  /** 赠送失败 */
  GIFT_FAILED: '赠送失败，请稍后再试',
  /** 未找到名为 X 的修士 */
  proposerNotFound: (name: string) => `未找到名为「${name}」的修士`,
  /** 没有来自 X 的道侣申请 */
  noApplicationFrom: (name: string) => `没有来自「${name}」的道侣申请`,
  /** 未找到礼物 X */
  giftNotFound: (name: string) => `未找到礼物「${name}」`,
  /** 背包中没有 X */
  giftNotInBag: (name: string) => `背包中没有「${name}」`,
  /** 道侣任务已改为自动发放 */
  TASK_AUTO_CLAIM_HINT: '道侣任务奖励已改为自动发放，完成活动即可获得同心值'
} as const;

// ===================== 师徒消息 =====================

export const MSG_MASTER = {
  APPLY_USAGE: '使用方法：拜师 <道号或ID>',
  ACCEPT_USAGE: '使用方法：同意拜师 <徒弟UID>',
  GRADUATE_APPLY_USAGE: '使用方法：申请出师',
  GRADUATE_ACCEPT_USAGE: '使用方法：同意出师 <徒弟UID>',
  TEACH_USAGE: '使用方法：传功 <徒弟UID>',
  BLESS_USAGE: '使用方法：赐福 <徒弟UID>',
  GIFT_USAGE: '使用方法：赐丹 <徒弟UID> [培元丹|筑基丹]',
  EXPEL_USAGE: '使用方法：逐出师门 <徒弟UID>',
  NO_PENDING_APPLICATION: '暂无待处理的拜师申请',
  NO_PENDING_GRADUATION: '暂无待处理的出师申请',
  NO_MASTER_RELATION: '你当前还未建立师承关系',
  NO_DISCIPLE_RELATION: '对方不是你当前正在培养的徒弟',
  NO_GRADUATION_PROPOSAL: '没有来自该徒弟的出师申请',
  CANNOT_SELF: '不能拜自己为师',
  DISCIPLE_REALM_LOW: '炼气二层及以上方可拜师',
  MASTER_REALM_LOW: '筑基初期及以上方可收徒',
  ALREADY_HAS_MASTER: '你当前已有师父，不能重复拜师',
  ALREADY_GRADUATED: '你已正式出师，徒弟身份已结束，不可再次拜师',
  PAIR_ALREADY_BOUND: '你与对方已有师承关系，无需重复拜师',
  COMPANION_CONFLICT: '道侣双方不可建立师徒关系',
  TEACH_DAILY_LIMIT: '今日传功次数已用尽，每日最多传功3次',
  BLESS_DAILY_LIMIT: '今日赐福次数已用尽，每日最多赐福2次',
  GIFT_DAILY_LIMIT: '今日已向该徒弟赐过丹，每对师徒每日仅结算1次赐丹互动',
  BLESS_ITEM_MISSING: '赐福需要消耗1个元力丹',
  GIFT_ITEM_MISSING: '丹药不足，赐丹暂支持消耗培元丹×2或筑基丹×1',
  DISCIPLE_REALM_TOO_HIGH: '对方已至元婴期，当前不再需要传功、赐福或赐丹扶持',
  GRADUATION_PENDING_EXISTS: '你已提交出师申请，请等待师父确认',
  GRADUATION_RELATION_TOO_SHORT: '师徒时长不足5天，暂时无法申请出师',
  GRADUATION_REALM_LOW: '达到金丹初期后方可申请出师',
  GRADUATION_ACTIVE_DAYS_LOW: '有效活跃天数不足5天，暂时无法申请出师',
  GRADUATION_INTERACTION_LOW: '累计有效互动不足15次，暂时无法申请出师',
  GRADUATION_BREAKTHROUGH_MISSING: '尚未完成冲丹阶段结算，暂时无法申请出师',
  GRADUATED_ALREADY: '该师徒关系已出师，无需重复操作',
  REBEL_SUCCESS: '你已叛离当前师门，师承履历已保留',
  EXPEL_SUCCESS: '你已将该徒弟逐出师门，师承履历已保留'
} as const;

// ===================== 好友消息 =====================

export const MSG_FRIEND = {
  /** 不能添加自己为好友 */
  CANNOT_ADD_SELF: '不能添加自己为好友',
  /** 不能拉黑自己 */
  CANNOT_BLOCK_SELF: '不能拉黑自己',
  /** 不能对自己进行操作 */
  CANNOT_OPERATE_SELF: '不能对自己进行操作',
  /** 你们已经是好友了 */
  ALREADY_FRIEND: '你们已经是好友了',
  /** 无法向该用户发送结交申请 */
  CANNOT_SEND_REQUEST: '无法向该用户发送结交申请',
  /** 对方暂时无法添加好友 */
  TARGET_CANNOT_ADD: '对方暂时无法添加好友',
  /** 该申请已处理或已过期 */
  REQUEST_PROCESSED: '该申请已处理或已过期',
  /** 对方好友数量已达上限 */
  TARGET_FRIEND_LIMIT: '对方好友数量已达上限',
  /** 对方待处理申请过多 */
  TARGET_REQUEST_LIMIT: '对方待处理申请过多，请稍后再试',
  /** 发送申请失败 */
  SEND_FAILED: '发送申请失败，请稍后再试',
  /** 删除好友失败 */
  DELETE_FAILED: '删除好友失败，请稍后再试',
  /** 该用户不存在 */
  USER_NOT_EXISTS: '该用户不存在',
  /** 对方已关闭好友申请 */
  TARGET_CLOSED_REQUEST: '对方已关闭好友申请',
  /** 你已拉黑对方 */
  BLOCKED_BY_YOU: '你已拉黑对方，请先取消拉黑',
  /** 已发送过结交申请 */
  ALREADY_SENT: '已发送过结交申请，请等待对方处理',
  /** 申请不存在 */
  APPLICATION_NOT_FOUND: '申请不存在',
  /** 该申请已过期 */
  APPLICATION_EXPIRED: '该申请已过期',
  /** 对方不是你的好友 */
  NOT_YOUR_FRIEND: '对方不是你的好友',
  /** 对方是你的道侣 */
  IS_COMPANION: '对方是你的道侣，请先解除道侣关系后再删除好友',
  /** 该用户已在黑名单中 */
  ALREADY_BLOCKED: '该用户已在黑名单中',
  /** 该用户不在黑名单中 */
  NOT_IN_BLOCKLIST: '该用户不在黑名单中'
} as const;

// ===================== 炼丹消息 =====================

export const MSG_ALCHEMY = {
  /** 你还不是炼丹师 */
  NOT_ALCHEMIST: '你还不是炼丹师，请先加入炼丹师职业',
  /** 你已经是炼丹师了 */
  ALREADY_ALCHEMIST: '你已经是炼丹师了',
  /** 未找到指引进度 */
  GUIDE_NOT_FOUND: '未找到指引进度，请先使用 /加入炼丹师 开始指引',
  /** 丹方不存在 */
  RECIPE_NOT_FOUND: '丹方不存在',
  /** 没有待开始的炼丹任务 */
  NO_PENDING_TASK: '没有待开始的炼丹任务',
  /** 没有进行中的融臣 */
  NO_ACTIVE_FUSION: '没有进行中的融臣',
  /** 没有待凝丹的任务 */
  NO_PENDING_CONDENSE: '没有待凝丹的任务',
  /** 没有进行中的炼丹任务 */
  NO_ACTIVE_TASK: '没有进行中的炼丹任务',
  /** 炼丹会话已过期 */
  SESSION_EXPIRED: '炼丹会话已过期（超过3分钟未开始）',
  /** 你已有进行中的炼丹任务 */
  ALREADY_HAS_TASK: '你已有进行中的炼丹任务，请先完成或取消',
  /** 指引已过期 */
  GUIDE_EXPIRED: '指引已过期，请重新开始',
  /** 当前不是该步骤 */
  WRONG_STEP: '当前不是该步骤',
  /** 你已经在进行炼丹师指引了 */
  ALREADY_IN_GUIDE: '你已经在进行炼丹师指引了，请继续完成',
  /** 新手指引已过期 */
  GUIDE_EXPIRED_RESTART: '新手指引已过期，请重新使用 /加入炼丹师 开始',
  /** 你正在进行炼丹师新手指引 */
  IN_GUIDE: '你正在进行炼丹师新手指引，请继续完成指引',
  /** 玩家未开启炼丹职业 */
  NOT_STARTED: '玩家未开启炼丹职业',
  /** 炼丹师职业未配置 */
  NOT_CONFIGURED: '炼丹师职业未配置',
  /** 当前职业等级配置错误 */
  LEVEL_CONFIG_ERROR: '当前职业等级配置错误',
  /** 无法获取你的境界信息 */
  REALM_INFO_FAILED: '无法获取你的境界信息',
  /** 职业信息丢失 */
  PROFESSION_LOST: '职业信息丢失',
  /** 炼制失败 */
  CRAFT_FAILED: '炼制失败，请稍后再试或联系运营'
} as const;

// ===================== 境界消息 =====================

export const MSG_REALM = {
  /** 已达到最高境界 */
  MAX_REACHED: '已达到最高境界，无法晋级',
  /** 小大境界已满 */
  SUB_REALM_MAX: '小大境界已满，请使用【晋级】',
  /** 当前有晋级操作进行中 */
  PROMOTION_BUSY: '当前有晋级操作进行中，请稍后再试',
  /** 获取用户信息失败 */
  USER_INFO_FAILED: '获取用户信息失败',
  /** 无法获取下一境界信息 */
  NEXT_REALM_NOT_FOUND: '无法获取下一境界信息',
  /** 未找到用户信息 */
  USER_NOT_FOUND: '未找到用户信息',
  /** 当前境界信息不存在 */
  CURRENT_REALM_NOT_FOUND: '当前境界信息不存在',
  /** 当前境界暂不支持晋级 */
  CURRENT_REALM_NO_PROMOTION: '当前境界暂不支持晋级',
  /** 检查晋级条件时发生错误 */
  CHECK_PROMOTION_ERROR: '检查晋级条件时发生错误',
  /** 晋级条件检查失败 */
  PROMOTION_CHECK_FAILED: '晋级条件检查失败',
  /** 无法获取晋级后的境界信息 */
  AFTER_PROMOTION_NOT_FOUND: '无法获取晋级后的境界信息',
  /** 检查突破条件时发生错误 */
  CHECK_BREAKTHROUGH_ERROR: '检查突破条件时发生错误',
  /** 突破条件检查失败 */
  BREAKTHROUGH_CHECK_FAILED: '突破条件检查失败'
} as const;

// ===================== 队伍消息 =====================

export const MSG_TEAM = {
  /** 你已经在一个队伍中了 */
  ALREADY_IN_TEAM: '你已经在一个队伍中了',
  /** 队伍已满 */
  TEAM_FULL: '队伍已满',
  /** 你已经申请过该队伍 */
  ALREADY_APPLIED: '你已经申请过该队伍，请等待审核',
  /** 你还未加入队伍 */
  NOT_IN_TEAM: '你还未加入队伍',
  /** 该成员已经在此位置 */
  MEMBER_SAME_POSITION: '该成员已经在此位置',
  /** 该玩家已加入其他队伍 */
  MEMBER_IN_OTHER_TEAM: '该玩家已加入其他队伍',
  /** 该玩家正在被其他队伍处理中 */
  MEMBER_BUSY: '该玩家正在被其他队伍处理中，请稍后再试',
  /** 操作过于频繁 */
  TOO_FREQUENT: '操作过于频繁，请稍后再试',
  /** 队伍不存在 */
  NOT_EXISTS: '队伍不存在',
  /** 你不是队长 */
  NOT_LEADER: '你不是队长',
  /** 目标成员不在队伍中 */
  TARGET_NOT_IN_TEAM: '目标成员不在队伍中',
  /** 不能踢出自己 */
  CANNOT_KICK_SELF: '不能踢出自己',
  /** 该玩家不在队伍中 */
  PLAYER_NOT_IN_TEAM: '该玩家不在队伍中',
  /** 申请不存在或已处理 */
  APPLICATION_NOT_FOUND: '申请不存在或已处理',
  /** 申请者不存在 */
  APPLICANT_NOT_FOUND: '申请者不存在',
  /** 你的待审核申请已达上限 */
  APPLICATION_LIMIT: '你的待审核申请已达上限（最多5个），请先取消部分申请',
  /** 你的境界未达到队伍要求 */
  REALM_INSUFFICIENT: '你的境界未达到队伍要求',
  /** 该玩家境界未达到队伍要求 */
  PLAYER_REALM_INSUFFICIENT: '该玩家境界未达到队伍要求',
  /** 不能转让给自己 */
  CANNOT_TRANSFER_SELF: '不能转让给自己',
  /** 不能邀请自己 */
  CANNOT_INVITE_SELF: '不能邀请自己',
  /** 队长转让成功 */
  TRANSFER_SUCCESS: '队长已成功转让',
  /** 该玩家已在队伍中 */
  PLAYER_ALREADY_IN_TEAM: '该玩家已在队伍中',
  /** 对方不接受队伍邀请 */
  INVITE_DISABLED: '对方不接受队伍邀请',
  /** 已向该玩家发送过邀请 */
  ALREADY_INVITED: '已向该玩家发送过邀请，请等待对方处理',
  /** 队伍待处理邀请已达上限 */
  TEAM_INVITE_LIMIT: '队伍待处理邀请已达上限，请先等待对方处理或取消邀请',
  /** 邀请不存在或已处理 */
  INVITATION_NOT_FOUND: '邀请不存在或已处理',
  /** 邀请已发送 */
  INVITE_SENT: '邀请已发送',
  /** 邀请已自动通过 */
  INVITE_AUTO_ACCEPTED: '对方已自动同意邀请，直接加入队伍',
  /** 队伍已解散 */
  DISBAND_SUCCESS: '队伍已解散',
  /** 你正在打坐，无法进行此操作 */
  MEDITATING: '你正在打坐，无法进行此操作',
  /** 你正在闭关，无法进行此操作 */
  IN_SECLUSION: '你正在闭关，无法进行此操作',
  /** 对方正在打坐，无法加入队伍 */
  PLAYER_MEDITATING: '对方正在打坐，无法加入队伍',
  /** 对方正在闭关，无法加入队伍 */
  PLAYER_IN_SECLUSION: '对方正在闭关，无法加入队伍'
} as const;

// ===================== 秘境消息 =====================

export const MSG_DUNGEON = {
  /** 未找到秘境 */
  notFound: (name: string) => `未找到秘境「${name}」`,
  /** 未找到该秘境 */
  NOT_FOUND: '未找到该秘境',
  /** 今日次数已用完 */
  DAILY_LIMIT: '今日次数已用完',
  /** 队伍中没有人满足精力/次数要求 */
  NO_ELIGIBLE_MEMBER: '队伍中没有人满足精力/次数要求，无法秘境挑战',
  /** 该秘境尚未配置怪物 */
  NO_MONSTERS: '该秘境尚未配置NPC',
  /** 组队时只有队长才可以秘境挑战 */
  ONLY_LEADER_CAN_ENTER: '组队时只有队长才可以秘境挑战',
  /** 该秘境为单人秘境 */
  SOLO_ONLY: '该秘境为单人秘境，请独自挑战',
  /** 队伍成员信息异常 */
  TEAM_DATA_ERROR: '队伍成员信息异常，请稍后再试',
  /** 该秘境怪物配置异常 */
  MONSTER_CONFIG_ERROR: '该秘境怪物配置异常',
  /** 扫荡次数范围 */
  SWEEP_RANGE: '扫荡次数范围 1-10',
  /** 扫荡次数仅支持 */
  SWEEP_ONLY: '扫荡次数仅支持 1、5、10',
  /** 该秘境需要成功通关后才能扫荡 */
  SWEEP_NEED_CLEAR: '该秘境需要成功通关后才能扫荡',
  /** 境界超出限制 */
  REALM_OVER_LIMIT: '境界超出限制'
} as const;

// ===================== 集市消息 =====================

export const MSG_MARKET = {
  /** 上架不存在或已删除 */
  LISTING_NOT_FOUND: '上架不存在或已删除',
  /** 只能下架自己的物品 */
  ONLY_OWN: '只能下架自己的物品',
  /** 无效的物品分类 */
  INVALID_CATEGORY: '无效的物品分类',
  /** 无效的背包物品ID */
  INVALID_BAG_ITEM_ID: '无效的背包物品ID',
  /** 单价必须为正整数 */
  PRICE_INVALID: '单价必须为正整数',
  /** 数量必须为正整数 */
  AMOUNT_INVALID: '数量必须为正整数',
  /** 无效的计价币种 */
  INVALID_CURRENCY: '无效的计价币种',
  /** 珍宝楼仅支持灵晶交易 */
  EXCHANGE_ONLY_CRYSTAL: '珍宝楼仅支持灵晶交易',
  /** 装备一次只能上架1件 */
  EQUIP_SINGLE_ONLY: '装备一次只能上架1件',
  /** 功法一次只能上架1本 */
  SKILL_SINGLE_ONLY: '功法一次只能上架1本',
  /** 不支持的物品分类 */
  UNSUPPORTED_CATEGORY: '不支持的物品分类',
  /** 无效的上架ID */
  INVALID_LISTING_ID: '无效的上架ID',
  /** 该上架已下架或已售罄 */
  LISTING_UNAVAILABLE: '该上架已下架或已售罄',
  /** 购买数量必须为正整数 */
  BUY_AMOUNT_INVALID: '购买数量必须为正整数',
  /** 不能购买自己的上架物品 */
  CANNOT_BUY_OWN: '不能购买自己的上架物品',
  /** 上架单价异常 */
  PRICE_ABNORMAL: '上架单价异常',
  /** 上架币种异常 */
  CURRENCY_ABNORMAL: '上架币种异常',
  /** 批量购买时所有上架均不可用 */
  BATCH_ALL_UNAVAILABLE: '购买失败：所选上架已下架或已售罄，请浏览其他商品'
} as const;

// ===================== 闭关消息 =====================

export const MSG_SECLUSION = {
  /** 你已经在闭关中 */
  ALREADY_IN: '你已经在闭关中，请先出关',
  /** 你正在打坐中 */
  IN_MEDITATION: '你正在打坐中，请先结束打坐再闭关',
  /** 在队伍中无法进行闭关/打坐 */
  IN_TEAM: '你在队伍中，无法进行闭关/打坐，请先离开队伍',
  /** 120小时闭关需要闭关卡 */
  NEED_SECLUSION_CARD: '120小时闭关需要「闭关卡」',
  /** 闭关失败 */
  START_FAILED: '闭关失败，请稍后再试',
  /** 你当前没有在闭关中 */
  NOT_IN_SECLUSION: '你当前没有在闭关中',
  /** 闭关不足12小时 */
  LESS_THAN_12H: '闭关不足12小时，精力已退还，无修炼收获',
  /** 出关失败 */
  EXIT_FAILED: '出关失败，请稍后再试',
  /** 出关结算失败 */
  EXIT_SETTLE_FAILED: '出关结算失败，请稍后再试'
} as const;

// ===================== 邪魔塔消息 =====================

export const MSG_DEMON_TOWER = {
  /** 今日闯塔已结束 */
  DAILY_ENDED: '今日闯塔已结束，请明日再来',
  /** 当前没有进行中的闯塔 */
  NOT_IN_TOWER: '当前没有进行中的闯塔',
  /** 今日尚未开始闯塔 */
  NOT_STARTED_TODAY: '今日尚未开始闯塔，无需使用重列旗',
  /** 你没有重列旗 */
  NO_RESET_FLAG: '你没有重列旗，可在万宝楼购买'
} as const;

// ===================== 排行榜消息 =====================

export const MSG_RANKING = {
  /** 你还未上榜 */
  NOT_RANKED: '你还未上榜，无法领取奖励',
  /** 该排名奖励已领取过 */
  REWARD_CLAIMED: '该排名奖励已领取过',
  /** 所有月度奖励已领取 */
  MONTHLY_ALL_CLAIMED: '所有月度奖励已领取',
  /** 只能扫荡排名比自己低的对手 */
  ONLY_LOWER: '只能扫荡排名比自己低的对手',
  /** 不能挑战自己 */
  CANNOT_CHALLENGE_SELF: '不能挑战自己',
  /** 排名无效 */
  RANK_INVALID: '排名无效',
  /** 未达到该排名 */
  RANK_NOT_REACHED: '未达到该排名',
  /** 暂无可领取的奖励 */
  NO_CLAIMABLE_REWARD: '暂无可领取的奖励',
  /** 本月未上榜 */
  MONTHLY_NOT_RANKED: '本月未上榜，无月度奖励',
  /** 暂无可领取的月度奖励 */
  MONTHLY_NO_CLAIMABLE: '暂无可领取的月度奖励',
  /** 奖励配置不存在 */
  REWARD_CONFIG_NOT_FOUND: '奖励配置不存在',
  /** 该档位奖励已领取 */
  TIER_CLAIMED: '该档位奖励已领取',
  /** 奖励档位不存在 */
  TIER_NOT_FOUND: '奖励档位不存在',
  /** 构建战斗队伍失败 */
  BUILD_TEAM_FAILED: '构建战斗队伍失败，请确保你有有效的战斗单位',
  /** 构建目标战斗队伍失败 */
  BUILD_TARGET_TEAM_FAILED: '构建目标战斗队伍失败',
  /** 战斗执行失败 */
  BATTLE_FAILED: '战斗执行失败，请稍后再试',
  /** 挑战失败 */
  CHALLENGE_FAILED: '挑战失败，继续努力吧',
  /** 目标排名位置为空 */
  TARGET_EMPTY: '目标排名位置为空'
} as const;

// ===================== 充值/月卡消息 =====================

export const MSG_RECHARGE = {
  /** 你尚未开通月卡或月卡已过期 */
  MONTH_CARD_NOT_ACTIVE: '你尚未开通月卡或月卡已过期',
  /** 暂无可领取的月卡奖励 */
  MONTH_CARD_NO_REWARD: '暂无可领取的月卡奖励',
  /** 月卡当前剩余天数已达续购上限 */
  MONTH_CARD_LIMIT: '月卡剩余天数已达上限（180天）',
  /** 闭关卡累计天数已达上限 */
  SECLUSION_PASS_LIMIT: '闭关卡累计天数已达上限（180天）',
  /** 档位配置不存在 */
  TIER_NOT_FOUND: '档位配置不存在',
  /** 该档位尚未解锁 */
  TIER_LOCKED: '该档位尚未解锁',
  /** 该档位奖励已领取 */
  TIER_CLAIMED: '该档位奖励已领取',
  /** 里程碑不存在或未解锁 */
  MILESTONE_NOT_FOUND: '里程碑不存在或未解锁',
  /** 奖励已领取 */
  MILESTONE_CLAIMED: '奖励已领取'
} as const;

// ===================== 邮件消息 =====================

export const MSG_EMAIL = {
  /** 验证码已过期或不存在 */
  CAPTCHA_EXPIRED: '验证码已过期或不存在，请重新获取',
  /** 验证次数已用完 */
  CAPTCHA_RETRY_LIMIT: '验证次数已用完，请重新获取验证码',
  /** 验证码已过期 */
  CAPTCHA_CODE_EXPIRED: '验证码已过期，请重新获取',
  /** 今日邮件发送次数已达上限 */
  DAILY_SEND_LIMIT: '今日邮件发送次数已达上限，请明天再试',
  /** 无进行中的验证流程 */
  NO_VERIFICATION: '无进行中的验证流程',
  /** 当前有邮箱操作正在进行中 */
  OPERATION_IN_PROGRESS: '当前有邮箱操作正在进行中，请稍后再试',
  /** 领取失败，邮件不存在或已领取 */
  MAIL_NOT_FOUND: '领取失败，邮件不存在或已领取',
  /** 所有邮件附件已领取过 */
  ALL_CLAIMED: '所有邮件附件已领取过，无需重复领取'
} as const;

// ===================== 签到商店消息 =====================

export const MSG_CHECKIN = {
  /** 登仙台签到暂未开放 */
  NOT_OPEN: '登仙台签到暂未开放，请等待管理员配置时间段',
  /** 商品不存在或已下架 */
  SHOP_ITEM_NOT_FOUND: '商品不存在或已下架',
  /** 未找到用户信息 */
  SHOP_USER_NOT_FOUND: '未找到用户信息',
  /** 操作繁忙 */
  SHOP_BUSY: '操作繁忙，请稍后再试'
} as const;

// ===================== 邀请消息 =====================

export const MSG_REFERRAL = {
  /** 你已经绑定过邀请码了 */
  ALREADY_BOUND: '你已经绑定过邀请码了',
  /** 不能绑定自己的邀请码 */
  CANNOT_BIND_SELF: '不能绑定自己的邀请码',
  /** 仅可在注册30天内绑定 */
  BIND_EXPIRED: '仅可在注册30天内绑定邀请码',
  /** 玩家不存在 */
  PLAYER_NOT_FOUND: '玩家不存在',
  /** 邀请码格式错误 */
  CODE_FORMAT_ERROR: '邀请码格式错误，请输入 tt-uid',
  /** 邀请码对应的玩家不存在 */
  CODE_PLAYER_NOT_FOUND: '邀请码对应的玩家不存在',
  /** 暂无可领取的奖励 */
  NO_CLAIMABLE_REWARD: '暂无可领取的奖励',
  /** 奖励配置已失效 */
  REWARD_CONFIG_EXPIRED: '奖励配置已失效，无法领取',
  /** 邀请人数已达上限 */
  INVITE_LIMIT_REACHED: '该邀请人的邀请名额已满，无法绑定'
} as const;

// ===================== PVP / 煞气消息 =====================

export const MSG_PVP = {
  /** 金盆洗手道具名 */
  JINPEN_ITEM_NAME: '金盆',
  /** 没有金盆道具 */
  NO_JINPEN: '你没有「金盆」道具，可在万宝楼购买后使用 /消耗 金盆',

  /** 煞气已为0 */
  SHA_QI_ALREADY_ZERO: '你当前没有煞气，无需使用',
  /** 金盆洗手成功 */
  JINPEN_SUCCESS: '消耗 1 个金盆，减少 2 点煞气',
  /** 杀神榜为空 */
  KILL_GOD_EMPTY: '天下太平，杀神榜空空如也'
} as const;

// ===================== 灵魂法器消息 =====================

export const MSG_SOUL_ARTIFACT = {
  /** 已达最高品级 */
  MAX_GRADE: '已达最高品级「道器」，无法继续升品',
  /** 当前没有炼化本命物 */
  NOT_REFINED: '当前没有炼化本命物',
  /** 升级级数必须大于0 */
  UPGRADE_AMOUNT_INVALID: '升级级数必须大于 0',
  /** 请先炼化本命物 */
  PLEASE_REFINE_FIRST: '请先炼化本命物',
  /** 金丹及以上方可升级本命物 */
  UPGRADE_REALM_INSUFFICIENT: '金丹及以上方可升级本命物',
  /** 金丹及以上方可升品本命物 */
  PROMOTE_REALM_INSUFFICIENT: '金丹及以上方可升品本命物',
  /** 该本命物已使用过唯一一次升品机会 */
  PROMOTE_CHANCE_USED: '该本命物已使用过唯一一次升品机会',
  /** 升品配置异常 */
  PROMOTE_CONFIG_ERROR: '升品配置异常',
  /** 金丹及以上方可洗涤本命物 */
  WASH_REALM_INSUFFICIENT: '金丹及以上方可洗涤本命物',
  /** 洗涤石不足 */
  WASH_STONE_INSUFFICIENT: '洗涤石不足',
  /** 所有可用词条已达洗涤上限 */
  WASH_ALL_MAX: '所有可用词条已达洗涤上限，无需继续洗涤'
} as const;

// ===================== 剧情消息 =====================

export const MSG_STORYLINE = {
  /** 该宝箱已领取 */
  CHEST_CLAIMED: '该宝箱已领取',
  /** 该达成奖励已领取 */
  ACHIEVEMENT_CLAIMED: '该达成奖励已领取',
  /** 该章节暂无关卡 */
  NO_LEVELS: '该章节暂无关卡',
  /** 该关卡需要三星通关后才能扫荡 */
  SWEEP_NEED_THREE_STAR: '该关卡需要三星通关后才能扫荡',
  /** 扫荡次数须为正整数 */
  SWEEP_TIMES_POSITIVE: '扫荡次数须为正整数',
  /** 扫荡次数超出上限 */
  SWEEP_TIMES_TOO_LARGE: '扫荡次数过大，请输入 9999 以内的正整数',
  /** 无效的宝箱序号 */
  INVALID_CHEST_INDEX: '无效的宝箱序号',
  /** 宝箱不存在 */
  CHEST_NOT_FOUND: '宝箱不存在',
  /** 暂无可领取的宝箱 */
  NO_CLAIMABLE_CHEST: '暂无可领取的宝箱',
  /** 无效的达成奖励序号 */
  INVALID_ACHIEVEMENT_INDEX: '无效的达成奖励序号',
  /** 达成奖励不存在 */
  ACHIEVEMENT_NOT_FOUND: '达成奖励不存在'
} as const;

// ===================== 活动消息 =====================

export const MSG_ACTIVITY = {
  /** 新人活动已结束 */
  NEWCOMER_ENDED: '新人活动已结束',
  /** 该里程碑奖励已领取 */
  MILESTONE_CLAIMED: '该里程碑奖励已领取'
} as const;

// ===================== 灵脉攻防战消息 =====================

export const MSG_SECRET_REALM_WAR = {
  /** 没有数据 */
  NO_DATA: '没有数据',
  /** 该位置正在被挑战 */
  POSITION_CHALLENGED: '该位置正在被挑战，请稍后再试',
  /** 该位置正在冻结中 */
  POSITION_FROZEN: '该位置正在冻结中，暂不可挑战',
  /** 本周奖励已领取 */
  WEEKLY_CLAIMED: '本周奖励已领取',
  /** 灵脉攻防战基础数据未初始化 */
  NOT_INITIALIZED: '灵脉攻防战基础数据未初始化',
  /** 宗门信息异常 */
  GUILD_DATA_ERROR: '宗门信息异常',
  /** 未加入宗门，无法参与 */
  NOT_IN_GUILD: '未加入宗门，无法参与灵脉攻防战',
  /** 未找到该位置 */
  POSITION_NOT_FOUND: '未找到该位置',
  /** 位置数据异常 */
  POSITION_DATA_ERROR: '位置数据异常，请稍后再试',
  /** 该位置已由你占领 */
  POSITION_ALREADY_OWNED: '该位置已由你占领',
  /** 战斗异常 */
  BATTLE_ERROR: '战斗异常，请稍后再试',
  /** 你还没有加入宗门 */
  NO_GUILD: '你还没有加入宗门',
  /** 结算后加入宗门的成员无法领取 */
  JOINED_AFTER_SETTLE: '结算后加入宗门的成员无法领取本周奖励',
  /** 本周宗门未占领任何秘境 */
  NO_OCCUPIED: '本周宗门未占领任何秘境，暂无可领取奖励',
  /** 领奖失败 */
  CLAIM_FAILED: '领奖失败，请稍后再试'
} as const;

// ===================== 战斗消息 =====================

export const MSG_BATTLE = {
  /** 战斗日志不存在或已过期 */
  LOG_EXPIRED: '战斗日志不存在或已过期（战斗日志保存5分钟）',
  /** 无权查看该战斗记录 */
  NO_PERMISSION: '无权查看该战斗记录'
} as const;

// ===================== 消耗品消息 =====================

export const MSG_CONSUME = {
  /** 当前已炼化该本命物 */
  ALREADY_REFINED: '当前已炼化该本命物，无需重复炼化'
} as const;

// ===================== 打坐消息 =====================

export const MSG_MEDITATION = {
  /** 今日真气已达上限 */
  dailyLimit: () => '今日真气已达上限，明日再来打坐吧'
} as const;

// ===================== 礼物消息 =====================

export const MSG_GIFT = {
  /** 今日赠送礼物次数已达上限 */
  dailySendLimit: (receiver: string) => `今日向「${receiver}」赠送礼物次数已达上限（2次/日）`,
  /** 今日灵契值已达上限 */
  dailyBondLimit: (receiver: string) => `「${receiver}」今日灵契值已达上限，赠送礼物不再生效`
} as const;

// ===================== 重复指令趣味回复 =====================

/**
 * 当玩家连续 ≥3 次发同一指令且得到同一结果时，追加趣味后缀。
 * `random()` 根据重复次数轮换文案，避免每次都一样。
 */
export const MSG_REPEAT = {
  POOL: [
    '道友，你是来找我玩的吗？😄',
    '说了不行就是不行哦~',
    '你已经问过啦，答案还是一样的',
    '重复的话说三遍也不会变哦',
    '道友莫急，结果不会因为多问而改变',
    '我都要被你问烦了……开个玩笑😉',
    '再问一万遍也是同样的结果哦',
    '道友不如去修炼一会，回来也许情况就不同了',
    '换个指令试试如何？🤔',
    '你猜我这次会不会给你不同的答案？——答案是不会'
  ] as readonly string[],

  /**
   * 根据重复次数返回一条趣味文案（循环选取）
   */
  random(count: number): string {
    const index = (count - 3) % MSG_REPEAT.POOL.length;

    return MSG_REPEAT.POOL[index >= 0 ? index : 0];
  }
} as const;
