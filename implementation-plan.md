# 实施计划

## 1. 目标

先完成一个可演示的 P0 版本，验证以下核心体验闭环：

| 目标 | 说明 |
|---|---|
| 地图主画布 | 进入产品默认看到地图，而不是聊天流 |
| 自然语言录入 | 用户输入一句话后可看到结构化日程与偏好 |
| 结构化回显 | 顶部悬浮卡片按时间轴展示已识别信息 |
| 地图联动 | 日程自动打点、编号、展示主题 |
| 逐段规划 | 点击开始规划后，按段 loading 并逐段完成 |
| 局部更新 | 用户再次输入后，只更新相关卡片和点位 |

## 2. P0 范围

### 2.1 本阶段包含

| 模块 | 内容 |
|---|---|
| 地图页骨架 | 地图、顶部悬浮卡片、底部输入框、最近输入气泡 |
| 日程识别流 | 输入后生成 mock 日程与偏好数据 |
| 卡片展示流 | 时间轴日程、偏好标签、待确认项、开始规划按钮 |
| 地图标注流 | 根据日程打点、排序编号、展示主题 |
| 逐段规划流 | 起点→日程1→…→终点 的逐段状态切换 |
| 局部更新流 | 第二次输入后局部替换日程和偏好，并做动画反馈 |
| 手动编辑入口 | 卡片中预留编辑入口，P0 可先实现基础表单编辑 |

### 2.2 本阶段不包含

| 模块 | 原因 |
|---|---|
| 真实机票/火车/酒店接口接入 | 先验证交互闭环 |
| 真实路径规划引擎 | 先用 mock 结果模拟分段规划 |
| 语音输入 | 非首版重点 |
| 多方案比较 | 放到后续 |
| 下单/预订闭环 | 当前不是目标 |
| 多人协作 | 当前不是目标 |

## 3. 技术建议

在仓库尚未初始化前，先按以下方案规划。

| 层 | 建议 | 原因 |
|---|---|---|
| 前端框架 | Next.js + React | 方便快速搭建移动端 Demo 与后续接口扩展 |
| UI | Tailwind CSS | 快速搭建高密度交互界面 |
| 状态管理 | Zustand | 适合地图页这种集中式交互状态 |
| 地图 | 高德地图 JS SDK 或腾讯地图 JS SDK | 国内地址、路线、POI 更贴近场景 |
| 动画 | Framer Motion | 适合卡片局部更新、插入、高亮过渡 |
| Mock 数据 | 本地 TS 常量 + 伪异步 Promise | 方便模拟识别与规划过程 |

## 4. P0 信息架构

| 区域 | 内容 | 交互重点 |
|---|---|---|
| 地图主画布 | 当前定位、日程点位、起点终点、路线段 | 空间理解、点击联动 |
| 顶部悬浮卡片 | 日程时间轴、偏好标签、待确认事项、规划按钮 | 结构化回显、编辑、规划状态 |
| 底部输入框 | 自然语言输入 | 输入与追加修改 |
| 最近气泡 | 最近一条用户输入 | 反馈“本次更新来自哪句输入” |

## 5. 核心数据模型

### 5.1 日程项 ScheduleItem

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 唯一标识 |
| date | string | 绝对日期 |
| startTime | string | 开始时间 |
| endTime | string \| null | 结束时间 |
| title | string | 主题 |
| addressText | string | 原始地址文本 |
| city | string | 城市 |
| lat | number \| null | 纬度 |
| lng | number \| null | 经度 |
| order | number | 时间轴顺序 |
| status | `draft` \| `pending` \| `confirmed` \| `changed` | 确认状态 |
| sourceMessageId | string | 来源输入 |

### 5.2 偏好项 Preference

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 唯一标识 |
| type | string | 如 airline / hotel / train / comfort |
| label | string | 展示文案 |
| value | string | 结构化值 |
| required | boolean | 是否硬约束 |
| sourceMessageId | string | 来源输入 |

### 5.3 路线段 RouteSegment

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 唯一标识 |
| fromId | string | 起点节点 ID |
| toId | string | 终点节点 ID |
| order | number | 段顺序 |
| mode | `walk` \| `taxi` \| `rail` \| `flight` \| null | 当前交通方式 |
| status | `idle` \| `loading` \| `done` \| `degraded` \| `blocked` \| `failed` | 段状态 |
| durationMinutes | number \| null | 耗时 |
| cost | number \| null | 成本 |
| explanation | string \| null | 原因说明 |
| degradedReason | string \| null | 降级原因 |

### 5.4 页面状态 PlannerUIState

| 字段 | 类型 | 说明 |
|---|---|---|
| composerText | string | 输入框内容 |
| lastMessage | string \| null | 最近发送内容 |
| cardExpanded | boolean | 卡片是否全屏 |
| cardLoading | boolean | 顶部卡片是否 loading |
| planningStarted | boolean | 是否开始规划 |
| activeSegmentId | string \| null | 当前正在规划的段 |
| selectedScheduleId | string \| null | 当前高亮日程 |
| draftVersion | number | 当前草案版本号 |

## 6. 状态流转

### 6.1 输入识别流

| 步骤 | 行为 |
|---|---|
| 1 | 用户输入并发送 |
| 2 | 底部保留最近输入气泡 |
| 3 | 顶部卡片进入 loading |
| 4 | mock 返回日程与偏好 |
| 5 | 更新卡片内容与地图点位 |
| 6 | 对新增或变化项做高亮动画 |
| 7 | 输入气泡消失 |

### 6.2 规划流

| 步骤 | 行为 |
|---|---|
| 1 | 用户点击开始规划 |
| 2 | 生成完整路线段列表 |
| 3 | 第一段进入 loading |
| 4 | mock 返回该段规划结果 |
| 5 | 更新该段状态、路线、累计耗时成本 |
| 6 | 进入下一段 |
| 7 | 全部完成后形成首版可执行方案 |

### 6.3 局部更新流

| 步骤 | 行为 |
|---|---|
| 1 | 用户继续输入修改条件 |
| 2 | 顶部卡片进入 loading |
| 3 | mock 返回变更后的部分日程/偏好 |
| 4 | 对受影响项做 diff |
| 5 | 仅更新相关卡片、marker、路线段 |
| 6 | 受影响段重置为待重算或 loading |

## 7. Mock 设计

### 7.1 mock 识别器

| 输入类型 | 输出 |
|---|---|
| 初始需求 | 一组日程 + 偏好 + 待确认项 |
| 修改需求 | 变更过的日程字段或偏好字段 |
| 无效输入 | 空更新 + 一条解释文案 |

### 7.2 mock 规划器

| 输入 | 输出 |
|---|---|
| RouteSegment + 当前日程上下文 | 该段交通方式、耗时、成本、解释 |
| 偏好冲突场景 | 返回 degraded 状态与降级原因 |
| 信息不足 | 返回 blocked 状态 |

## 8. 页面与组件拆分建议

| 组件 | 职责 |
|---|---|
| `MapCanvas` | 承载地图、marker、路线、点击事件 |
| `PlannerOverlayCard` | 顶部悬浮卡片容器 |
| `ScheduleTimeline` | 渲染日程时间轴 |
| `PreferenceChips` | 渲染偏好标签 |
| `PendingIssuesList` | 展示待确认项 |
| `RouteSegmentTimeline` | 展示逐段规划状态 |
| `ComposerBar` | 底部输入框与发送按钮 |
| `LastMessageBubble` | 最近一条输入气泡 |
| `ScheduleEditSheet` | 日程编辑面板 |

## 9. 开发顺序

| 阶段 | 任务 | 产出 |
|---|---|---|
| Phase 1 | 初始化前端项目与基础布局 | 能看到地图占位、卡片、输入框 |
| Phase 2 | 接入 mock 识别流 | 输入后可生成日程卡片与地图点位 |
| Phase 3 | 接入 mock 规划流 | 点击开始规划后逐段 loading |
| Phase 4 | 做局部更新与动画 | 第二次输入只更新相关内容 |
| Phase 5 | 补基础编辑能力 | 日程可手动改时间、地址、主题 |

## 10. P0 验收标准

| 项目 | 标准 |
|---|---|
| 首页 | 默认展示地图、顶部卡片、底部输入框 |
| 输入识别 | 输入一句话后可展示 mock 日程与偏好 |
| 地图联动 | 日程自动打点并编号 |
| 开始规划 | 逐段 loading，最终段段完成 |
| 局部更新 | 第二次输入只影响相关部分 |
| 编辑能力 | 至少支持手动修改单条日程 |
| 动画反馈 | 更新项有明显但轻量的反馈 |

## 11. 下一步执行建议

下一步直接进入项目初始化与 P0 骨架开发。

优先落地顺序：

| 顺序 | 任务 |
|---|---|
| 1 | 初始化 Next.js + Tailwind 项目 |
| 2 | 搭地图页静态骨架 |
| 3 | 定义 Zustand store 与 TS 类型 |
| 4 | 接入 mock 识别数据 |
| 5 | 接入 mock 逐段规划流程 |
