# 垂钓礼包、支付与购买消息修订（2026-11-04）

本轮只改QQ接线与展示，服务端商品、抵扣、确认设置和开钓配置由后端负责。用户已最终授权完成校验后推送main，由主任务统一执行；本分任务未独立提交或推送。历史52个逻辑页／68张图册保持原样，本轮另交独立改前／改后预览。跨日追加内容于2026-11-05收口。

## 页面与动作

- 礼包页读取服务端单选SKU及四个标签，当前SKU沿日礼包组件显示`▸`，支持手输已登记中文名称映射至ASCII SKU；未知中文不请求接口。金额、已购抵扣及待补权益全部按服务端显示，不在QQ合包或计算折扣，不显示“超值百分比”。
- 礼包下单复用日礼包原二维码组件、10秒轮询／5分钟等待、原支付状态查询和到账回执。收到待支付原单后才展示二维码；不放宽`PENDING`校验，不将旧`PAID`／`TIMEOUT`当作新收银台。投递未确认时不继续生成图片或启动轮询。
- 已知单号的解析失败、二维码失败及后端可恢复409／503，保留查询原订单和恢复原订单入口。不重复创建，不改成新订单重试。二维码底句也改为查询或恢复原订单。
- `runRobotBusiness`只增加默认不启用的末尾错误回调；仅垂钓礼包利用安全`error.details.orderNo`和`recoverable`生成原单导航，其他调用保留原路径。
- 购买列表按用户要求把物品标题整行加粗并加`【1】`等显示序号；序号不作为商品ID。出售页不加序号。打窝、饵料、钓具、赐福等引用物品标题加粗，原事实、星级和动作位置保留。
- 首页状态、甩杆／收杆、使用渔具逐行，原3＋2底栏之前加用户指定分隔线`——————`。
- 渔市购买确认和完成正文沿普通商店句式，不套多余引用块。低阈值自动完成由后端返回权威回执，QQ不主动确认。普通`fishing.preview`仍只预览；购买命令改用`fishing.purchase`并显式携带`kind:purchase`。
- 无参数`/垂钓 开钓`改用`fishing.start-current`并显式携带`kind:start-current`，指定唯一原竿编号时同时传`rodId`，后端按当前配置直接开始，最长12小时。QQ不猜竿或饵、不自动买物资；旧详细参数CLI兼容1／4／6／8／12小时，页面不再生成时长参数，拒绝新开24小时。原已受理24小时会话及回执不在客户端重写。只读expose预览不开放`start-current`。
- 收杆／收竿直接调用`fishing.stop-current`，不再取得确认预览；原只读`preview kind=stop`继续兼容。直接开钓、收杆及购买结果不明时只引导核对状态与原结果，不误称缺少预览。
- 赐福新增总览入口；无参数默认总览由服务端决定，显式凡物0继续传境界指针。标签先总览，再只列已解锁境界，仙塘最多11标签，专门允许3行、每行4个；其它页面原2行6个限制不变。总览只显示后端合计，不在QQ重新相加。
- 捕灵网新回执用单个紧凑引用块，鱼名加粗与重量同行，物品名加粗与数量同行；必要待入袋提示保留。旧回执按原响应兼容，不在QQ重算或重写。
- 可选`emphasisNames`只来自服务端权威名称名单，缺省／null兼容旧JSON。同一引用里多件物品按最左命中、同位置最长名称各自使用bold节点；原字符、数量、价格及重量保持正常内容，不注入`**`文本或猜测物品代码。
- 支付到账的`fishingPack`分支也单独加粗原礼包名及物品名，数量正常字重；只有RodIDs时保留原凭证文本和查看钓具入口，不猜竿名，不改其他充值分支。
- 设置最终仅备用顺序与稀有鱼／鱼王推送；主饵由主页独立选择。`primaryBaitType`与`baitOrder`分别partial保存，不互挪字段；配置和手动打窝调用`fishing.configure`直接生效，换饵从下一竿开始。原只读预览工具语义不变。
- 钓具、鱼种列表、鱼谱、历史及战报隐藏可见对象代码；pending只隐藏`fc_`内部记录号。实例／单尾详情和pending鱼的`ff_`独立编号继续可见，所有动作仍携带原完整ID。历史缺名称模板的中文待核对说明沿后端原文，不伪造物品名。
- 可见实例对象行是名称bold、完整编号与suffix普通文本；购买列表按用户要求保持整行序号与名称bold。鱼的kg／千克前统一显示重量，鱼尾数和材料数量仍显示数量。

## 验证证据

修订中期8套真实QQ处理器框架测试191／191通过，0跳过：`fishing-packages-payment`（该阶段25项）、`fishing`、`expose-fishing`、`recharge-periodic-packs`、`recharge-loop`、`recharge-ux`、`recharge-product-layout`、`fishing-market`。这是一个组合结果，不与历史131项、11项或中间188项相加。包含真实发送节点与回执检查、原R1确认、只读／写RPC隔离、群聊不下单、手动蓝链和80 Unicode字符命令预算。

最终在QQ基底`53abf886016825427cfe86e70b46e394c8336ed1`上，七套必要回归161／161通过、0跳过：垂钓主套、新礼包支付与展示、expose、鱼类市场、command-prefix、default-prefix-compat、plugin-continuation。最新三套前缀／续传回归包含远端合并后的实际路由和事件发送。161与前述191包含重叠，不相加；日志为`latest-target-tests.log`。

`test/fixtures/fishing-checkout-actual-wire.json`来自服务端`TestFishingCheckoutActualRobotWireShape`：真实外层机器人路由、隔离SQLite、测试支付provider；覆盖待支付订单uint32上界ID、普通套餐ID0、空支付／退款时间、409旧超时单与503签链失败的原单详情。`fishing-package-views-actual.json`是服务端隔离Query导出的6元单包和50元合包事实。这些不是生产账户或实际收款订单。

额外16／16版式／渔市／SDK13.6设置捕获和1／1发布前支付处理器捕获用于对照图，不累计为产品业务测试。全部`src`及相关测试的定向TypeScript检查通过，随后全src `yarn lint:fix`通过（74.36秒）；`git diff --check`无内容错误。

捕获样本共438个按钮，其中434个QQ命令、4个外部测试支付链接，均不自动发送且无`show`。命令样本最长47 Unicode字符／55 UTF-8字节；80字符上限及原R1凭据边界另有测试。这是当前样本统计，不声称覆盖全部生产账户或实际平台投递。

## 对照图

仓库外入口：`D:/data/alemone/bubble-style-mockups/fishing-packages-20261104/index.html`。

6组对照：`packages.png`、`checkout.png`、`home.png`、`shop.png`、`chum.png`、`blessing.png`。另有16个补充页面，涵盖合包、支付恢复／到账、购买确认／成功、首页、网、钓具、赐福总览、设置、主备选择、直接回执、中文记录及鱼实例编号边界。完整长图为`comparison.png`；真实VIP8渔市六页为`latest-market.html`／`latest-market.png`。二维码来自现有`PayQrCode`组件本地渲染，样例支付地址是测试provider，不可作为真实支付使用。

`latest-target-tests.log`、`layout-capture.log`、`captured-nodes.json`及`evidence.json`保留真实节点与来源SHA；文本归档为`QQ消息样稿.md`。改前支付运行QQ `56b3da6b6332317abe8710dfad5dab80c423f9b0`原处理器，礼包改前使用已归档列表；首页、赐福鱼名版式对照沿相同历史夹具，最新总览另有实际Query页。打窝、设置、礼包、渔市及网改后采用本轮最终后端实际导出；记录pending另有明确标识的确定性读投影夹具。每页为独立演员与测试时钟，不把它们拼成真实人物连续时序。所有图片均是离线预览，未向真人投递，未验证实际支付平台、线上到账或部署重启。

采用仓库`.agents/skills/bubble-style/SKILL.md`与`.github/skills/bubble-style/SKILL.md`；所引用`docs/bubble-style/DESIGN.md`在当前检出不存在，未创建替代总纲。用户明确要求的序号括号、分隔线及原`┃`分组优先保留。
