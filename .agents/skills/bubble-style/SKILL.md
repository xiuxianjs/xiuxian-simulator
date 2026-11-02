---
name: bubble-style
description: 新增或修改 QQ 气泡展示时必须启用的排版规范入口：涉及 src/response 下 res.ts、列表/详情/结果/通知/错误页、分页、按钮与符号时，先读本 skill 再写代码。
---

# 气泡样式规范（bubble-style）

## 什么时候用

- 新增任何 `/xxx` 指令的气泡处理器（`src/response/**/res.ts`）。
- 修改已有气泡的标题、事实行、按钮、引用块、分页、返回入口。
- 修改 `src/response/presentation/**` 或 `src/utils/messageHelper.ts` 的渲染能力。
- PR 评审时检查气泡排版是否符合规范。

**不要**只凭旧代码模仿：旧页面里大量 `createQuoteMarkdown` 手写行是待迁移的历史写法。

## 先读什么（按顺序）

1. [DESIGN.md](../../../docs/bubble-style/DESIGN.md) —— 总纲：分区模型、符号、ID 规则、事实行标签表、分页、返回、按钮预算。
2. [src/response/presentation/index.ts](../../../src/response/presentation/index.ts) —— 组件入口。
3. 同目录 [content.md](content.md) —— 组件 API、代码示例、正反例、验证命令。

## 十条硬性规则（速查）

| #   | 规则                     | 说明                                                                                                                                          |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 优先用 presentation 组件 | 新气泡写 `buildBubble`/`listBubble`/`detailBubble`/`confirmBubble`/`resultBubble`/`errorBubble`/`noticeBubble`，不手拼 `createQuoteMarkdown`  |
| 2   | 单对象页禁止分组标题     | 主页/详情/面板：一个引用块 + 空行分段；`目标/代价` 等语义段除外                                                                               |
| 3   | 列表页用对象行           | 一个对象一个引用块；对象行 `**名称**`，不是 `【名称】`                                                                                        |
| 4   | 编号并入对象行           | `section({ title, id })` → `**名称** #123`；禁止 `ID：123` 单独成行；序号同样并入 `#N`                                                        |
| 5   | 事实行必须带标签         | `时间：`/`结果：`/`数量：`/`状态：`…；禁止裸值行；标签只用 DESIGN §5.9 表内词                                                                 |
| 6   | 视角标签用 V3            | `**阿青** #12 · 进攻方`（suffix），不塞进标题或事实行首                                                                                       |
| 7   | 返回类按钮放页脚         | 不写进 `header`；`FormatGui` 会兜底把 header 里的「返回*」移到底部                                                                            |
| 8   | 分页只用 nav             | `nav: { current, total, count?, command: '/xx {page}' }`；禁止手写页码与自制翻页按钮                                                          |
| 9   | 符号只用规定集合         | 四态 `✅ ❌ · ⚠️`、奖励 `🎁`、锁定 `🔒`、通知图标；禁止 `🎉 ✨ 💰 📦` 等装饰符号                                                              |
| 10  | 按钮预算                 | header ≤3、逐条目 ≤3（背包类 ≤4）、页脚 ≤2 行、普通页总数 ≤10（+5 键盘）、主页 ≤18                                                            |
| 11  | 长列表必须分页           | 条目数可能超过 8 条的列表页（背包/邮件/好友/订单/记录类）一律加分页：`nav: { current, total, count?, command: '/xx {page}' }`，禁止一屏塞全部 |

## 新增气泡流程

1. 判断页面类型（列表 / 详情 / 确认 / 结果 / 错误 / 通知 / 目录）→ 选模板。
2. 写组件调用（参考 content.md 示例）。
3. 本地验证：`tsgo` / `node_modules/.bin/tsgo --noEmit`、`yarn lint:fix`、相关 `node tools/run-framework-tests.mjs --filter=<域> --offline`。
4. **出「改前 vs 改后」对照图**（用户硬性要求）：渲染产物放仓库外 `D:\data\alemone\bubble-style-mockups`，仓库只提交代码与 `docs/`。
5. 更新 `docs/bubble-style/BATCH-*.md` 交付记录；新标签/新规则同步 `DESIGN.md`。

## 明确禁止

- 手写 `【】` 包裹对象名、`ID：xxx`、`序号：xxx` 行。
- 把 `返回` 放进 header；把分页按钮放进 footer。
- 裸值行（`2026-10-30 20:00`、`我获胜`）。
- 用装饰 emoji 当状态（`🎉 成功`）。
- 改写服务端文案（边界 B）：服务端 text/quote 必须原样展示。
- 为对齐样式删除已有按钮或功能入口（零阉割）。
