# 垂钓 QQ 消息接入与排版记录

2026-11-04已发布源码归档：服务端main `d05e2d637ad7ec17ac4e284b1a8e344e44698bdb`；QQ main `2c9b0d260f17c6d41cedad9b4f6eda5015f11ef9`。本说明后补为文档归档，源码锚点不包含本次文档变更；Web未改。

本轮按用户指定主页、升竿、渔市、锦鲤赐福样稿统一消息。新增 `fishingBubble` 使用项目原 `Format` / `FormatGui` 的真实节点；首页字段同行操作、升竿独立原编号行、赐福⭐与每行四境界标签为用户明确版式，优先于 skill 的通用单块/编号同行/按钮数量建议。其他错误反馈继续复用 presentation 组件，不改全局展示框架。

全部命令链接均 `autoEnter:false`，不使用 `show`，完整指令不超过80个 Unicode 字符。链接只填入，玩家手动发送；交易预览的原引用走原市场确认，不转为垂钓确认。

## 覆盖

未建塘、空闲主页、进行中主页、开钓配置/预览、鱼种聚合、单种实例、单尾详情、售鱼预览、升塘、钓具、升竿、买卖渔市、购买预览、货币兑换、礼包/支付、鱼谱、战报/杂获记录、收杆回执、鱼与普通物品待入袋、帮助/设置、锦鲤赐福、持续偏好、渔具、即时打窝、三专材出售和重量区间售鱼。可编辑示例保存在服务端 `docs/垂钓系统/QQ页面排版_可编辑.md`；最新为52个主页面、68张预览，Boss／周赛另标未实装设计。

主页底部按3+2分行。赐福顶部仅展示凡物到当前鱼塘已解锁境界，每行最多4项；默认当前塘境界，`blessingRealm` 可明确传0选择凡物；每境界完整显示五种鱼。放生按钮只取原预览，不自动消费；满星隐藏操作，缺鱼显示渔获入口。主页状态独占一行，下一行为甩杆/收杆，再下一行为使用渔具。运行中竿/饵序冻结，手动窝可同种加时、异种确认替换；可与闭关、探索等其他玩法并行。

## 实施过程验证（历史）

以下按开发阶段保留，旧页面数与旧测试数不累加；最终发布锚点、52／68图册及证据口径以末尾归档说明为准。

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

| 入口                                          | typed operation / fields                                      | 服务端                                                             |
| --------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `/垂钓`、渔获/鱼种/单尾、设置、待入袋         | `fishing.query`；`view/speciesId/catchId/page/returnPage/sku` | Query，各层独立页码与本人过滤                                      |
| `/垂钓 赐福`                                  | `view:blessing`，不传 `blessingRealm`                         | 默认当前塘境界                                                     |
| `/垂钓 赐福 0` / `凡物`                       | `view:blessing, blessingRealm:0`                              | 指针区分0和未传，显示凡物五鱼                                      |
| `/垂钓 赐福预览 <鱼种>`                       | `fishing.preview` / `kind:blessing-unlock, speciesId`         | 固定最轻可用的所需尾数，原引用确认                                 |
| `/垂钓 升竿 <fr_编号>`                        | `kind:rod-upgrade,rodId:string`                               | 精确原竿版本/成本，不改短号                                        |
| 渔市买卖切换                                  | `shopMode:buy/sell,shopCategory`                              | 购买五类／出售鱼类和素材；购买显式Currency、Quantity为相应币种包数 |
| `/垂钓 区间售鱼 <最低kg> <最高kg> [鱼种编号]` | `kind:sell-fish-range,minWeightG,maxWeightG,speciesId?`       | 最多3位小数精确转克，闭区间；原引用固定原鱼清单，确认不重选        |
| 灵晶×100购买                                  | `kind:cashout,currency:crystal,quantity:100`                  | 原额度按晶计，不改每日上限                                         |
| `/垂钓 礼包购买 <sku>`                        | `fishing.pack-checkout` / `sku`                               | 原订单checkout；群聊在客户端与expose入口拒绝                       |
| `/垂钓 确认 <r1_y>`                           | `fishing.confirm` / `ref`                                     | 原5分钟预览、本人绑定及SQL回执重放                                 |
| `/交易上架 鱼类 <fc_编号> [价格]`             | `market.sell` / `catchId:string`                              | 数量1、精确克重、先预览                                            |
| `/交易上架 鱼类 确认 <r1_y>`                  | `market.sell` / `mode:confirm,reference`                      | 原市场确认，非 fishing.confirm                                     |

源码已由主任务推送上述两main；应用部署与平台验收以服务端发布记录为准。

本轮新增设置主界面四组与种类/主饵/优先序选择子页；修改以partial取得原预览，false与legacy ChumTier=0不丢失，未指定字段不清空。运行中可以保存下次偏好，竿/饵序不变，当前手动窝另走即时预览；开钓页六种时长保持1/4/6及8/12/24两行。设置截图位于仓库外 fishing-settings-after.png 与 fishing-settings-before-after.png，前者是实际处理器离线节点。

锦鲤收益接线补充：秘境挑战/扫荡解析可选experienceBonusText，仅非空时显示；主线与比试保留normalExperienceGained及宝物分拆，只追加“含锦鲤”说明。打劫/三连/反击原来省略BonusText的分支只补锦鲤片段；丹药normalMessage已由服务端保留锦鲤，客户端不重复拼接或重算。八个真实框架套件合计286项通过，其中10项验证锦鲤说明与宝物实际收益各出现一次、显示原普通修为而不再加入锦鲤数值。截图fishing-blessing-receipts.png和fishing-blessing-receipts-before-after.png使用真实处理器离线发送节点。

自动窝接口边界：chumType为现有种类、count0、tier可0时交服务端合并已存设置后预算；none/无窝0明确本次不预装。偏好baitOrder空数组允许交服务端判断（切换开启仍由服务端拒绝），不再由adapter抢先拒绝所有清空请求。所有键、范围、唯一性与本人身份校验保留。

## 最终无阶窝、渔具、推送与战报

六种散仅`chum:kind`，不含tier。所有鱼塘每份窝料固定六小时，不按等级缩短时长。当前打窝页显示本人可用raw份数、当前余效，同种加时或异种明确作废旧剩余效果再确认替换；设置持续窝策略不与即时打窝混用。自动最多四个六小时批次，竿/饵序冻结；所有购买与消费均先原预览再手动确认。

新增`tools`与`cast`查询、`use-net`与`use-chum`预览，以及PushRareFish/PushFishKing两个独立partial开关。通知只采用现有投递通道，并提供实际`/通知设置`入口；测试未向真人发消息。战报按castId+本人过滤，纯数字仍历史页码，私有种子与完整玩家快照不输出。捕灵网只消耗两小时窝效而不提前普通EndAt，竿饵不影响且不扣饵；后端preview提供实际耗用明细。鱼饵只钱/石售，钱无限、石素饵无限且其他每种各10份/日，晶道禁止直接购饵；礼包赠饵不变。全部goods实价来自服务端VIP资源店报价，兑换与RMB礼包不打折。

最终八套真实框架测试286/286通过（含设置partial、用网原引用、即时窝、本人cast、禁售页与旧外部玩法回归）；完整日志在`D:/data/alemone/bubble-style-mockups/fishing-qq-final-tests.log`。全src与三个新增套件定向tsgo通过，全`yarn lint:fix`通过。实际发送节点45条不同垂钓蓝链全部通过原CLI parser往返，结果在`fishing-command-roundtrip.json`；此检查仍不代替真实QQ平台验收。

新增截图（均本地真实handler发送节点＋服务端事实夹具）：

- `D:/data/alemone/bubble-style-mockups/fishing-current-chum-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-tools-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-cast-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-settings-after.png`
- `D:/data/alemone/bubble-style-mockups/fishing-home-before-after.png`

可编辑QQ稿已扩至25页。截图与JSON均留仓库外，代码不含预览产物。

## 2026-11-04 窝料报价与周限文字同步

本轮仅更新渔市／设置／即时打窝文字夹具及本记录：聚鳞散基础单价改为1000钱，筑基塘示例显示“本周限购 1 / 1”，购买仍为1份raw，已有库存、付款及使用份数不改。钱／晶两页每种散独立周限，每页每种每周统一限1份，所有鱼塘每份固定6小时；北京时间周一重置，升塘不扩容、不清零本周已用，道晶不限。升灵散最终基础价为8000钱／1600晶／40道晶；全部报价由服务端提供，QQ不计算。旁边灵晶兑换商品的“日限购 2 / 2”属于原兑晶额度，保持不变。

使用既有只读ESM资源loader执行`test/framework/fishing.test.ts`，真实处理器／Hook／Format发送节点检查38/38通过；定向tsgo通过，日志为`D:/data/alemone/bubble-style-mockups/fishing-qq-chum-fixed-six-hour-tests.log`。即时打窝仍用原7份引珍散夹具，只将新增时长改为42小时；生产src没有改动，服务端文件没有改动；本记录不新增线上部署或真实平台验证结论。

仓库外`fishing-after-nodes.json`、`fishing-shop-after.png`、`fishing-pages-after.png`按新夹具重生，另保留`fishing-shop-fixed-six-hour-before-after.png`文字对照。全部为本地发送节点预览，服务端事实使用测试夹具；所有蓝链保持autoEnter:false且无show。

## 2026-11-04 图册迭代记录与渔市导航（历史）

本轮以用户最新五分类方案覆盖前述四币／双排导航：仅一行“饵料、窝料、钓具、渔具、素材”，不显示全部或货币标签。商品自身显示各支持币种的单价、包装、限购和购买按钮；旧币种查询参数只兼容读取，原付款与确认载荷不改。鱼饵石价按1份、钱价按10份；窝料钱／晶每种分别每周1份，道晶不限，每份固定6小时，升灵散为8000钱／1600晶／40道晶。素材含三专材及两种单向兑换；10钱兑100灵石无日限、10钱兑1灵晶仍受原每日晶额度限制。三专材回收经原预览和本人短引用确认，矿石精华不进入回收池。

本轮三个真实框架套件62/62通过，定向tsgo通过，日志为`D:/data/alemone/bubble-style-mockups/fishing-full-review-20261104/final-framework-tests.log`。另以实际QQ处理器、HTTP／DTO解析和Format发送节点捕获43个页面变体，43/43通过，逐条验证所有蓝链autoEnter:false、无show且完整指令不超过80个Unicode字符；服务端事实均为夹具，不代表平台实机、部署或真实支付。新Boss／周赛13张只使用同一外壳设计示意，不绑定未注册命令，候选奖励已标明，未纳入可运行测试。

本轮图册目录为`D:/data/alemone/bubble-style-mockups/fishing-full-review-20261104`：`index.html`为42主页面／56图入口，`latest-market.html`及`latest-market.png`为最新六张渔市，`最新渔市样稿.md`为可复制文本，`pages`为单图，`sheets`为七张长图，`captured-nodes.json`和`capture-tests.log`为43个真实处理器离线证据。九阶塘／VIP0仅作展示示例，并非真实账号。当时的审阅状态已被后续用户授权推main覆盖；最终状态见本文件末节。

## 2026-11-04 最终买卖切换与重量区间

用户后续规则覆盖上节导航：顶部提供“转为出售／转为购买”。购买仍五分类、各商品多币报价，购买页删除全部回收价及回收操作；出售仅鱼类／素材两类。鱼类按本人持有鱼种聚合，只给查看详情进入既有背包该鱼种页，保留原逐尾出售；素材“出售”直接预览1份，旧数量选择入口兼容。分页保留mode与category，旧币种只读入口仍可解析。

新增区间引导、原预览与回执：kg最多3位小数以十进制整数转换成克，两边必填且含端点，拒绝科学计数、额外精度、逆序和超出JSON安全整数；鱼种可选。取消保留升塘鱼的全部新操作与说明，售鱼只跳过锁定、上架、待入袋及他人资产。原预览显示选中鱼种数量、总重及总价，所选原编号由服务端冻结；确认不重选、不把后来入袋鱼扩大进清单。升塘原预览继续按轻鱼优先并显示总重、前12条原编号和重量，其余仍冻结，不声称存在新分页。

最新三套真实框架68/68通过，50个实际处理器离线图例50/50通过；所有发送节点命令均manual、无show且不超过80个Unicode字符。日志为同目录`market-mode-framework-tests.log`与`capture-tests.log`。图册已扩展为47主页面／63图：实际处理器离线50图、Boss／周赛未实装设计13图；`latest-market.html/png`现含购买六页与出售两页，八张长图在`sheets`。本轮未重绘未变化的Boss／周赛单图，未修改其来源哈希；当时暂缓发布，后已获得用户授权推main；最终发布由主任务统一记录。

最终顺序补丁仅移动渔市买卖切换行：标题→四币余额→转为出售／购买→分类，其他页面不动。新增买、卖两种真实输出顺序断言，并更新既有出售链路断言，定向3/3通过；仅重新捕获受影响8页，8/8通过，合并保留其他42个原实际处理器图例。日志`market-order-framework-tests.log`、`market-order-capture-tests.log`；图册47／63不变，重生市场8图、出售流程和受影响长图，不重跑Go业务全套，不宣称新增平台验收。

## 本轮最终规则与用户精确样稿

用户已确认强化在本地实现：稳竿所有鱼F＋40%；流云普通A～C鱼F＋40%、基础周期×0.8；照渊D／E鱼F＋25%、珍稀出现权重×3／鱼王×5。钓具与渔市直接读取最新typed目录，不影响战斗；青竹只建塘赠送，三种进阶竿永久各限1，拥有同种任意阶或礼包获得即隐藏。售鱼详情显示逐尾向上取整整数钱；升塘仅交鱼耗材，不再要求人物境界或钓技等级，建塘需炼气九层及以上与10000灵石。

渔具页严格使用用户五行说明、单捕灵网引用块与“使用预览”，底部仅渔市／返回；旧显式水域命令兼容。放生原预览显示最轻渔获的逐尾原编号、重量及总重，确认只发原引用，不重查新鱼。图册第21页合并赐福列表与10尾、9.000kg放生预览两条消息，仍47主页面／63图。Boss队伍、挑战预览、奖励回执及候选掉落页使用用户最终极简文本，正常换行；始终标为未实装设计。

最新三套真实QQ框架71/71通过，覆盖完整放生重量与原引用重试、渔具精确布局以及既有买卖／设置／市场等路径；全量50个实际handler页面变体50/50通过，实际消息55条，全部命令manual、无show、≤80个Unicode字符。定向类型与eslint通过。日志为图册目录`latest-rules-framework-tests.log`和`capture-tests.log`。本次全页重新生成，五项文档来源SHA及十二项目录／查询／展示源码SHA记录在`pages-definition.json`；服务端完整业务回归由主任务独立汇总。这里只证明本地源码与离线节点，不代表已推送、部署或平台实机。

## 2026-11-04 公共前缀合并后的最终入口校对

后续已按授权推送两main，准确SHA见本文件归档说明，Web不改。开塘最新门槛为炼气九层及以上，费用10000灵石不变；首次未建塘入口显示一次“壁后幽潭”四段剧情，剧情不发物，整修仍先原建塘预览，成功只赠一次青竹灵竿。已建塘不插叙。

实际洞府主页在锻造师之后、天书之前增加垂钓入口，沿用原profession.dashboard单次查询，没有新RPC或虚构权限键；自定义命令前缀仍生效。普通储物袋主页沿用原storage.menu与三行主分类，渔获位于第一行；另补实际道具／材料“其它”处理器预览，饵窝网在道具其它，三专材在材料其它。它们不是垂钓renderer，实例与数量是独立夹具。

最新五套真实QQ框架131/131通过（原三套垂钓、洞府、储物袋恢复），覆盖前缀、手动入口、原确认、展示顺序及失败不伪造库存。日志为图册目录final-entry-storage-framework-tests.log。此前公共前缀合并后的command-prefix／spar-batch／treasure-effect-receipts三套96/96通过，见merge-regression-tests.log。定向tsgo含全部src及上述相关测试通过，修改src的eslint无错误；这些证据不代表QQ平台实机、部署或支付完成。

图册最终52个主页面／68张变体：55个真实处理器离线案例与13个Boss／周赛未实装设计。新增第48页首次剧情、第49页洞府入口、第50／51页普通道具／材料其它、第52页储物袋主页；其它最终规则与用户精确Boss样稿保留。index.html为统一入口，pages为单图，sheets为九张长图；最新来源SHA记录在pages-definition.json。全部新垂钓命令及洞府垂钓入口显式autoEnter:false、无show、完整指令不超过80个Unicode字符；原储物袋公共导航沿既有手动默认，不更改无关框架。

## 归档说明（最终发布源）

本轮源码已推送：服务端`d05e2d637ad7ec17ac4e284b1a8e344e44698bdb`，QQ`2c9b0d260f17c6d41cedad9b4f6eda5015f11ef9`；本地读取HEAD与发布锚点一致。本节是推送后文档整理，不把前文旧“本地／待发布”阶段误认为当前状态。数据库和应用发布层次见服务端`docs/垂钓系统/发布记录_20261104.md`；归档不改运行代码、SDK、数据库或数值。

最终52个逻辑页面／68张页面图，55个真实处理器离线案例＋13个Boss／周赛未实装设计，共61条实际发送消息。373个命令蓝链均手动、无show、无autoEnter:true；本轮新增垂钓／洞府链接显式false，原公共导航保持默认手动。样例最长55 Unicode／69 UTF-8字节，最大合法引用另有80字符预算测试。统计是本图册的捕获样本，不泛化为全部生产配置。

主五套131/131通过与随后市场定向11/11通过分别保留，市场定向覆盖主套已有用例，不相加为142。全量页面捕获55/55通过；公共前缀等96项回归属于独立历史证据，亦不累加。对应日志在图册目录`final-entry-storage-framework-tests.log`、`market-anchor-by-slot-framework-tests.log`、`capture-tests.log`、`merge-regression-tests.log`。类型检查和src lint结果沿发布前记录；本轮文档归档不新增业务测试、平台投递或支付验收结论。

最终玩家市场按A／B／C／D／E为10／30／30／50／100倍同币值参考价。以逐尾NPC整数钱价按10钱＝1晶换算、乘槽位倍率并向上取整；金须鲤1840g→63晶、1200g→42晶。QQ仅展示服务端事实，不计算报价，不改变NPC售鱼、信誉区间、手续费和旧成交。A档参考1晶的极低价鱼仍按原规则最低挂牌2晶。最新版本`fishing-v1-5f625ef617c10532`；先前统一100倍临时结果不属于最终证据。

图册没有珍宝楼报价、真实支付到账、退款审核、通知实投的独立最终截图；这些不能用离线礼包入口或NPC售鱼图代替。50／51页旧“公共包入口可返回袋”说明已在可编辑MD纠正：实际栏为我／战／本／动／店，“本”是主线；现有其它物资页无返回袋按钮，可手输`/储物袋`回主页。本轮只订正文档，没有补造按钮或改变截图。

可编辑MD末尾已补实际入口链：洞府→垂钓、首次剧情→建塘、储物袋→渔获→鱼种→单尾、普通道具／材料其它、渔市买卖／区间／专材出售及玩家市场外跳。Boss／赛事13页始终仅设计，未把候选规则写成生产功能。图册统一入口、单图、长图及来源SHA仍在`D:/data/alemone/bubble-style-mockups/fishing-full-review-20261104`，只刷新元数据，不重新渲染或改变52／68布局。
