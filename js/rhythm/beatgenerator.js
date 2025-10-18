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
        wx.request({
          url: '../../rhythm-patterns.json',
          method: 'GET',
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              this.patternLoader.loadPatterns(res.data);
              console.log('节奏模式数据加载成功');
            } else {
              console.error('加载节奏模式数据失败:', res);
              this.loadDefaultPatterns();
            }
          },
          fail: (err) => {
            console.error('请求节奏模式数据失败:', err);
            this.loadDefaultPatterns();
          }
        });
      } else {
        // 在浏览器环境中，使用默认数据
        this.loadDefaultPatterns();
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
    this.bpm = bpm;
    console.log(`BPM更新为: ${bpm}`);
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
      console.log(`设置节奏模式: ${pattern.name} (BPM: ${pattern.bpm})`);
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
    if (!pattern) return;

    // 初始化模式开始时间
    if (this.patternStartTime === 0) {
      this.patternStartTime = now;
      this.currentNotes = this.patternLoader.getCurrentPatternNotes();
      // 标记所有音符未生成
      this.currentNotes.forEach(note => note.generated = false);
    }

    // 计算当前时间在模式中的位置
    const patternDuration = this.calculatePatternDuration(pattern);
    const elapsedTime = now - this.patternStartTime;
    const currentTimeInPattern = elapsedTime % patternDuration;

    // 检查是否需要重置循环
    if (currentTimeInPattern < this.lastPatternTime) {
      // 新的一轮循环开始
      this.patternStartTime = now - currentTimeInPattern;
      this.currentNotes.forEach(note => note.generated = false);
    }

    // 检查是否有音符需要生成
    this.currentNotes.forEach(note => {
      // 考虑提前量，让音符有时间下落到判定线
      const noteLeadTime = this.calculateFallTime();
      if (!note.generated && (currentTimeInPattern + noteLeadTime) >= note.timing) {
        this.createPatternNote(note);
        note.generated = true;
      }
    });

    this.lastPatternTime = currentTimeInPattern;
  }

  /**
   * 计算节奏模式的持续时间
   */
  calculatePatternDuration(pattern) {
    // 基于BPM和时间签名计算模式持续时间
    const bpm = pattern.bpm || 120;
    const timeSignature = pattern.timeSignature || "4/4";
    const [beatsPerMeasure, noteValue] = timeSignature.split('/').map(Number);
    
    // 计算一个小节的持续时间（毫秒）
    const beatDuration = (60 / bpm) * 1000;
    const measureDuration = beatDuration * beatsPerMeasure;
    
    return measureDuration;
  }

  /**
   * 创建模式音符
   */
  createPatternNote(noteData) {
    const note = GameGlobal.databus.pool.getItemByClass('note', Note);
    
    if (note) {
      // 计算预期命中时间（基于当前时间和下落时间）
      const fallTime = this.calculateFallTime();
      const hitTime = Date.now() + fallTime;
      
      note.init(noteData.track, hitTime);
      
      // 设置音符类型和强度
      if (noteData.type === 'strong') {
        note.isStrongNote = true;
      } else if (noteData.type === 'weak') {
        note.isWeakNote = true;
      }
      
      if (noteData.velocity) {
        note.velocity = noteData.velocity;
      }
      
      GameGlobal.databus.notes.push(note);
    }
  }

  /**
   * 计算音符下落时间（从顶部到判定线）
   */
  calculateFallTime() {
    // 基于游戏参数计算，这里使用固定值
    // 实际应该根据屏幕高度和音符速度计算
    const screenHeight = wx.getSystemInfoSync().screenHeight;
    const judgeZoneY = screenHeight - 160 - 10;
    const noteSpeed = 4; // 像素/帧
    const fps = 60; // 假设60FPS
    
    return (judgeZoneY / noteSpeed / fps) * 1000; // 转换为毫秒
  }

  /**
   * 重置生成器
   */
  reset() {
    this.patternStartTime = 0;
    this.lastPatternTime = 0;
    this.currentNotes = [];
    console.log('节拍生成器已重置');
  }

  /**
   * 获取当前模式信息
   */
  getCurrentPatternInfo() {
    const pattern = this.patternLoader.getCurrentPattern();
    if (!pattern) {
      return {
        mode: '未选择',
        bpm: this.bpm
      };
    }
    
    return {
      mode: pattern.name,
      bpm: this.bpm,
      difficulty: pattern.difficulty,
      timeSignature: pattern.timeSignature,
      description: pattern.description
    };
  }
}
