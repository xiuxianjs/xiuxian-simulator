# 查看他人资料：天赋与灵根

在公开资料境界下方增加灵根名称、品级，以及三类天赋名称、效果、生效状态，复用 presentation section。原属性及洞府信息保持不变。隐藏资料不读取或返回天赋、灵根；未发放明确提示；旧服务端缺字段时保持原展示。

服务端复用目标 UID 的 talent.Read 与 SpiritRootService.View，无数值规则、数据库结构或写入变更。机器人与服务端均需发布才能展示新增信息。

定向框架测试覆盖公开、隐藏、未发放、旧响应，并断言目标 UID、实际发送节点及成功回执。对照图放仓库外 bubble-style-mockups。

验证结果：tsgo --noEmit、yarn lint:fix、四项 public-profile-innate 离线框架测试、TestRobotBusinessPublicProfileTargetPrivacyAndAdmission、service 的 TestPublicPlayerProfile 回归通过。扩大 HTTP 回归中 TestPublicPlayerProfileQueryRouteReturnsViewerAwareCaveAndVisibleAttributesReadOnly 因夹具缺少 game_configs 表失败；make docs-check 因缺少三个 internal/channel/gm/merchant-mail 路由定义失败。未部署或做 QQ 实机验证。

示意图：/Users/lemonade/Documents/bubble-style-mockups/public-profile-before-after.png（示意数据，非平台截图）。
