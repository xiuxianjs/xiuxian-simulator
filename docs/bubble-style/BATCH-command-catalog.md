# 指令大全

- 在 `/更多` 首页新增「指令大全」。`/更多 指令大全 [页码]` 按原表顺序展示，每页 10 条，重复显示四列表头。
- 正文由 [指令数据变量](../../src/response-apps/more/commandCatalog.ts) 生成。翻页使用公共 `nav`，返回入口位于页脚。
- [机器人指令表](../机器人指令表.md) 是供查阅的文档。机器人从编译后的指令数据生成目录页。
- 对照图位于仓库外的 `bubble-style-mockups/command-catalog-before-after.png`，用于检查目录入口、表格和翻页布局。
- `tsgo`、`yarn lint:fix`、`yarn build` 与指令大全定向框架测试通过。测试覆盖入口、原表内容、前后翻页、末页和返回按钮。
- 官群按钮测试在基线与本次改动后均失败。展示组件测试中通知气泡的 `/出关` 按钮断言失败，该通知路径未涉及本次改动。QQ 实机表格样式尚未验证。
- 参数使用「必填」「可选」说明。参数写法的对照图位于仓库外的 `bubble-style-mockups/command-catalog-parameter-labels.png`。
