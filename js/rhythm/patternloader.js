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

    const patterns = Object.keys(this.patterns).map(key => ({
      id: key,
      name: this.patterns[key].name,
      difficulty: this.patterns[key].difficulty,
      bpm: this.patterns[key].bpm,
      timeSignature: this.patterns[key].timeSignature,
      description: this.patterns[key].description
    }));
    
    console.log('可用的节奏模式:', patterns);
    return patterns;
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
    
    console.log(`设置当前节奏模式: ${this.currentPattern.name}`, this.currentPattern);
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

    // 临时设置currentPattern以供parseTrackString使用
    const originalPattern = this.currentPattern;
    this.currentPattern = pattern;

    const notes = [];
    const trackKeys = Object.keys(pattern.tracks);
    
    // 遍历每个轨道
    for (const trackKey of trackKeys) {
      const trackPattern = pattern.tracks[trackKey];
      const trackIndex = parseInt(trackKey); // 将字符串键转换为整数索引
      if (!trackPattern) continue;

      // 解析轨道模式字符串
      const trackNotes = this.parseTrackString(trackPattern, trackIndex);
      notes.push(...trackNotes);
    }

    // 恢复原来的currentPattern
    this.currentPattern = originalPattern;

    // 按时间排序
    notes.sort((a, b) => a.timing - b.timing);
    
    console.log('解析得到的音符序列:', notes);
    return notes;
  }

  /**
   * 解析单个轨道的模式字符串
   * @param {string} trackString - 轨道模式字符串 (如 "X---X---X---X---")
   * @param {number} trackIndex - 轨道索引
   * @param {number} bpm - 每分钟节拍数
   * @param {string} timeSignature - 拍号 (如 "4/4")
   * @returns {Array} 音符数组
   */
  parseTrackString(trackString, trackIndex) {
    const notes = [];
    const patternLength = trackString.length;
    
    // 确保currentPattern已设置
    const bpm = (this.currentPattern && this.currentPattern.bpm) ? this.currentPattern.bpm : 120;
    console.log(`解析轨道 ${trackIndex}，BPM: ${bpm}`);
    
    // 计算每个字符代表的时间单位（基于BPM）
    // 每个字符代表一个1/4拍（8分音符）
    const timePerBeat = 60 / bpm * 1000; // 每拍的毫秒数
    const timePerUnit = timePerBeat / 2; // 每个字符的时间（1/4拍 = 1/2 * 1拍）

    for (let i = 0; i < patternLength; i++) {
      const char = trackString[i];
      const timing = i * timePerUnit;

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
    
    console.log(`轨道 ${trackIndex} 生成音符:`, notes);
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
    if (!this.isLoaded || !this.patterns) {
      return null;
    }

    // 从模式数据中获取可视化配置
    return this.patterns.visualization || null;
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
