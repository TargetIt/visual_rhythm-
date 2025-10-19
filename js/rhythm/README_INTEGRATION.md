# 节奏数据格式集成说明

本文档说明了如何将 `rhythm-patterns.json` 格式集成到现有的节奏系统中。

## 概述

节奏系统现在完全基于JSON文件定义,提供了灵活和结构化的方式来定义节奏模式,支持:
- 多种难度级别
- 自定义BPM和时间签名
- 可视化配置
- 轨道模式定义
- 用户可以通过编辑JSON文件自由定制节奏

## 文件结构

### 新增文件
- `patternloader.js` - 节奏模式加载器
- `example_usage.js` - 使用示例
- `README_INTEGRATION.md` - 本说明文档

### 修改文件
- `beatgenerator.js` - 集成新的节奏模式生成
- `rhythmselector.js` - 支持新模式选择UI
- `note.js` - 支持新的音符类型和视觉效果

## 使用方法

### 1. 基本使用

```javascript
import BeatGenerator from './beatgenerator';
import RhythmSelector from './rhythmselector';

// 创建节拍生成器
const beatGenerator = new BeatGenerator();

// 等待数据加载完成后设置节奏模式
setTimeout(() => {
  if (beatGenerator.patternLoader.isDataLoaded()) {
    // 设置基础4拍节奏
    beatGenerator.setRhythmPattern('basic');
  }
}, 1000);
```

### 2. 使用节奏选择器

```javascript
import RhythmSelector from './rhythmselector';

const rhythmSelector = new RhythmSelector();

// 设置回调函数
rhythmSelector.onStartGame = (config) => {
  console.log('游戏配置:', config);
  console.log('模式ID:', config.patternId);
  console.log('难度:', config.difficulty);
  console.log('BPM:', config.bpm);
};
```

### 3. 直接使用模式加载器

```javascript
import PatternLoader from './patternloader';

const patternLoader = new PatternLoader();

// 加载节奏模式数据
patternLoader.loadPatterns(patternData);

// 获取可用模式
const patterns = patternLoader.getAvailablePatterns();

// 设置当前模式
patternLoader.setCurrentPattern('basic');

// 获取音符序列
const notes = patternLoader.getCurrentPatternNotes();
```

## 配置格式

### rhythm-patterns.json 结构

```json
{
  "rhythmLibrary": {
    "patternId": {
      "name": "模式名称",
      "difficulty": "easy|medium|hard|expert",
      "bpm": 120,
      "timeSignature": "4/4",
      "tracks": {
        "0": "X---X---X---X---",
        "1": "----X---X---X---",
        "2": "--------X---X---",
        "3": "------------X---"
      },
      "description": "模式描述"
    }
  },
  "visualization": {
    "symbols": {
      "X": "强音符",
      "x": "弱音符",
      "-": "休止符"
    },
    "colors": {
      "0": "#FF6B6B",
      "1": "#4ECDC4",
      "2": "#45B7D1",
      "3": "#96CEB4"
    }
  }
}
```

### 轨道模式字符串格式

- `X` - 强音符
- `x` - 弱音符  
- `-` - 休止符

示例：`"X---X---X---X---"` 表示一个4/4拍的小节，在第1、5、9、13拍有音符。

## 功能特性

### 1. JSON配置
所有节奏模式通过JSON文件定义,用户可以:
- 直接编辑JSON文件添加新模式
- 自定义轨道模式字符串
- 调整BPM和难度
- 修改可视化配置

### 2. 音符类型
支持不同类型的音符:
- 强音符(X)：更亮的颜色和金色边框
- 弱音符(x)：较暗的颜色和灰色边框
- 休止符(-)：不生成音符

### 3. 自动BPM设置
选择节奏模式时,BPM会自动设置为模式中定义的数值,用户也可以手动调整。

## 简化说明

系统已简化为只使用JSON模式:
- 移除了传统的硬编码节奏类型
- 所有节奏通过JSON文件定义
- 更容易维护和扩展
- 用户可以自由编辑节奏配置

## 扩展性

系统设计为高度可扩展:
- 通过编辑JSON文件轻松添加新的节奏模式
- 支持自定义可视化配置
- 可以定义新的轨道模式
- 支持不同的时间签名
- 无需修改代码,只需编辑JSON

## 注意事项

1. **数据加载**：在小程序环境中需要动态加载JSON文件
2. **错误处理**：系统包含完整的错误处理和后备方案
3. **性能**：新模式生成可能比传统模式更消耗资源
4. **调试**：建议在开发时使用控制台日志来监控模式切换

## 故障排除

### 常见问题

1. **模式数据未加载**
   - 检查JSON文件路径是否正确
   - 确认网络连接正常
   - 查看控制台错误信息

2. **模式切换失败**
   - 确认模式ID存在
   - 检查数据格式是否正确
   - 查看模式加载器状态

3. **音符生成异常**
   - 检查轨道模式字符串格式
   - 确认BPM设置正确
   - 查看音符生成日志

### 调试方法

```javascript
// 检查模式加载器状态
console.log('数据已加载:', beatGenerator.patternLoader.isDataLoaded());

// 获取可用模式
console.log('可用模式:', beatGenerator.getAvailablePatterns());

// 获取当前模式
console.log('当前模式:', beatGenerator.patternLoader.getCurrentPattern());
```

## 更新日志

- v2.0.0: 简化为纯JSON模式
  - 移除传统硬编码节奏类型
  - 简化节拍生成器代码
  - 简化节奏选择器UI
  - 完全基于JSON配置
  
- v1.0.0: 初始集成完成
  - 添加节奏模式加载器
  - 更新节拍生成器
  - 更新节奏选择器UI
  - 支持新的音符类型
