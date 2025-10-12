/**
 * 节奏数据格式使用示例
 * 演示如何使用新的 rhythm-patterns.json 格式
 */

import BeatGenerator from './beatgenerator';
import RhythmSelector from './rhythmselector';
import PatternLoader from './patternloader';

/**
 * 使用示例：初始化节奏系统
 */
export function initRhythmSystem() {
  console.log('初始化节奏系统...');
  
  // 1. 创建节拍生成器
  const beatGenerator = new BeatGenerator();
  
  // 2. 创建节奏选择器
  const rhythmSelector = new RhythmSelector();
  
  // 3. 等待数据加载完成后，可以设置节奏模式
  setTimeout(() => {
    if (beatGenerator.patternLoader.isDataLoaded()) {
      // 设置基础4拍节奏
      const success = beatGenerator.setRhythmPattern('basic');
      if (success) {
        console.log('成功设置基础4拍节奏');
      }
      
      // 获取可用的节奏模式
      const availablePatterns = beatGenerator.getAvailablePatterns();
      console.log('可用节奏模式:', availablePatterns);
      
      // 根据难度筛选模式
      const easyPatterns = beatGenerator.getPatternsByDifficulty('easy');
      console.log('简单模式:', easyPatterns);
    }
  }, 1000);
  
  return { beatGenerator, rhythmSelector };
}

/**
 * 使用示例：切换节奏模式
 */
export function switchRhythmPattern(patternId) {
  const beatGenerator = new BeatGenerator();
  
  if (beatGenerator.patternLoader.isDataLoaded()) {
    const success = beatGenerator.setRhythmPattern(patternId);
    if (success) {
      const pattern = beatGenerator.patternLoader.getCurrentPattern();
      console.log(`切换到节奏模式: ${pattern.name}`);
      console.log(`BPM: ${pattern.bpm}`);
      console.log(`难度: ${pattern.difficulty}`);
      console.log(`时间签名: ${pattern.timeSignature}`);
    }
  }
}

/**
 * 使用示例：获取节奏模式信息
 */
export function getPatternInfo(patternId) {
  const patternLoader = new PatternLoader();
  
  // 加载默认数据（实际使用时应该从JSON文件加载）
  const defaultPatterns = {
    rhythmLibrary: {
      basic: {
        name: "基础4拍节奏",
        difficulty: "easy",
        bpm: 120,
        timeSignature: "4/4",
        tracks: {
          0: "X---X---X---X---",
          1: "----X---X---X---", 
          2: "--------X---X---",
          3: "------------X---"
        },
        description: "简单的四分音符，每个轨道错开一拍"
      }
    }
  };
  
  patternLoader.loadPatterns(defaultPatterns);
  
  if (patternLoader.setCurrentPattern(patternId)) {
    const pattern = patternLoader.getCurrentPattern();
    const notes = patternLoader.getCurrentPatternNotes();
    
    console.log('节奏模式信息:');
    console.log('- 名称:', pattern.name);
    console.log('- 难度:', pattern.difficulty);
    console.log('- BPM:', pattern.bpm);
    console.log('- 时间签名:', pattern.timeSignature);
    console.log('- 描述:', pattern.description);
    console.log('- 音符序列:', notes);
    
    return { pattern, notes };
  }
  
  return null;
}

/**
 * 使用示例：自定义节奏模式
 */
export function createCustomPattern() {
  const customPattern = {
    rhythmLibrary: {
      custom: {
        name: "自定义节奏",
        difficulty: "medium",
        bpm: 140,
        timeSignature: "4/4",
        tracks: {
          0: "X-X-X-X-X-X-X-X-",
          1: "-X-X-X-X-X-X-X-X",
          2: "X---X---X---X---",
          3: "----X---X---X---"
        },
        description: "自定义的8分音符和4分音符混合节奏"
      }
    },
    visualization: {
      symbols: {
        "X": "强音符",
        "x": "弱音符", 
        "-": "休止符"
      },
      colors: {
        0: "#FF6B6B",
        1: "#4ECDC4", 
        2: "#45B7D1",
        3: "#96CEB4"
      }
    }
  };
  
  const patternLoader = new PatternLoader();
  patternLoader.loadPatterns(customPattern);
  
  const patterns = patternLoader.getAvailablePatterns();
  console.log('自定义节奏模式:', patterns);
  
  return patternLoader;
}

// 导出使用示例
export default {
  initRhythmSystem,
  switchRhythmPattern,
  getPatternInfo,
  createCustomPattern
};
