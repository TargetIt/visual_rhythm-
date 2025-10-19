import Note from './note';
import PatternLoader from './patternloader';

/**
 * 节拍生成器 - 基于JSON模式生成节奏点
 */
export default class BeatGenerator {
  constructor() {
    // 节奏模式加载器
    this.patternLoader = new PatternLoader();
    this.loadPatternData(); // 加载节奏模式数据
    
    // JSON模式相关
    this.patternStartTime = 0;
    this.lastPatternTime = 0;
    this.currentNotes = []; // 当前模式的音符序列
    this.bpm = 120; // 当前BPM
  }

  /**
   * 加载节奏模式数据
   */
  loadPatternData() {
    try {
      // 在小程序环境中，需要动态加载JSON文件
      if (typeof wx !== 'undefined') {
        // 使用微信小程序的文件系统读取本地JSON文件
        const fs = wx.getFileSystemManager();
        try {
          const data = fs.readFileSync('rhythm-patterns.json', 'utf8');
          const patternData = JSON.parse(data);
          this.patternLoader.loadPatterns(patternData);
          console.log('节奏模式数据加载成功');
          // 尝试设置第一个可用模式为默认模式
          this.setFirstAvailablePattern();
        } catch (readErr) {
          console.error('读取节奏模式数据失败:', readErr);
          this.loadDefaultPatterns();
        }
      } else {
        // 在浏览器环境中，使用require加载JSON文件
        try {
          const patternData = require('../../rhythm-patterns.json');
          this.patternLoader.loadPatterns(patternData);
          console.log('节奏模式数据加载成功');
          // 尝试设置第一个可用模式为默认模式
          this.setFirstAvailablePattern();
        } catch (err) {
          console.error('加载节奏模式数据失败:', err);
          this.loadDefaultPatterns();
        }
      }
    } catch (error) {
      console.error('加载节奏模式数据时出错:', error);
      this.loadDefaultPatterns();
    }
  }

  /**
   * 加载默认节奏模式（当无法加载JSON文件时的后备方案）
   */
  loadDefaultPatterns() {
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
        },
        eighth: {
          name: "8分音符节奏",
          difficulty: "medium", 
          bpm: 140,
          timeSignature: "4/4",
          tracks: {
            0: "X-X-X-X-X-X-X-X-",
            1: "-X-X-X-X-X-X-X-X",
            2: "X---X---X---X---",
            3: "----X---X---X---"
          },
          description: "8分音符和4分音符混合"
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

    this.patternLoader.loadPatterns(defaultPatterns);
    console.log('使用默认节奏模式数据');
  }

  /**
   * 更新BPM
   * @param {number} bpm - 每分钟节拍数
   */
  updateBPM(bpm) {
    const oldBPM = this.bpm;
    this.bpm = bpm;
    console.log(`[BeatGenerator] BPM更新: ${oldBPM} -> ${bpm}`);
    // 计算每拍的时间（毫秒）
    const beatInterval = 60000 / bpm;
    console.debug(`[BeatGenerator] BPM: ${bpm}, 每拍间隔: ${beatInterval.toFixed(2)}ms`);
  }

  /**
   * 设置节奏模式（使用新的JSON格式）
   * @param {string} patternId - 节奏模式ID
   * @returns {boolean} 是否设置成功
   */
  setRhythmPattern(patternId) {
    if (!this.patternLoader.isDataLoaded()) {
      console.warn('节奏模式数据未加载，无法设置模式');
      return false;
    }

    const success = this.patternLoader.setCurrentPattern(patternId);
    if (success) {
      const pattern = this.patternLoader.getCurrentPattern();
      // 更新BPM以匹配模式
      if (pattern.bpm) {
        this.updateBPM(pattern.bpm);
        // 同时更新数据管理器的BPM
        if (GameGlobal.databus) {
          GameGlobal.databus.bpm = pattern.bpm;
        }
      }
      console.log(`设置节奏模式: ${pattern.name} (BPM: ${pattern.bpm})`, pattern);
    }
    return success;
  }

  /**
   * 获取可用的节奏模式列表
   * @returns {Array} 节奏模式列表
   */
  getAvailablePatterns() {
    return this.patternLoader.getAvailablePatterns();
  }

  /**
   * 根据难度获取节奏模式
   * @param {string} difficulty - 难度级别
   * @returns {Array} 符合条件的节奏模式列表
   */
  getPatternsByDifficulty(difficulty) {
    return this.patternLoader.getPatternsByDifficulty(difficulty);
  }

  /**
   * 生成节拍
   */
  generateBeats() {
    const now = Date.now();
    
    // 添加调试信息
    console.log(`[BeatGenerator] 开始生成节拍 - 当前时间: ${now}, 数据已加载: ${this.patternLoader.isDataLoaded()}, 当前模式:`, this.patternLoader.getCurrentPattern()?.name);
    
    // 只使用JSON节奏模式
    if (this.patternLoader.isDataLoaded() && this.patternLoader.getCurrentPattern()) {
      this.generatePatternBeats(now);
    } else {
      console.warn('节奏模式未加载，无法生成节拍');
    }
  }

  /**
   * 基于JSON节奏模式生成节拍
   */
  generatePatternBeats(now) {
    const pattern = this.patternLoader.getCurrentPattern();
    if (!pattern) {
      console.debug('[BeatGenerator] 无当前节奏模式');
      return;
    }

    // 初始化模式开始时间
    if (this.patternStartTime === 0) {
      this.patternStartTime = now;
      this.currentNotes = this.patternLoader.getCurrentPatternNotes();
      // 标记所有音符未生成
      this.currentNotes.forEach(note => note.generated = false);
      console.log('初始化音符序列:', this.currentNotes);
      console.debug(`[BeatGenerator] 模式 "${pattern.name}" 初始化 - 开始时间: ${this.patternStartTime}`);
    }

    // 计算当前时间在模式中的位置
    const patternDuration = this.calculatePatternDuration(pattern);
    const elapsedTime = now - this.patternStartTime;
    const currentTimeInPattern = elapsedTime % patternDuration;

    // 添加详细的时间信息
    console.debug(`[BeatGenerator] 时间计算 - 已耗时: ${elapsedTime}ms, 模式内时间: ${currentTimeInPattern}ms, 模式总长: ${patternDuration}ms`);

    // 检查是否需要重置循环
    if (currentTimeInPattern < this.lastPatternTime) {
      // 新的一轮循环开始
      this.patternStartTime = now - currentTimeInPattern;
      this.currentNotes.forEach(note => note.generated = false);
      console.log(`[BeatGenerator] 开始新的循环 - 模式: ${pattern.name}, BPM: ${this.bpm}`);
      this.lastPatternTime = 0; // 重置lastPatternTime以避免比较错误
    }

    // 检查是否有音符需要生成
    let notesGenerated = 0;
    this.currentNotes.forEach(note => {
      // 检查音符是否应该在这个时刻生成
      if (!note.generated && 
          currentTimeInPattern >= note.timing && 
          this.lastPatternTime <= note.timing) {
        this.createPatternNote(note);
        note.generated = true;
        console.log(`[BeatGenerator] 生成音符: ID=${note.id}, 轨道${note.track}, 时间${note.timing}ms, 类型=${note.type}, 强度=${note.velocity}`);
        notesGenerated++;
      }
    });

    if (notesGenerated > 0) {
      console.debug(`[BeatGenerator] 本轮生成了 ${notesGenerated} 个音符`);
    }

    this.lastPatternTime = currentTimeInPattern;
  }

  /**
   * 计算模式持续时间
   * @param {Object} pattern - 节奏模式
   * @returns {number} 持续时间(毫秒)
   */
  calculatePatternDuration(pattern) {
    // 获取最长轨道的长度作为模式长度
    let maxLength = 0;
    for (const trackKey in pattern.tracks) {
      const trackLength = pattern.tracks[trackKey].length;
      if (trackLength > maxLength) {
        maxLength = trackLength;
      }
    }
    
    console.log(`模式最长轨道长度: ${maxLength}`);
    
    // 基于BPM和模式长度计算持续时间
    // 假设每个字符代表一个1/4拍（8分音符）
    const timePerBeat = 60 / pattern.bpm * 1000; // 每拍的毫秒数
    const timePerUnit = timePerBeat / 2; // 每个字符的时间（1/4拍 = 1/2 * 1拍）
    const duration = maxLength * timePerUnit;
    
    console.log(`模式持续时间: ${duration} ms`);
    return duration;
  }

  /**
   * 创建基于JSON模式的音符
   * @param {Object} patternNote - JSON模式中的音符定义
   * @returns {Note} 游戏音符对象
   */
  createPatternNote(patternNote) {
    // 创建Note对象
    const note = GameGlobal.databus.pool.getItemByClass('note', Note);
    // 传递正确的参数：轨道索引和预期命中时间
    note.init(patternNote.track, patternNote.timing);
    
    console.log(`创建音符: 轨道${patternNote.track}, 时间${patternNote.timing}, 类型${patternNote.type}`);
    
    // 根据音符类型设置属性
    if (patternNote.type === 'strong') {
      note.isStrongNote = true;
      note.velocity = patternNote.velocity || 1.0;
    } else if (patternNote.type === 'weak') {
      note.isWeakNote = true;
      note.velocity = patternNote.velocity || 0.7;
    }
    
    // 设置8分音符和16分音符属性（根据需要可以扩展）
    // 这里暂时保持默认值false
    
    // 将note添加到databus的notes数组中，以便渲染和更新
    GameGlobal.databus.notes.push(note);
    
    return note;
  }

  /**
   * 计算音符下落时间
   * @returns {number} 下落时间(毫秒)
   */
  calculateFallTime() {
    // 返回一个固定的下落时间，确保音符能从顶部下落到判定线
    // 这个值应该与Note类中的速度和屏幕高度相匹配
    return 2000; // 2秒
  }

  /**
   * 重置节拍生成器
   */
  reset() {
    this.patternStartTime = 0;
    this.lastPatternTime = 0;
    this.currentNotes = [];
    
    // 重新加载模式数据
    this.loadPatternData();
  }

  /**
   * 获取当前模式信息
   * @returns {Object} 当前模式信息
   */
  getCurrentPatternInfo() {
    if (this.patternLoader.isDataLoaded() && this.patternLoader.getCurrentPattern()) {
      const pattern = this.patternLoader.getCurrentPattern();
      return {
        name: pattern.name,
        bpm: pattern.bpm,
        difficulty: pattern.difficulty
      };
    }
    return null;
  }

  /**
   * 设置第一个可用的节奏模式作为默认模式
   */
  setFirstAvailablePattern() {
    const availablePatterns = this.getAvailablePatterns();
    if (availablePatterns && availablePatterns.length > 0) {
      const firstPatternId = availablePatterns[0].id;
      this.setRhythmPattern(firstPatternId);
      console.log(`已自动选择默认节奏模式: ${firstPatternId}`);
    }
  }

  /**
   * 检查是否已加载数据
   * @returns {boolean} 是否已加载
   */
  isDataLoaded() {
    return this.patternLoader.isDataLoaded();
  }
}

