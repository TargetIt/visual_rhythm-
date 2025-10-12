import Note from './note';
import PatternLoader from './patternloader';

/**
 * 节拍生成器 - 基于BPM生成节奏点
 */
export default class BeatGenerator {
  constructor() {
    this.lastBeatTime = 0;
    this.beatInterval = 0; // 两个节拍之间的间隔（毫秒）
    this.sixteenthInterval = 0; // 16分音符间隔（毫秒）
    this.eighthInterval = 0; // 8分音符间隔（毫秒）
    this.beatCounter = 0; // 节拍计数器
    this.sixteenthCounter = 0; // 16分音符计数器
    
    // 节奏类型配置
    this.rhythmType = 'quarter'; // 当前节奏类型
    this.forcedRhythmType = null; // 强制设置的节奏类型
    
    // 节奏模式加载器
    this.patternLoader = new PatternLoader();
    this.loadPatternData(); // 加载节奏模式数据
    
    this.patterns = [
      // 简单模式 - 主要使用4分音符
      [0, 1, 2, 3],
      [0, 2, 1, 3],
      [1, 3, 0, 2],
      // 中等模式 - 开始加入8分音符
      [0, 0, 1, 2],
      [1, 1, 2, 3],
      [0, 2, 2, 1],
      // 复杂模式 - 包含16分音符
      [0, 1, 0, 2, 1, 3],
      [2, 0, 3, 1, 2, 0],
      [1, 2, 3, 0, 1, 2]
    ];
    
    // 8分音符模式
    this.eighthPatterns = [
      [0, -1, 1, -1, 2, -1, 3, -1], // 基础8分音符
      [0, 1, -1, 2, -1, 3, -1, 0], // 混合8分音符
      [0, -1, 0, -1, 1, -1, 2, 3], // 变化8分音符
      [-1, 0, -1, 1, -1, 2, -1, 3], // 间陟8分音符
    ];
    
    // 16分音符模式（更密集的节拍）
    this.sixteenthPatterns = [
      [0, -1, 1, -1, 2, -1, 3, -1], // 基础16分音符
      [0, 1, -1, 2, -1, 3, 0, -1], // 混合模式
      [0, -1, 0, 1, -1, 2, 1, 3], // 快速连击
      [-1, 0, 1, -1, 2, -1, 3, 1], // 复杂16分音符
      [0, 1, 2, -1, 3, 0, -1, 2] // 高级16分音符
    ];
    
    // 混合模式 - 随机切换不同节奏
    this.mixedPatterns = {
      quarter: this.patterns,
      eighth: this.eighthPatterns,
      sixteenth: this.sixteenthPatterns
    };
    
    this.currentPatternIndex = 0;
    this.patternPosition = 0;
    this.use16thNotes = false; // 是否启用16分音符
    this.use8thNotes = false; // 是否启用8分音符
    this.sixteenthDensity = 0.3; // 16分音符密度（0-1）
    this.eighthDensity = 0.5; // 8分音符密度（0-1）
    
    // 混合模式相关
    this.mixedModeTimer = 0;
    this.currentMixedType = 'quarter';
    this.mixedSwitchInterval = 8; // 每8个节拍切换一次
    
    // 新模式相关
    this.patternStartTime = 0;
    this.lastPatternTime = 0;
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
        // 在浏览器环境中，可以直接导入
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
   * 更新BPM，重新计算节拍间隔
   * @param {number} bpm - 每分钟节拍数
   */
  updateBPM(bpm) {
    this.beatInterval = (60 / bpm) * 1000; // 转换为毫秒
    this.sixteenthInterval = this.beatInterval / 4; // 16分音符是4分音符的1/4
    this.eighthInterval = this.beatInterval / 2; // 8分音符是4分音符的1/2
  }

  /**
   * 设置节奏类型
   * @param {string} type - 节奏类型（quarter/eighth/sixteenth/mixed）
   */
  setRhythmType(type) {
    this.rhythmType = type;
    this.forcedRhythmType = type;
    
    // 重置相关状态
    this.use16thNotes = false;
    this.use8thNotes = false;
    this.currentMixedType = 'quarter';
    this.mixedModeTimer = 0;
    
    switch (type) {
      case 'quarter':
        // 4分音符模式，保持默认设置
        break;
      case 'eighth':
        this.use8thNotes = true;
        this.eighthDensity = 0.7;
        break;
      case 'sixteenth':
        this.use16thNotes = true;
        this.sixteenthDensity = 0.6;
        break;
      case 'mixed':
        // 混合模式将在生成过程中动态切换
        break;
    }
    
    console.log(`设置节奏类型为: ${type}`);
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
    
    // 如果还没有设置间隔，使用当前BPM
    if (this.beatInterval === 0) {
      this.updateBPM(GameGlobal.databus.bpm);
      this.lastBeatTime = now;
      return;
    }

    // 如果设置了JSON节奏模式，优先使用新模式
    if (this.patternLoader.isDataLoaded() && this.patternLoader.getCurrentPattern()) {
      this.generatePatternBeats(now);
      return;
    }

    // 根据节奏类型选择生成策略
    switch (this.rhythmType) {
      case 'quarter':
        this.generateQuarterBeats(now);
        break;
      case 'eighth':
        this.generateEighthBeats(now);
        break;
      case 'sixteenth':
        this.generate16thBeats(now);
        break;
      case 'mixed':
        this.generateMixedBeats(now);
        break;
      default:
        this.generateQuarterBeats(now);
    }
  }

  /**
   * 基于JSON节奏模式生成节拍
   */
  generatePatternBeats(now) {
    const pattern = this.patternLoader.getCurrentPattern();
    if (!pattern) return;

    // 获取模式的音符序列
    const notes = this.patternLoader.getCurrentPatternNotes();
    if (!notes || notes.length === 0) return;

    // 计算当前时间在模式中的位置
    const patternDuration = this.calculatePatternDuration(pattern);
    const currentTimeInPattern = (now - this.patternStartTime) % patternDuration;

    // 检查是否有音符需要生成
    notes.forEach(note => {
      if (note.timing <= currentTimeInPattern && !note.generated) {
        this.createPatternNote(note);
        note.generated = true;
      }
    });

    // 重置模式循环
    if (currentTimeInPattern < this.lastPatternTime) {
      this.resetPatternGeneration(notes);
    }
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
   * 重置模式生成状态
   */
  resetPatternGeneration(notes) {
    notes.forEach(note => {
      note.generated = false;
    });
    this.patternStartTime = Date.now();
  }

  /**
   * 生成4分音符节拍
   */
  generateQuarterBeats(now) {
    // 检查是否到了生成新节拍的时间
    if (now - this.lastBeatTime >= this.beatInterval) {
      this.createNote();
      this.lastBeatTime = now;
      this.beatCounter++;
      
      // 每16个节拍增加难度（仅在非强制模式下）
      if (this.beatCounter % 16 === 0 && !this.forcedRhythmType) {
        GameGlobal.databus.increaseBPM();
        this.updateBPM(GameGlobal.databus.bpm);
        this.switchPattern();
      }
      
      // 根据节拍数决定是否启用16分音符（仅在非强制模式下）
      if (this.beatCounter >= 32 && !this.use16thNotes && !this.forcedRhythmType) {
        this.enable16thNotes();
      }
    }
  }

  /**
   * 生成8分音符节拍
   */
  generateEighthBeats(now) {
    // 检查是否到了生成8分音符的时间
    if (now - this.lastBeatTime >= this.eighthInterval) {
      this.create8thNote();
      this.lastBeatTime = now;
      this.beatCounter++;
      
      // 每32个8分音符增加难度
      if (this.beatCounter % 32 === 0 && !this.forcedRhythmType) {
        GameGlobal.databus.increaseBPM();
        this.updateBPM(GameGlobal.databus.bpm);
        this.switch8thPattern();
        this.increaseEighthDensity();
      }
    }
  }

  /**
   * 生成混合模式节拍
   */
  generateMixedBeats(now) {
    // 混合模式中动态切换节奏类型
    this.mixedModeTimer++;
    if (this.mixedModeTimer >= this.mixedSwitchInterval) {
      this.switchMixedType();
      this.mixedModeTimer = 0;
    }
    
    // 根据当前混合类型生成节拍
    switch (this.currentMixedType) {
      case 'quarter':
        this.generateQuarterBeats(now);
        break;
      case 'eighth':
        this.generateEighthBeats(now);
        break;
      case 'sixteenth':
        this.generate16thBeats(now);
        break;
    }
  }
  generate16thBeats(now) {
    // 检查是否到了生成新16分音符的时间
    if (now - this.lastBeatTime >= this.sixteenthInterval) {
      this.create16thNote();
      this.lastBeatTime = now;
      this.sixteenthCounter++;
      
      // 每64个16分音符（16个4分音符）增加难度
      if (this.sixteenthCounter % 64 === 0) {
        GameGlobal.databus.increaseBPM();
        this.updateBPM(GameGlobal.databus.bpm);
        this.switch16thPattern();
        this.increaseDensity();
      }
    }
  }

  /**
   * 创建一个节拍音符
   */
  createNote() {
    const track = this.getNextTrack();
    const note = GameGlobal.databus.pool.getItemByClass('note', Note);
    
    if (note) {
      // 计算预期命中时间（基于当前时间和下落时间）
      const fallTime = this.calculateFallTime();
      const hitTime = Date.now() + fallTime;
      
      note.init(track, hitTime);
      GameGlobal.databus.notes.push(note);
    }
  }

  /**
   * 创建16分音符
   */
  create16thNote() {
    const track = this.get16thTrack();
    
    // -1 表示休止符，不生成音符
    if (track === -1) {
      return;
    }
    
    const note = GameGlobal.databus.pool.getItemByClass('note', Note);
    
    if (note) {
      // 计算预期命中时间（基于当前时间和下落时间）
      const fallTime = this.calculateFallTime();
      const hitTime = Date.now() + fallTime;
      
      note.init(track, hitTime);
      // 16分音符可以标记为不同类型（可选）
      note.is16thNote = true;
      GameGlobal.databus.notes.push(note);
    }
  }

  /**
   * 获取下一个轨道（基于当前模式）
   */
  getNextTrack() {
    const pattern = this.patterns[this.currentPatternIndex];
    const track = pattern[this.patternPosition % pattern.length];
    this.patternPosition++;
    return track;
  }

  /**
   * 获取16分音符轨道
   */
  get16thTrack() {
    // 根据密度决定是否生成音符
    if (Math.random() > this.sixteenthDensity) {
      return -1; // 休止符
    }
    
    const pattern = this.sixteenthPatterns[this.currentPatternIndex % this.sixteenthPatterns.length];
    const track = pattern[this.patternPosition % pattern.length];
    this.patternPosition++;
    return track;
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
   * 切换到下一个模式
   */
  switchPattern() {
    // 根据当前难度选择模式
    const difficulty = Math.min(Math.floor(this.beatCounter / 32), 2);
    const startIndex = difficulty * 3;
    const endIndex = startIndex + 3;
    
    this.currentPatternIndex = startIndex + Math.floor(Math.random() * 3);
    this.patternPosition = 0;
    
    console.log(`切换到模式 ${this.currentPatternIndex}, 难度: ${difficulty}`);
  }

  /**
   * 创建8分音符
   */
  create8thNote() {
    const track = this.get8thTrack();
    
    // -1 表示休止符，不生成音符
    if (track === -1) {
      return;
    }
    
    const note = GameGlobal.databus.pool.getItemByClass('note', Note);
    
    if (note) {
      // 计算预期命中时间（基于当前时间和下落时间）
      const fallTime = this.calculateFallTime();
      const hitTime = Date.now() + fallTime;
      
      note.init(track, hitTime);
      // 8分音符标记
      note.is8thNote = true;
      GameGlobal.databus.notes.push(note);
    }
  }

  /**
   * 获取8分音符轨道
   */
  get8thTrack() {
    // 根据密度决定是否生成音符
    if (Math.random() > this.eighthDensity) {
      return -1; // 休止符
    }
    
    const pattern = this.eighthPatterns[this.currentPatternIndex % this.eighthPatterns.length];
    const track = pattern[this.patternPosition % pattern.length];
    this.patternPosition++;
    return track;
  }

  /**
   * 生成8分音符节拍
   */
  generateEighthBeats(now) {
    // 检查是否到了生成8分音符的时间
    if (now - this.lastBeatTime >= this.eighthInterval) {
      this.create8thNote();
      this.lastBeatTime = now;
      this.beatCounter++;
      
      // 每32个8分音符增加难度
      if (this.beatCounter % 32 === 0) {
        GameGlobal.databus.increaseBPM();
        this.updateBPM(GameGlobal.databus.bpm);
        this.switch8thPattern();
        this.increaseEighthDensity();
      }
    }
  }

  /**
   * 生成混合模式节拍
   */
  generateMixedBeats(now) {
    // 混合模式中动态切换节奏类型
    this.mixedModeTimer++;
    if (this.mixedModeTimer >= this.mixedSwitchInterval) {
      this.switchMixedType();
      this.mixedModeTimer = 0;
    }
    
    // 根据当前混合类型生成节拍
    switch (this.currentMixedType) {
      case 'quarter':
        this.generateQuarterBeats(now);
        break;
      case 'eighth':
        this.generateEighthBeats(now);
        break;
      case 'sixteenth':
        this.generate16thBeats(now);
        break;
    }
  }

  /**
   * 切换8分音符模式
   */
  switch8thPattern() {
    // 根据8分音符计数器选择模式
    const patternCount = this.eighthPatterns.length;
    const progressIndex = Math.floor(this.beatCounter / 64) % patternCount;
    
    this.currentPatternIndex = progressIndex;
    this.patternPosition = 0;
    
    console.log(`切换8分音符模式 ${this.currentPatternIndex}`);
  }

  /**
   * 切换混合模式中的节奏类型
   */
  switchMixedType() {
    const types = ['quarter', 'eighth', 'sixteenth'];
    const currentIndex = types.indexOf(this.currentMixedType);
    const nextIndex = (currentIndex + 1) % types.length;
    this.currentMixedType = types[nextIndex];
    
    // 重置模式状态
    this.patternPosition = 0;
    this.currentPatternIndex = 0;
    
    console.log(`混合模式切换到: ${this.currentMixedType}`);
  }

  /**
   * 增加8分音符密度
   */
  increaseEighthDensity() {
    this.eighthDensity = Math.min(this.eighthDensity + 0.1, 0.9);
    console.log(`8分音符密度增加到: ${this.eighthDensity.toFixed(1)}`);
  }

  /**
   * 切换8分音符模式
   */
  switch8thPattern() {
    // 根据8分音符计数器选择模式
    const patternCount = this.eighthPatterns.length;
    const progressIndex = Math.floor(this.beatCounter / 64) % patternCount;
    
    this.currentPatternIndex = progressIndex;
    this.patternPosition = 0;
    
    console.log(`切换8分音符模式 ${this.currentPatternIndex}`);
  }

  /**
   * 切换混合模式中的节奏类型
   */
  switchMixedType() {
    const types = ['quarter', 'eighth', 'sixteenth'];
    const currentIndex = types.indexOf(this.currentMixedType);
    const nextIndex = (currentIndex + 1) % types.length;
    this.currentMixedType = types[nextIndex];
    
    // 重置模式状态
    this.patternPosition = 0;
    this.currentPatternIndex = 0;
    
    console.log(`混合模式切换到: ${this.currentMixedType}`);
  }

  /**
   * 增加8分音符密度
   */
  increaseEighthDensity() {
    this.eighthDensity = Math.min(this.eighthDensity + 0.1, 0.9);
    console.log(`8分音符密度增加到: ${this.eighthDensity.toFixed(1)}`);
  }
  switch16thPattern() {
    // 根据16分音符计数器选择模式
    const patternCount = this.sixteenthPatterns.length;
    const progressIndex = Math.floor(this.sixteenthCounter / 128) % patternCount;
    
    this.currentPatternIndex = progressIndex;
    this.patternPosition = 0;
    
    console.log(`切换16分音符模式 ${this.currentPatternIndex}`);
  }

  /**
   * 启用16分音符模式
   */
  enable16thNotes() {
    this.use16thNotes = true;
    this.sixteenthCounter = 0;
    this.currentPatternIndex = 0;
    this.patternPosition = 0;
    console.log('启用16分音符模式');
  }

  /**
   * 禁用16分音符模式
   */
  disable16thNotes() {
    this.use16thNotes = false;
    this.sixteenthCounter = 0;
    // 重置到原来的模式选择逻辑
    const difficulty = Math.min(Math.floor(this.beatCounter / 32), 2);
    this.currentPatternIndex = difficulty * 3;
    this.patternPosition = 0;
    console.log('禁用16分音符模式');
  }

  /**
   * 增加16分音符密度
   */
  increaseDensity() {
    this.sixteenthDensity = Math.min(this.sixteenthDensity + 0.1, 0.8);
    console.log(`16分音符密度增加到: ${this.sixteenthDensity.toFixed(1)}`);
  }

  /**
   * 生成随机轨道
   */
  getRandomTrack() {
    return Math.floor(Math.random() * 4);
  }

  /**
   * 重置生成器
   */
  reset() {
    this.lastBeatTime = 0;
    this.beatCounter = 0;
    this.sixteenthCounter = 0;
    this.currentPatternIndex = 0;
    this.patternPosition = 0;
    this.use16thNotes = false;
    this.use8thNotes = false;
    this.sixteenthDensity = 0.3;
    this.eighthDensity = 0.5;
    this.mixedModeTimer = 0;
    this.currentMixedType = 'quarter';
    
    // 重置新模式相关状态
    this.patternStartTime = Date.now();
    this.lastPatternTime = 0;
    
    // 保留强制设置的节奏类型
    if (this.forcedRhythmType) {
      this.setRhythmType(this.forcedRhythmType);
    } else {
      this.updateBPM(GameGlobal.databus.bpm); // 重置为BPM
    }
  }

  /**
   * 预生成节拍序列（用于复杂模式）
   * @param {number} count - 要生成的节拍数量
   */
  preGenerateBeats(count) {
    const beats = [];
    const interval = this.use16thNotes ? this.sixteenthInterval : this.beatInterval;
    
    for (let i = 0; i < count; i++) {
      let track;
      if (this.use16thNotes) {
        track = this.get16thTrack();
      } else {
        track = this.getNextTrack();
      }
      
      if (track !== -1) { // 只添加非休止符
        beats.push({
          track: track,
          timing: i * interval,
          is16thNote: this.use16thNotes
        });
      }
    }
    return beats;
  }

  /**
   * 获取当前模式信息
   */
  getCurrentPatternInfo() {
    const baseInfo = {
      rhythmType: this.rhythmType,
      bpm: GameGlobal.databus.bpm,
      beatCount: this.beatCounter,
      interval: this.beatInterval
    };
    
    if (this.rhythmType === 'mixed') {
      return {
        ...baseInfo,
        mode: '混合模式',
        currentMixedType: this.currentMixedType,
        mixedTimer: this.mixedModeTimer
      };
    } else if (this.use16thNotes) {
      return {
        ...baseInfo,
        mode: '16分音符',
        density: this.sixteenthDensity,
        sixteenthCount: this.sixteenthCounter
      };
    } else if (this.use8thNotes) {
      return {
        ...baseInfo,
        mode: '8分音符',
        density: this.eighthDensity
      };
    } else {
      const difficulty = Math.min(Math.floor(this.beatCounter / 32), 2);
      const patternNames = ['简单', '中等', '复杂'];
      
      return {
        ...baseInfo,
        mode: '4分音符',
        difficulty,
        difficultyName: patternNames[difficulty]
      };
    }
  }

  /**
   * 手动切捰16分音符模式（供调试使用）
   */
  toggle16thNotes() {
    if (this.use16thNotes) {
      this.disable16thNotes();
    } else {
      this.enable16thNotes();
    }
  }

  /**
   * 设在16分音符密度
   * @param {number} density - 密度值 (0-1)
   */
  setSixteenthDensity(density) {
    this.sixteenthDensity = Math.max(0, Math.min(1, density));
    console.log(`设在16分音符密度为: ${this.sixteenthDensity.toFixed(1)}`);
  }

  /**
   * 设在8分音符密度
   * @param {number} density - 密度值 (0-1)
   */
  setEighthDensity(density) {
    this.eighthDensity = Math.max(0, Math.min(1, density));
    console.log(`设在8分音符密度为: ${this.eighthDensity.toFixed(1)}`);
  }

  /**
   * 获取当前节奏类型
   */
  getCurrentRhythmType() {
    return this.rhythmType;
  }
}