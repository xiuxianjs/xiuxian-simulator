# 上古龙鲤与沧澜钓仙会：QQ接线与页面

日期：2026-11-05。分支：`codex/fishing-events-qq`。用户已采用[13类页面样稿](垂钓奇遇与钓仙会页面样稿.md)，本轮仅交功能分支，不推main，不部署生产，不向真人发消息或运行真实支付。

## 数据与操作契约

继续使用`FishingView`，新增`boss`、`boss-drops`、`boss-battle`、`boss-rewards`及`contest`、`contest-species`、`contest-ranking`、`contest-rewards`、`contest-history`九个页面值。新增输入`eventId`、`battleId`最长40个现有ASCII标识字符，`week`为北京时间周一的绝对`YYYY-MM-DD`日期。查询可以省略周次由后端选当前周，领奖必须指定原周，不能把“上周”当作可跨周漂移的写入参数。

| 命令 | 后端操作／字段 |
|---|---|
| `/垂钓 奇遇 [奇遇编号]` | `fishing.query`，`view=boss`，可选`eventId` |
| `/垂钓 奇遇掉落 [奇遇编号]` | `fishing.query`，`view=boss-drops` |
| `/垂钓 挑战 <奇遇编号>` | `fishing.preview`，`kind=boss-challenge`，`eventId` |
| `/垂钓 奇遇战报 <战斗编号> [页码]` | `fishing.query`，`view=boss-battle`，`battleId/page` |
| `/垂钓 奇遇奖励 <奇遇编号>` | `fishing.query`，`view=boss-rewards`，`eventId`；只查原首胜回执 |
| `/垂钓 大赛 [周一日期]` | `fishing.query`，`view=contest` |
| `/垂钓 鱼榜 <鱼种编号> [页码] [周一日期]` | `fishing.query`，`view=contest-species`，`speciesId/page/week` |
| `/垂钓 积分榜 [页码] [周一日期]` | `fishing.query`，`view=contest-ranking` |
| `/垂钓 赛奖 [周一日期]` | `fishing.query`，`view=contest-rewards` |
| `/垂钓 赛史 [页码]` | `fishing.query`，`view=contest-history` |
| `/垂钓 赛领奖 <周一日期>` | 独立写RPC`fishing.contest-claim`，仅传`{week}` |

Boss继续使用原`r1_y`预览与`fishing.confirm`。客户端不保存完整名单或奖励的权威Map，不在确认时重新查询替换队员；确认仍只提交原短引用。Boss首胜自动发奖，没有另造Boss领取写接口。比赛领取复用原平台消息幂等上下文，后端按周＋UID保证原奖励一次；QQ请求回归不等同于数据库已验证一次发奖。

`get_fishing`观察工具增加新查询字段；`preview_fishing_action`只获得Boss原预览。新增`claim_fishing_contest`为独立授权写工具，拒绝额外UID、非周一日期和损坏编号，不把领奖塞进只读工具。原购买、开钓、收杆、配置及支付流程未改。

## 展示

新页面消费服务端`navRows`、`nav`、`emphasisNames`及原事实，不在QQ计算比分、按当前持鱼重建成绩或分配掉落。赛事底部保留三项操作与返回分行。可选响应字段`section.quote`明确普通行／引用组；缺省仍按原规则，匿名`┃`组无需客户端猜业务下标。该字段只涉及响应DTO，不进入数据库或SDK；原网获紧凑回执特殊排法保留。

事件触发者、Boss境界、剩余次数、期限、参战名单和奖励权限均来自后端。触发者可看本事件原获胜名单全部个人奖账，普通参战者只看本人原奖账；非参与者的拒绝由后端负责。内部事件号和战斗种子不作为页面事实额外展示，按钮保留完整原编号。

13类样稿包括发现、挑战面板、预览、战报、奖励、终态、掉落、赛事主页、鱼榜、积分榜、排名奖、升塘提示及周结算。升塘提示最终应并入原升塘预览，不增加单独绕过原耗材的转区写操作。具体数值与候选规则由服务端统一冻结，不因这份页面稿在客户端另建配置。

## 当前证据与边界

- 最终五套联合166／166通过、0跳过：新增`test/framework/fishing-events.test.ts`52项，及原`fishing`、`fishing-packages-payment`、`expose-fishing`、`fishing-market`114项。该次结果不与中间40项或历史131／161等重叠轮次累计。运行真实处理器、Hook、HTTP客户端、Format和成功发送节点，覆盖17种短命令参数往返、原R1重复确认、旧周领奖原幂等键、40字符编号＋int32页码、参数和越权字段零后端访问、默认及自定义前缀，以及`quote=true/false/omitted`兼容。
- 新增套内含实际Go服务导出的Boss六页及周赛六页。Boss来自隔离SQLite／Redis、两人合成队伍、一血Boss的实际Query／Preview／Confirm／原生战斗，仅证明协议与结算链；周赛来自合成筑基账号的实际Query／Claim。曾发现战报导航缺少`{page}`和赛事底部超出响应协议上限，已由后端修正输出，客户端未放宽原上限。
- 整个`test/framework/tsconfig.json`类型检查通过；最终运行源码`yarn lint:fix`通过（58.08秒）。日志为预览目录内`final-fishing-tests.log`、`typecheck-final.log`及`lint-final.log`。
- 图册共13类页面、15条气泡：12条实际Go输出经过真实QQ处理器发送节点；发现通知、失败终态、升塘转区说明三条仍是已采用稿的独立展示契约夹具，逐页标注来源。51个蓝链全部`autoEnter:false`且无`show`，样本最长47 Unicode字符／59 UTF-8字节；40字符技术输入编号＋int32最大页码的完整战报命令在处理器测试往返，为60 Unicode字符／72 UTF-8字节，未截断。实际事件号与战斗号由后端生成并校验，客户端不据此伪造存在性。
- 实际排版另做服务端5项定向回归（含两份实际导出）：挑战面板按触发者当前队伍显示人数、姓名、境界与角色；队员查看不要求成为队长，触发者队长资格异常时仍可读原因与「我的队伍」，不提供挑战按钮也不改队伍。赛事主页五鱼合为一组，保留真名加深与原成绩，删除面向玩家的实现登记说明。最终QQ实际节点同时断言这两种分组和三项挑战页脚，未以协议解析通过代替排版检查。
- 最后替换Boss六页实际导出（SHA256：`3bad06f22c7b2c4cf30c0fbba7392d6a7ec5e8e38dfae7ac5e7a87e047fe5191`），将战报目标按原参战快照真名显示为「上古龙鲤」。新增套52／52再次通过、0跳过，断言正文不含内部测试单位代码；与前述166项重叠，不累计计数。本次只重新捕获真实节点、更新04图和总览长图／文本／元数据，其余单页图片及QQ运行源码保持冻结。日志：`battle-delta-qq-tests.log`。

独立预览入口：`D:/data/alemone/bubble-style-mockups/fishing-events-20261105/index.html`；`01.png`至`13.png`、`all-pages.png`、`QQ消息样稿_离线.md`及`evidence.json`保留本轮节点和来源。`comparison.png`左侧是原历史设计shell，右侧是实际Go服务导出经过本轮真实QQ处理器的结果，明确不把左图称作已上线旧功能。历史52／68图库保持原样。

尚待：九境正式Boss模板与强度验证、三条展示契约的实际场景证据，以及最终功能分支发布记录。以上离线证据不证明线上部署、真实QQ投递、Boss难度通过或真实玩家领奖成功。

本轮使用仓库`.agents/skills/bubble-style/SKILL.md`、`.github/skills/bubble-style/SKILL.md`及可用的`.github/skills/bubble-style/content.md`。所引用的`docs/bubble-style/DESIGN.md`和`.agents/skills/bubble-style/content.md`当前不存在，未创建替代总纲。

## 洞府垂钓主页与奇遇入口

顶部依次放「锦鲤赐福」「沧澜钓仙会」和本次「垂钓奇遇」。有本人正在进行的龙鲤事件时才显示第三个按钮，按钮携带原事件编号。开始或结束垂钓及使用渔具各占一行正文。底部第一行是「我的渔获」「渔市」，第二行是「礼包」「设置」「帮助」。礼包入口从渔市移至此处。窝料剩余时间显示为时分数字，如 `余03:27`。

当前没有本人的有效奇遇时，直接发送奇遇或掉落指令只提示「当前没有可查看的垂钓奇遇」。原队伍与已参战玩家仍按权限通过具体事件查看战报和奖励。
