# 垂钓 QQ 消息接入与排版记录

本轮按用户指定主页、升竿、渔市、锦鲤赐福样稿统一消息。新增 `fishingBubble` 使用项目原 `Format` / `FormatGui` 的真实节点；首页字段同行操作、升竿独立原编号行、赐福⭐与每行四境界标签为用户明确版式，优先于 skill 的通用单块/编号同行/按钮数量建议。其他错误反馈继续复用 presentation 组件，不改全局展示框架。

全部命令链接均 `autoEnter:false`，不使用 `show`，完整指令不超过80个 Unicode 字符。链接只填入，玩家手动发送；交易预览的原引用走原市场确认，不转为垂钓确认。

## 覆盖

未建塘、空闲主页、进行中主页、开钓配置/预览、鱼种聚合、单种实例、单尾详情、售鱼预览、升塘、钓具、升竿、四币渔市、购买预览、货币兑换、礼包/支付、鱼谱、战报/杂获记录、收杆回执、鱼与普通物品待入袋、帮助/设置，以及新增锦鲤赐福、持久持续偏好设置。可编辑示例保存在主设计工作区 `docs/垂钓系统/QQ页面排版_可编辑.md`。

主页底部按3+2分行。赐福顶部仅展示凡物到当前鱼塘已解锁境界，每行最多4项；默认当前塘境界，`blessingRealm` 可明确传0选择凡物；每境界完整显示五种鱼。放生按钮只取原预览，不自动消费；满星隐藏操作，缺鱼显示渔获入口。主页状态独占一行，下一行为甩杆/收杆，再下一行为使用渔具。运行中竿/饵序冻结，手动窝可同种加时、异种确认替换；可与闭关、探索等其他玩法并行。

## 验证

- 新增三个 `alemonjs/testing` 套件通过：真实处理器、Hook、Format、发送回执与节点检查；含原确认重放、损坏/越权拒绝、鱼市场精确编号/克重、四币渔市、凡物0、私聊礼包支付及群聊零下单。
- 新增服务端 SQLite 查询及 HTTP adapter 测试，由真实 CGO1 工具链执行；主体仅取中间件UID，持有聚合/实例/详情/待入袋/账本/回执均限制本人。普通物品满袋读取 pending cast，避免只读 fish catch 漏资产。
- 全 `src` 加三个新测试的定向 `tsgo` 通过；全量 `tsgo` 被原有相邻 `alemonjs-agent-link/lib/response/dsh/plugin-conversation.js` 缺失阻断。已搜索已知工作树，未用 stub 冒充该依赖。
- 全 `yarn lint:fix` 通过。Node22 的现有测试资源同步加载钩子会在 `source:null` 处失败，本轮以已存在的只读 ESM 资源loader执行测试；未修改全局框架或伪造 Hook。

截图均在仓库外：

- `D:/data/alemone/bubble-style-mockups/fishing-home-before-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-pages-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-home-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-upgrade-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-shop-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-blessing-after.png`

修改前是原排版稿，修改后取真实处理器离线发送节点 `fishing-after-nodes.json`。这证明源码排版和框架发送路径；后端状态由夹具提供，不代表真实QQ平台、支付到账、线上账号或部署验收。

## 接口往返

| 入口 | typed operation / fields | 服务端 |
|---|---|---|
| `/垂钓`、渔获/鱼种/单尾、设置、待入袋 | `fishing.query`；`view/speciesId/catchId/page/returnPage/sku` | Query，各层独立页码与本人过滤 |
| `/垂钓 赐福` | `view:blessing`，不传 `blessingRealm` | 默认当前塘境界 |
| `/垂钓 赐福 0` / `凡物` | `view:blessing, blessingRealm:0` | 指针区分0和未传，显示凡物五鱼 |
| `/垂钓 赐福预览 <鱼种>` | `fishing.preview` / `kind:blessing-unlock, speciesId` | 固定最轻可用的所需尾数，原引用确认 |
| `/垂钓 升竿 <fr_编号>` | `kind:rod-upgrade,rodId:string` | 精确原竿版本/成本，不改短号 |
| 渔市四页 | `currency:coin/stone/crystal/dao` | 四币独立报价，Quantity为包数 |
| 灵晶×100购买 | `kind:cashout,currency:crystal,quantity:100` | 原额度按晶计，不改每日上限 |
| `/垂钓 礼包购买 <sku>` | `fishing.pack-checkout` / `sku` | 原订单checkout；群聊在客户端与expose入口拒绝 |
| `/垂钓 确认 <r1_y>` | `fishing.confirm` / `ref` | 原5分钟预览、本人绑定及SQL回执重放 |
| `/交易上架 鱼类 <fc_编号> [价格]` | `market.sell` / `catchId:string` | 数量1、精确克重、先预览 |
| `/交易上架 鱼类 确认 <r1_y>` | `market.sell` / `mode:confirm,reference` | 原市场确认，非 fishing.confirm |

上线由主任务统一提交、推送及说明；本记录不宣称已部署。

本轮新增设置主界面四组与种类/主饵/优先序选择子页；修改以partial取得原预览，false与legacy ChumTier=0不丢失，未指定字段不清空。运行中可以保存下次偏好，竿/饵序不变，当前手动窝另走即时预览；开钓页六种时长保持1/4/6及8/12/24两行。设置截图位于仓库外 fishing-settings-after.png 与 fishing-settings-before-after.png，前者是实际处理器离线节点。

锦鲤收益接线补充：秘境挑战/扫荡解析可选experienceBonusText，仅非空时显示；主线与比试保留normalExperienceGained及宝物分拆，只追加“含锦鲤”说明。打劫/三连/反击原来省略BonusText的分支只补锦鲤片段；丹药normalMessage已由服务端保留锦鲤，客户端不重复拼接或重算。八个真实框架套件合计286项通过，其中10项验证锦鲤说明与宝物实际收益各出现一次、显示原普通修为而不再加入锦鲤数值。截图fishing-blessing-receipts.png和fishing-blessing-receipts-before-after.png使用真实处理器离线发送节点。

自动窝接口边界：chumType为现有种类、count0、tier可0时交服务端合并已存设置后预算；none/无窝0明确本次不预装。偏好baitOrder空数组允许交服务端判断（切换开启仍由服务端拒绝），不再由adapter抢先拒绝所有清空请求。所有键、范围、唯一性与本人身份校验保留。
## 最终无阶窝、渔具、推送与战报

六种散仅`chum:kind`，不含tier。按已拥有鱼塘m=[1,2,4,7,10,13,16,20,25]份为六小时，较低本次水域不改变耗量。当前打窝页显示本人可用raw份数、当前余效，同种加时或异种明确作废旧剩余效果再确认替换；设置持续窝策略不与即时打窝混用。自动最多四个六小时批次，竿/饵序冻结；所有购买与消费均先原预览再手动确认。

新增`tools`与`cast`查询、`use-net`与`use-chum`预览，以及PushRareFish/PushFishKing两个独立partial开关。通知只采用现有投递通道，并提供实际`/通知设置`入口；测试未向真人发消息。战报按castId+本人过滤，纯数字仍历史页码，私有种子与完整玩家快照不输出。捕灵网只消耗两小时窝效而不提前普通EndAt，竿饵不影响且不扣饵；后端preview提供实际耗用明细。鱼饵只钱/石售，钱无限、石素饵无限且其他每种各10份/日，晶道禁止直接购饵；礼包赠饵不变。全部goods实价来自服务端VIP资源店报价，兑换与RMB礼包不打折。

最终八套真实框架测试286/286通过（含设置partial、用网原引用、即时窝、本人cast、禁售页与旧外部玩法回归）；完整日志在`D:/data/alemone/bubble-style-mockups/fishing-qq-final-tests.log`。全src与三个新增套件定向tsgo通过，全`yarn lint:fix`通过。实际发送节点45条不同垂钓蓝链全部通过原CLI parser往返，结果在`fishing-command-roundtrip.json`；此检查仍不代替真实QQ平台验收。

新增截图（均本地真实handler发送节点＋服务端事实夹具）：

- `D:/data/alemone/bubble-style-mockups/fishing-current-chum-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-tools-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-cast-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-settings-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-home-before-after.png`

可编辑QQ稿已扩至25页。截图与JSON均留仓库外，代码不含预览产物。
