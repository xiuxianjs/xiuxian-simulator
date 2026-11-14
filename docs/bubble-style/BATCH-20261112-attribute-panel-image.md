# 属性面板图片

`/属性面板图` 使用已有水墨模板渲染属性，通过 QQ 原生图片消息发送。图片之后的气泡提供恢复效率、培元丹和已开放的装备、功法等入口。渲染或投递失败时，使用同一次查询结果显示完整文字面板。

离线框架测试覆盖群聊、私聊、图片不可用、投递失败和原 `/属性面板`。对照图保存在仓库外的 `bubble-style-mockups/attribute-panel-20261112/attribute-panel-comparison.png`。

文字面板的战力、属性值、上限和效率使用逗号分隔千位，保留小数和百分号。UID、MID 保持原样。数字格式对照图为同目录的 `attribute-panel-number-format.png`。

2026-11-15 文字属性面板的五项自由属性改为单行显示「属性（百分比）　当前值 / 上限」，移除字符进度条，保留培元丹快捷按钮。百分比按当前值除以上限四舍五入，上限有效且当前值为正时显示 1% 至 100%。[改前与改后排版示意](/Users/lemonade/Documents/bubble-style-mockups/free-attribute-percent-20261115/comparison.png)
