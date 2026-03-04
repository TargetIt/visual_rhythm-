# 代码检视报告（visual_rhythm-）

## 检视范围
- 核心游戏循环：`js/main.js`
- 全局状态管理：`js/databus.js`
- 节拍生成与模式加载：`js/rhythm/beatgenerator.js`、`js/rhythm/patternloader.js`
- 节奏点：`js/rhythm/note.js`
- 旧射击游戏模块：`js/npc/enemy.js`、`js/player/bullet.js`、`js/player/index.js`

## 总体结论
当前项目已经具备节奏游戏的主干能力（轨道、判定、得分、模式选择、节拍生成）。
在**性能、日志噪声、状态一致性、残留代码**方面存在明显可改进空间。

## 已修复的问题

### 1) 高频路径日志过多，存在性能风险（高优先级）✅ 已修复
- `main.js render()` 每帧打印音符数量 → 已移除。
- `main.js update()` 每60帧输出多条调试日志 → 已移除。
- `beatgenerator.js generateBeats()/generatePatternBeats()` 大量日志和 debug 输出 → 已移除。
- `note.js render()` 每帧每个音符打印渲染日志 → 已移除。
- `note.js init()` 打印初始化日志 → 已移除。
- `patternloader.js parseTrackString()/parseTrackPattern()` 解析时输出大量日志 → 已移除。
- `beatgenerator.js calculatePatternDuration()` 和 `createPatternNote()` 中重复日志 → 已移除。

### 2) 节拍生成器 `reset()` 会重复加载模式数据（中优先级）✅ 已修复
`BeatGenerator.reset()` 内部每次都会调用 `loadPatternData()`。

**修复**：`reset()` 仅清理时间/缓存状态，模式数据仅在构造阶段加载。

### 3) Enemy.destroy() 回调 bug（高优先级）✅ 已修复
`enemy.js` 第63行：
```js
// 修复前 - 返回一个绑定函数但不执行
this.on('stopAnimation', () => this.remove.bind(this));
// 修复后 - 正确调用 remove 方法
this.on('stopAnimation', () => this.remove());
```

### 4) `wx.vibrateShort` 缺少安全检查（中优先级）✅ 已修复
`main.js` `checkNoteHit()` 中直接访问 `wx.vibrateShort` 而没有先检查 `wx` 是否存在。

**修复**：添加 `typeof wx !== 'undefined'` 前置检查。

### 5) 旧模块引用不存在的 DataBus 方法（中优先级）✅ 已修复
- `enemy.js` 调用 `GameGlobal.databus.removeEnemy(this)` — 方法不存在 → 改为 `removeNote(this)`
- `bullet.js` 调用 `GameGlobal.databus.removeBullets(this)` — 方法不存在 → 改为 `removeNote(this)`
- `player/index.js` 引用 `GameGlobal.databus.bullets` — 属性不存在 → 改为 `notes`

## 遗留建议（未修改）

### `DataBus` 单例实现与类字段初始化并存，语义上可读性一般
当前 `DataBus` 在类字段中直接初始化状态，同时在构造函数中执行单例复用逻辑（`if (instance) return instance`）。虽然可运行，但会给后续维护者造成"初始化时机与复用语义"理解成本。

**建议**：使用显式 `getInstance()` 工厂，或保留现有方式但在注释中明确行为边界。

### BPM 来源存在双写路径，长期有一致性风险
- `Main.startGameWithConfig()` 设置用户选择 BPM；
- `BeatGenerator.setRhythmPattern()` 又可能用 pattern 内 BPM 覆盖并同步回 `DataBus`。

**建议**：明确优先级策略（用户配置优先或谱面配置优先），并在 UI 中展示最终生效 BPM。

## 备注
本次检视已执行代码修复，主要集中在性能优化（移除热路径日志）、回调 bug 修复、安全检查加固以及旧模块残留方法引用修正。
