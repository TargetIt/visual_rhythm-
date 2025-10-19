/**
 * 节奏模式加载器 - 处理节奏模式JSON数据的加载和解析
 */
export default class PatternLoader {
  constructor() {
    this.patterns = null;
    this.currentPattern = null;
    this.isLoaded = false;
  }

  /**
   * 加载节奏模式数据
   * @param {Object} patternData - 节奏模式JSON数据
   */
  loadPatterns(patternData) {
    if (!patternData || !patternData.rhythmLibrary) {
      console.error('无效的节奏模式数据');
      return false;
    }

    this.patterns = patternData.rhythmLibrary;
    this.isLoaded = true;
    console.log('节奏模式数据加载成功', Object.keys(this.patterns));
    return true;
  }

  /**
   * 获取可用的节奏模式列表
   * @returns {Array} 节奏模式列表
   */
  getAvailablePatterns() {
    if (!this.isLoaded) {
      console.warn('节奏模式数据未加载');
      return [];
    }

    return Object.keys(this.patterns).map(key => ({
      id: key,
      name: this.patterns[key].name,
      difficulty: this.patterns[key].difficulty,
      bpm: this.patterns[key].bpm,
      timeSignature: this.patterns[key].timeSignature,
      description: this.patterns[key].description
    }));
  }

  /**
   * 根据难度获取节奏模式
   * @param {string} difficulty - 难度级别 (easy/medium/hard/expert)
   * @returns {Array} 符合条件的节奏模式列表
   */
  getPatternsByDifficulty(difficulty) {
    if (!this.isLoaded) {
      return [];
    }

    return this.getAvailablePatterns().filter(pattern => 
      pattern.difficulty === difficulty
    );
  }

  /**
   * 设置当前节奏模式
   * @param {string} patternId - 节奏模式ID
   * @returns {boolean} 是否设置成功
   */
  setCurrentPattern(patternId) {
    if (!this.isLoaded || !this.patterns[patternId]) {
      console.error(`节奏模式 ${patternId} 不存在`);
      return false;
    }

    this.currentPattern = {
      id: patternId,
      ...this.patterns[patternId]
    };
    
    console.log(`设置当前节奏模式: ${this.currentPattern.name}`);
    return true;
  }

  /**
   * 获取当前节奏模式
   * @returns {Object|null} 当前节奏模式数据
   */
  getCurrentPattern() {
    return this.currentPattern;
  }

  /**
   * 解析轨道数据为音符序列
   * @param {Object} pattern - 节奏模式数据
   * @returns {Array} 音符序列
   */
  parseTrackPattern(pattern) {
    if (!pattern || !pattern.tracks) {
      console.error('无效的节奏模式数据');
      return [];
    }

    const notes = [];
    const trackCount = Object.keys(pattern.tracks).length;
    
    // 遍历每个轨道
    for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
      const trackPattern = pattern.tracks[trackIndex];
      if (!trackPattern) continue;

      // 解析轨道模式字符串
      const trackNotes = this.parseTrackString(trackPattern, trackIndex);
      notes.push(...trackNotes);
    }

    // 按时间排序
    notes.sort((a, b) => a.timing - b.timing);
    return notes;
  }

  /**
   * 解析单个轨道的模式字符串
   * @param {string} trackString - 轨道模式字符串 (如 "X---X---X---X---")
   * @param {number} trackIndex - 轨道索引
   * @returns {Array} 音符数组
   */
  parseTrackString(trackString, trackIndex) {
    const notes = [];
    const patternLength = trackString.length;
    
    // 计算每个字符代表的时间单位
    // 假设字符串长度对应一个完整的小节
    const timeUnit = 1000 / patternLength; // 毫秒

    for (let i = 0; i < patternLength; i++) {
      const char = trackString[i];
      const timing = i * timeUnit;

      if (char === 'X') {
        // 强音符
        notes.push({
          track: trackIndex,
          timing: timing,
          type: 'strong',
          velocity: 1.0
        });
      } else if (char === 'x') {
        // 弱音符
        notes.push({
          track: trackIndex,
          timing: timing,
          type: 'weak',
          velocity: 0.7
        });
      }
      // '-' 表示休止符，不生成音符
    }

    return notes;
  }

  /**
   * 获取当前模式的音符序列
   * @returns {Array} 音符序列
   */
  getCurrentPatternNotes() {
    if (!this.currentPattern) {
      console.warn('未设置当前节奏模式');
      return [];
    }

    return this.parseTrackPattern(this.currentPattern);
  }

  /**
   * 根据BPM调整音符时间
   * @param {Array} notes - 原始音符序列
   * @param {number} targetBPM - 目标BPM
   * @param {number} originalBPM - 原始BPM
   * @returns {Array} 调整后的音符序列
   */
  adjustNotesBPM(notes, targetBPM, originalBPM) {
    if (!originalBPM || originalBPM <= 0) {
      console.warn('原始BPM无效，无法调整时间');
      return notes;
    }

    const ratio = originalBPM / targetBPM;
    return notes.map(note => ({
      ...note,
      timing: note.timing * ratio
    }));
  }

  /**
   * 获取可视化配置
   * @returns {Object} 可视化配置
   */
  getVisualizationConfig() {
    if (!this.isLoaded) {
      return null;
    }

    try {
      // 在小程序环境中使用require加载JSON文件
      if (typeof wx !== 'undefined') {
        const rawData = require('/rhythm-patterns.json');
        return rawData.visualization || null;
      } else {
        // 在浏览器环境中也使用require
        const rawData = require('../../rhythm-patterns.json');
        return rawData.visualization || null;
      }
    } catch (error) {
      console.error('加载可视化配置失败:', error);
      return null;
    }
  }

  /**
   * 获取轨道颜色
   * @param {number} trackIndex - 轨道索引
   * @returns {string} 颜色值
   */
  getTrackColor(trackIndex) {
    const vizConfig = this.getVisualizationConfig();
    if (vizConfig && vizConfig.colors && vizConfig.colors[trackIndex]) {
      return vizConfig.colors[trackIndex];
    }

    // 默认颜色
    const defaultColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    return defaultColors[trackIndex] || '#FFFFFF';
  }

  /**
   * 重置加载器状态
   */
  reset() {
    this.patterns = null;
    this.currentPattern = null;
    this.isLoaded = false;
  }

  /**
   * 检查是否已加载数据
   * @returns {boolean} 是否已加载
   */
  isDataLoaded() {
    return this.isLoaded;
  }
}
