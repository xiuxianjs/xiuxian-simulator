# 订单结束与自动退款状态

保持原订单详情、列表分页、刷新按钮与返回入口。透传服务端 resolutionState，旧服务不返回此字段时继续使用原展示。

- awaiting_payment / closed：状态：已结束，额度已释放，可重新购买。
- refund_pending：状态：退款处理中，将原路退回，不再发奖。
- refunded：状态：已原路退款。

已结束订单不生成继续支付入口。退款中的旧单不显示为支付失败。

改前/改后示意图：仓库外 `/Users/lemonade/Documents/bubble-style-mockups/payment-resolution-20261106.png`。该图为文案对照，不是 QQ 实机截图；实际发送节点已用 alemonjs/testing 的真实处理器验证。

验证：tsgo --noEmit、yarn lint:fix、treasures-checkout 离线框架测试 23 项通过。平台实机未验证。技能引用的 docs/bubble-style/DESIGN.md 当前缺失，本次依据两个现存 SKILL.md、content.md 及现有组件规则，只增补状态文案。
