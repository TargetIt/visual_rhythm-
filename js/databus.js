import Pool from './base/pool';

let instance;

/**
 * 全局状态管理器
 * 负责管理游戏的状态，包括帧数、分数、节拍、连击等
 */
export default class DataBus {
  // 直接在类中定义实例属性
  notes = []; // 存储节奏点
  animations = []; // 存储动画
  frame = 0; // 当前帧数
  score = 0; // 当前分数
  combo = 0; // 连击数
  maxCombo = 0; // 最大连击数
  bpm = 60; // 每分钟节拍数
  isGameOver = false; // 游戏是否结束
  pool = new Pool(); // 初始化对象池
  
  // 节奏游戏特有状态
  perfectHits = 0; // 完美命中次数
  goodHits = 0; // 良好命中次数
  missHits = 0; // 错失次数
  lastHitTime = 0; // 最后命中时间
  gameStartTime = 0; // 游戏开始时间

  constructor() {
    // 确保单例模式
    if (instance) {
      console.log('返回已存在的DataBus实例');
      return instance;
    }

    console.log('创建新的DataBus实例');
    instance = this;
    
    // 验证方法是否正确绑定
    console.log('getGameStats 方法类型:', typeof this.getGameStats);
  }

  // 重置游戏状态
  reset() {
    this.frame = 0; // 当前帧数
    this.score = 0; // 当前分数
    this.combo = 0; // 连击数
    this.maxCombo = 0; // 最大连击数
    // 保持用户设置的BPM，不重置为60
    if (!this.initialBPM) {
      this.bpm = 60; // 如果没有设置初始BPM，使用默认值
    } else {
      this.bpm = this.initialBPM; // 恢复到用户设置的初始BPM
    }
    this.notes = []; // 存储节奏点
    this.animations = []; // 存储动画
    this.isGameOver = false; // 游戏是否结束
    
    // 重置统计数据
    this.perfectHits = 0;
    this.goodHits = 0;
    this.missHits = 0;
    this.lastHitTime = 0;
    this.gameStartTime = Date.now();
  }

  // 游戏结束
  gameOver() {
    this.isGameOver = true;
  }

  /**
   * 回收节奏点，进入对象池
   * 此后不进入帧循环
   * @param {Object} note - 要回收的节奏点对象
   */
  removeNote(note) {
    const temp = this.notes.splice(this.notes.indexOf(note), 1);
    if (temp) {
      this.pool.recover('note', note); // 回收节奏点到对象池
    }
  }

  /**
   * 处理按键输入
   * @param {number} trackIndex - 轨道索引
   */
  handleKeyPress(trackIndex) {
    // 通知主游戏逻辑处理按键事件
    if (this.onKeyPress) {
      this.onKeyPress(trackIndex);
    }
  }

  /**
   * 增加分数和连击
   * @param {string} hitType - 命中类型（PERFECT/GOOD/MISS）
   */
  addScore(hitType) {
    const now = Date.now();
    this.lastHitTime = now;

    switch (hitType) {
      case 'PERFECT':
        this.perfectHits++;
        this.combo++;
        this.score += this.calculateScore(300, this.combo);
        break;
      case 'GOOD':
        this.goodHits++;
        this.combo++;
        this.score += this.calculateScore(200, this.combo);
        break;
      case 'MISS':
        this.missHits++;
        this.combo = 0; // 中断连击
        break;
    }

    // 更新最大连击数
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
  }

  /**
   * 计算得分（包含连击加成）
   * @param {number} baseScore - 基础分数
   * @param {number} combo - 连击数
   */
  calculateScore(baseScore, combo) {
    const comboMultiplier = Math.min(1 + combo * 0.1, 3); // 最多3倍加成
    return Math.floor(baseScore * comboMultiplier);
  }

  /**
   * 获取游戏统计信息
   */
  getGameStats() {
    const totalHits = this.perfectHits + this.goodHits + this.missHits;
    const accuracy = totalHits > 0 ? ((this.perfectHits + this.goodHits) / totalHits * 100).toFixed(1) : 0;
    
    return {
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      perfectHits: this.perfectHits,
      goodHits: this.goodHits,
      missHits: this.missHits,
      accuracy: accuracy,
      totalHits: totalHits
    };
  }

  /**
   * 设置初始BPM（用户选择的BPM）
   * @param {number} bpm - 初始BPM值
   */
  setInitialBPM(bpm) {
    this.initialBPM = bpm;
    this.bpm = bpm;
  }
  increaseBPM() {
    if (this.bpm < 120) { // 最大BPM限制
      this.bpm += 5;
    }
  }
}
