import type { LingxuPage } from '../../src/api/bot/lingxu';

export const lingxuRef = 'r1_1_lx_mabc1234_0123456789abcdef01234567';
export const lingxuOuterMap: LingxuPage = {
  title: '灵墟洞天 · 地图', privateOnly: false,
  tabs: [
    { label: '▶外围', command: '/灵墟洞天 地图 外围' },
    { label: '内围', command: '/灵墟洞天 地图 内围' },
    { label: '核心', command: '/灵墟洞天 地图 核心' }
  ],
  sections: [
    ['坎·阳·玄泽湿地', '水生灵植、液材、丹药', '坎门'],
    ['艮·阳·玄晶矿洞', '矿料、铸造工具、装备', '艮门'],
    ['震·阳·青岚林', '草药、种子、灵植', '震门'],
    ['巽·阳·百草坞', '成片灵植、种子、草药', '巽门'],
    ['离·阳·赤砂裂隙', '矿料、兵器、护具', '离门'],
    ['坤·阳·废弃坊市', '丹药、功法、旧工具和遗物', '坤门'],
    ['兑·阳·秋水河滩', '液材、河砂矿料、散落法器', '兑门'],
    ['乾·阳·观星台', '功法、法器、星象遗物', '乾门']
  ].map(([title, drops, exit]) => ({ title, lines: [`产出：${drops}`, `出口：${exit}`], actions: [{ label: '前往', command: `/灵墟洞天 前往 ${title.split('·').at(-1)}` }] })),
  actions: [{ label: '选择出口', command: '/灵墟洞天 出口' }, { label: '返回洞天', command: '/灵墟洞天' }]
};

export const lingxuLegacyJournal: LingxuPage = {
  title: '灵墟洞天 · 行记', privateOnly: false,
  sections: [{ title: '行动记录', id: 'record_5', lines: ['时间：11-10 19:10'], experience: ['搜寻林间落种，精力-2、元力-2。'], harvest: ['获得了7修为、青岚灵芽×1。'], actions: [{ label: '详情', command: '/灵墟洞天 记录 record_5' }] }],
  nav: { page: 1, totalPages: 40, total: 120, command: '/灵墟洞天 行记 {page}' },
  actions: [{ label: '提取回执', command: '/灵墟洞天 提取回执' }, { label: '返回洞天', command: '/灵墟洞天' }]
};

export const lingxuJournal: LingxuPage = {
  title: '灵墟洞天 · 行记', privateOnly: false,
  tabs: ['与人', '与怪', '探索', '赶路', '其他'].map(label => ({ label, command: `/灵墟洞天 行记 ${label}` })),
  sections: [
    { title: '11-11 21:30', id: '5', lines: ['经历：搜寻青岚林。', '收获：修为7、青岚灵芽×1。'], actions: [{ label: '详情', command: '/灵墟洞天 记录 5' }] },
    { title: '11-11 21:20', id: '4', lines: ['经历：与针背山猪开战。', '结果：战败 · 命数 5→4'], actions: [{ label: '详情', command: '/灵墟洞天 记录 4' }] },
    { title: '11-11 21:10', id: '3', lines: ['经历：正在前往废弃坊市。', '结果：已抵达。'], actions: [{ label: '详情', command: '/灵墟洞天 记录 3' }] }
  ],
  nav: { page: 1, totalPages: 40, total: 120, command: '/灵墟洞天 行记 {page}' },
  actions: [{ label: '提取回执', command: '/灵墟洞天 提取回执' }, { label: '推送设置', command: '/灵墟洞天 推送设置' }, { label: '返回洞天', command: '/灵墟洞天' }]
};

export const lingxuJournalDetail: LingxuPage = {
  title: '灵墟洞天 · 行动详情', privateOnly: false,
  sections: [{ title: '11-11 21:20', id: '4', lines: ['地点：青岚林', '经历：与针背山猪开战 · 交战 3 回合', '结果：战败 · 命数 5→4', '消耗：精力 2、元力 2'] }],
  actions: [{ label: '返回行记', command: '/灵墟洞天 行记' }]
};

export const lingxuPages: Array<{ command: string; page: LingxuPage; expected: string[] }> = [
  {
    command: '/灵墟洞天',
    page: {
      title: '灵墟洞天', privateOnly: false,
      sections: [{ lines: ['状态：探索中 · 坤·阳·废弃坊市', '行动：保守 · 对人躲避 · 对怪战斗', '命数：4/5 · 每60分钟恢复1点', '行囊：8/50格 · 暗格0/0', '阵效：道蕴阵盘·三品 · 剩余5小时', '时效：每轮开始时确定阵效，之后的阵效变化从下一轮起生效。', '时间：下次结算19:20'] }],
      actions: [{ label: '行动倾向', command: '/灵墟洞天 行动倾向' }, { label: '地图', command: '/灵墟洞天 地图' }, { label: '行囊', command: '/灵墟洞天 行囊' }, { label: '阵法师', command: '/阵法师' }, { label: '行记', command: '/灵墟洞天 行记' }, { label: '返程', command: '/灵墟洞天 返程' }, { label: '休息', command: '/灵墟洞天 隐匿' }]
    },
    expected: ['命数：4/5', '下次结算19:20']
  },
  {
    command: '/灵墟洞天 入场',
    page: {
      title: '灵墟洞天 · 入场确认', privateOnly: false,
      sections: [{
        lines: ['状态：准备入场(坤·阳·废弃坊市)', '行动：谨慎 · 对人躲避 · 对怪躲避', '命数：4/5 · 每60分钟恢复1点', '行囊：0/60格 · 暗格0/0', '阵盘：归墟阵盘·三品 · 余1时43分', '', '消耗：每轮精力2、元力2。精力或元力不足时等待。', '风险：战败扣1点命数，资产损失限本局灵石和灵晶。墟行囊实物与原储物袋保留。', '结算：到外围出口后另用一轮撤离，成功后带出所得。', '说明：入场沿用当前命数，探索、闭关和打坐照常。', '时效：24小时内可按此页设置入场。容量、阵盘或规则变化后须重新预览。'],
        actions: [{ label: '确认入场', command: `/灵墟洞天 确认 ${lingxuRef}` }]
      }],
      actions: [{ label: '地图', command: '/灵墟洞天 地图' }, { label: '倾向', command: '/灵墟洞天 行动倾向' }, { label: '打开', command: '/灵墟洞天 行囊' }, { label: '查看', command: '/阵法师' }, { label: '取消', command: '/灵墟洞天' }]
    },
    expected: ['战败扣1点命数', '入场沿用当前命数']
  },
  {
    command: '/灵墟洞天 地图 2',
    page: {
      title: '灵墟洞天 · 地图', privateOnly: false,
      sections: [{ lines: ['位置：坤·废弃坊市', '地图：八卦阴阳17地域 · 44条双向通道 · 7个公开出口'] }, { title: '坎·玄泽湿地', lines: ['产出：水生草药、灵液', '出口：坎门 · 到达后另用一轮撤离'], actions: [{ label: '前往', command: '/灵墟洞天 前往 kan' }] }, { title: '归墟核心', lines: ['产出：合法化神材料、古藏与古器材料', '出口：无 · 可经相邻地域返程'], actions: [{ label: '前往', command: '/灵墟洞天 前往 core' }] }],
      nav: { page: 2, totalPages: 6, total: 17, command: '/灵墟洞天 地图 {page}' },
      actions: [{ label: '最近出口', command: '/灵墟洞天 返程' }, { label: '返回洞天', command: '/灵墟洞天' }]
    },
    expected: ['44条双向通道', '第2/6页']
  },
  {
    command: '/灵墟洞天 行囊',
    page: {
      title: '灵墟洞天 · 墟行囊', privateOnly: false,
      sections: [{ lines: ['容量：50格 · 已用8格', '保护：0/1暗格 · 批量丢弃保留受保护的物品'] }, { title: '青岚灵芽', id: 'lot_0123456789abcdef0123456789', lines: ['数量：3 · 占用1格', '状态：未保护 · 提取前尚未归入永久库存'], actions: [{ label: '保护', command: '/灵墟洞天 保护 lot_0123456789abcdef0123456789' }] }, { title: '断碑晶砂', id: 'lot_2', lines: ['数量：2 · 已保护1份'], actions: [{ label: '取消保护', command: '/灵墟洞天 取消保护 lot_2' }] }],
      nav: { page: 1, totalPages: 2, total: 4, command: '/灵墟洞天 行囊 {page}' },
      actions: [{ label: '行囊升级', command: '/灵墟洞天 行囊升级' }, { label: '返回洞天', command: '/灵墟洞天' }]
    },
    expected: ['青岚灵芽 #lot_', '已保护1份']
  },
  {
    command: '/阵法师 制盘预览 shenxing',
    page: {
      title: '阵法师 · 制盘确认', privateOnly: false,
      sections: [{ title: '目标', lines: ['物品：神行阵盘·无品×1', '效果：命中+3个百分点。', '职业经验：基础+10，成功后自动结算晋级。'] }, { title: '代价', lines: ['材料：青岚灵芽×3、断碑晶砂×1', '灵晶：10', '范围：只扣已带出的永久可用库存', '时效：确认引用24小时内有效，原预览变化则整单失败。'], actions: [{ label: '确认制作', command: `/阵法师 确认 ${lingxuRef}` }] }],
      actions: [{ label: '取消', command: '/阵法师 图谱' }]
    },
    expected: ['青岚灵芽×3', '只扣已带出的永久可用库存']
  },
  {
    command: '/灵墟洞天 扩容预览 最高',
    page: {
      title: '灵墟洞天 · 扩容确认', privateOnly: false,
      sections: [{ title: '目标', lines: ['等级：3级→4级', '容量：60格→65格', '保护：0暗格→1暗格', '说明：本局容量已冻结；扩容从下一局生效。'] }, { title: '代价', lines: ['材料：青岚灵芽×6、断碑晶砂×4', '范围：只扣本次原预览合计的永久可用材料。'], actions: [{ label: '确认升级', command: `/灵墟洞天 确认 ${lingxuRef}` }] }],
      actions: [{ label: '取消', command: '/灵墟洞天 行囊升级' }]
    },
    expected: ['3级→4级', '扩容从下一局生效']
  },
  {
    command: '/灵墟洞天 行记',
    page: lingxuLegacyJournal,
    expected: ['行动记录 #record_5', '经历：', '收获：', '共120条']
  },
  {
    command: '/灵墟洞天 行记',
    page: lingxuJournal,
    expected: ['11-11 21:30', '与针背山猪开战', '正在前往废弃坊市', '共120条']
  },
  {
    command: '/灵墟洞天 记录 4',
    page: lingxuJournalDetail,
    expected: ['11-11 21:20', '消耗：精力 2、元力 2', '交战 3 回合']
  }
];
