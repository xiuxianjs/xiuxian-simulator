// Provider-owned preview/decision relationships. No authoritative previews live here.
const targets = {
  get_peiyuan_confirmation: {
    cancelRequiresDecision: true,
    decisionNotice: '原随机结果已消耗物品；有效期为生成后的60秒，放弃不会返还已消耗的物品。',
    action: 'confirm_peiyuan_pill',
    title: '保留培元结果',
    cancelAction: 'cancel_peiyuan_pill',
    cancelTitle: '放弃培元结果',
    kind: 'p',
    field: 'reference'
  },
  preview_treasure_exploration: {
    action: 'confirm_treasure_action',
    title: '确认宝物探索',
    kind: 'b',
    inputField: 'confirmationRef',
    field: 'confirmationRef'
  },
  preview_treasure_synthesis: { action: 'confirm_treasure_action', title: '确认合成宝物', kind: 'b', inputField: 'confirmationRef', field: 'confirmationRef' },
  preview_treasure_upgrade: { action: 'confirm_treasure_action', title: '确认升级宝物', kind: 'b', inputField: 'confirmationRef', field: 'confirmationRef' },
  preview_treasure_promotion: { action: 'confirm_treasure_action', title: '确认宝物升品', kind: 'b', inputField: 'confirmationRef', field: 'confirmationRef' },
  preview_treasure_batch_upgrade: {
    action: 'confirm_treasure_action',
    title: '确认批量升级宝物',
    kind: 'b',
    inputField: 'confirmationRef',
    field: 'confirmationRef'
  },
  preview_treasure_batch_promotion: {
    action: 'confirm_treasure_action',
    title: '确认批量升品宝物',
    kind: 'b',
    inputField: 'confirmationRef',
    field: 'confirmationRef'
  },
  preview_treasure_decomposition: {
    action: 'confirm_treasure_action',
    title: '确认分解宝物',
    kind: 'b',
    inputField: 'confirmationRef',
    field: 'confirmationRef'
  },
  preview_mythic_treasure_selection: {
    action: 'confirm_treasure_action',
    title: '确认神话自选',
    kind: 'b',
    inputField: 'confirmationRef',
    field: 'confirmationRef'
  },
  preview_maxed_treasure_decomposition: {
    action: 'confirm_treasure_action',
    title: '确认满品宝物分解',
    kind: 'b',
    inputField: 'confirmationRef',
    field: 'confirmationRef'
  },
  preview_spirit_vein_claim: {
    action: 'confirm_treasure_action',
    title: '确认领取灵脉收益',
    kind: 'b',
    inputField: 'confirmationRef',
    field: 'confirmationRef'
  },
  preview_treasure_free_daily_pack: {
    action: 'confirm_treasure_free_daily_pack',
    title: '确认领取免费礼包',
    kind: 'b',
    inputField: 'confirmationRef',
    field: 'confirmationRef'
  },
  preview_soul_path_choose: {
    retryPolicy: 'lookup',
    action: 'confirm_soul_path',
    title: '确认选择道途',
    kind: 'chooseUuid',
    inputField: 'token',
    field: 'confirmationToken'
  },
  preview_soul_path_switch: {
    retryPolicy: 'lookup',
    action: 'confirm_soul_path',
    title: '确认切换道途',
    kind: 'uuid',
    inputField: 'token',
    field: 'confirmationToken'
  },
  preview_soul_path_advance: {
    retryPolicy: 'lookup',
    action: 'confirm_soul_path',
    title: '确认道途突破',
    kind: 'uuid',
    inputField: 'token',
    field: 'confirmationToken'
  },
  preview_soul_path_reroll: {
    retryPolicy: 'lookup',
    action: 'confirm_soul_path',
    title: '确认神魂重选',
    kind: 'uuid',
    inputField: 'token',
    field: 'confirmationToken'
  },
  prepare_skill_learn: { optionalBind: ['taskInput'], action: 'confirm_skill_learn', title: '确认学习替换', bind: ['bookId'], kind: 'l', field: 'reference' },
  prepare_skill_switch: { action: 'confirm_skill_switch', title: '确认切换功法', bind: ['bookId', 'skillType'], kind: 'k', field: 'reference' },
  preview_cave_formation_activation: { action: 'activate_cave_formation', title: '确认激活阵盘', bind: ['keyword'], kind: 'g', field: 'reference' },
  prepare_skill_reroll: {
    cancelRequiresDecision: true,
    decisionNotice: '原随机结果已消耗物品；有效期为生成后的60秒，放弃不会返还已消耗的物品。',
    action: 'confirm_skill_reroll',
    title: '保留换词结果',
    cancelAction: 'cancel_skill_reroll',
    cancelTitle: '放弃换词结果',
    kind: 'x',
    field: 'reference'
  },
  prepare_soul_artifact_wash: {
    cancelRequiresDecision: true,
    decisionNotice: '原随机结果已消耗物品；有效期为生成后的60秒，放弃不会返还已消耗的物品。',
    action: 'confirm_soul_artifact_wash',
    title: '保留洗涤结果',
    cancelAction: 'cancel_soul_artifact_wash',
    cancelTitle: '放弃洗涤结果',
    kind: 'y',
    field: 'reference'
  },
  preview_shop_purchase: { action: 'confirm_shop_purchase', title: '确认购买', kind: 's', field: 'reference' },
  prepare_market_purchase: { action: 'confirm_market_purchase', title: '确认选购', kind: 'm', field: 'reference' },
  prepare_skill_batch_decomposition: { action: 'confirm_skill_batch_decomposition', title: '确认分解功法', kind: 'e', field: 'reference' },
  prepare_equipment_batch_decomposition: { action: 'confirm_equipment_batch_decomposition', title: '确认分解装备', kind: 'd', field: 'reference' },
  prepare_soul_artifact_replacement: { action: 'confirm_soul_artifact_replacement', title: '确认替换本命物', kind: 'v', field: 'reference' },
  prepare_soul_artifact_separation: { action: 'confirm_soul_artifact_separation', title: '确认分离本命物', kind: 'u', field: 'reference' },
  preview_spirit_root_feed: { action: 'confirm_spirit_root_feed', title: '确认喂养灵根', kind: 'r', field: 'reference' },
  prepare_skill_reset: { action: 'confirm_skill_reset', title: '确认重修功法', kind: 'w', field: 'reference' },
  prepare_companion_oath_upgrade: { action: 'confirm_companion_oath_upgrade', title: '确认升级誓约', kind: 'o', field: 'reference' },
  prepare_guild_leadership_transfer: { action: 'confirm_guild_leadership_transfer', title: '确认转让宗主', kind: 'z', field: 'reference' },
  prepare_cave_acceleration: { action: 'confirm_cave_acceleration', title: '确认灵田加速', kind: 'c', field: 'reference' },
  preview_alchemy: { action: 'confirm_alchemy', title: '确认炼制', kind: 'a', field: 'confirmations' },
  execute_task_preview_alchemy: { action: 'confirm_alchemy', title: '确认炼制', kind: 'a', field: 'confirmations' },
  preview_forge_order: { action: 'create_forge_order', title: '确认锻造委托', kind: 'f', field: 'token' },
  preview_forge: { action: 'confirm_forge', title: '确认打造', kind: 'f', field: 'token' },
  preview_tribulation: { action: 'confirm_tribulation', title: '确认开劫', kind: 't', field: 'confirmationReference' },
  preview_heart_demon: { action: 'confirm_heart_demon', title: '确认心魔回答', kind: 'h', field: 'confirmationReference' },
  preview_forge_tutorial: { action: 'confirm_forge', title: '确认打造', kind: 'f', field: 'token' }
};

export const conversationConfirmations = Object.entries(targets).map(([previewAction, target]) => ({
  previewAction,
  ...target,
  ...(['get_peiyuan_confirmation', 'preview_shop_purchase', 'prepare_market_purchase'].includes(previewAction) || target.field === 'confirmationRef'
    ? { requiresPreview: true }
    : {})
}));

const preparations = {
  prepare_skill_reroll: {
    title: '消耗换词符生成',
    fields: [
      { name: 'bookId', type: 'positiveInteger' },
      { name: 'label', type: 'singleText' }
    ],
    notice: '功法编号：{bookId}；词条：{label}。消耗1个换词符生成随机结果，不保证目标词条。生成后60秒内选择保留或放弃；放弃不返还物品。'
  },
  prepare_soul_artifact_wash: {
    title: '消耗洗涤石生成',
    fields: [],
    notice: '对当前本命物消耗1个洗涤石生成随机结果。生成后60秒内选择保留或放弃；放弃不返还物品。'
  },
  consume_item: {
    followups: [{ action: 'get_peiyuan_confirmation', inputField: 'snapshot', resultPath: ['peiyuanPending', 'snapshot'] }],
    title: '确认使用道具',
    fields: [
      { name: 'itemName', type: 'singleText', maxLength: 64, nonNumeric: true },
      { name: 'quantity', type: 'positiveInteger' },
      { name: 'intentId', type: 'text', optional: true },
      { name: 'taskInput', type: 'text', optional: true }
    ],
    notice: '将尝试消耗{quantity}个{itemName}，效果与实际消耗以服务端回执为准。若产生培元丹待定结果，丹药已消耗，放弃不返还。'
  }
};

export const conversationPreparations = Object.entries(preparations).map(([action, preparation]) => ({ action, ...preparation }));
