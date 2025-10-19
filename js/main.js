import './render'; // 初始化Canvas
import TrackSystem from './rhythm/track'; // 导入轨道系统
import VirtualKeys from './rhythm/virtualkeys'; // 导入虚拟按键
import BeatGenerator from './rhythm/beatgenerator'; // 导入节拍生成器
import RhythmSelector from './rhythm/rhythmselector'; // 导入节奏选择器
import Note from './rhythm/note'; // 导入节奏点
import BackGround from './runtime/background'; // 导入背景类
import GameInfo from './runtime/gameinfo'; // 导入游戏UI类
import Music from './runtime/music'; // 导入音乐类
import DataBus from './databus'; // 导入数据类，用于管理游戏状态和数据

const ctx = canvas.getContext('2d'); // 获取canvas的2D绘图上下文;

// 初始化全局对象
if (!GameGlobal.databus) {
  GameGlobal.databus = new DataBus(); // 全局数据管理，用于管理游戏状态和数据
}
if (!GameGlobal.musicManager) {
  GameGlobal.musicManager = new Music(); // 全局音乐管理实例
}

// 调试信息
console.log('DataBus 初始化状态:', GameGlobal.databus);
console.log('DataBus 方法检查:', typeof GameGlobal.databus.getGameStats);
console.log('MusicManager 初始化状态:', GameGlobal.musicManager);
console.log('MusicManager 方法检查:', typeof GameGlobal.musicManager.playHitSound);

/**
 * 节奏游戏主函数
 */
export default class Main {
  aniId = 0; // 用于存储动画帧的ID
  bg = new BackGround(); // 创建背景
  trackSystem = new TrackSystem(); // 创建轨道系统
  virtualKeys = new VirtualKeys(); // 创建虚拟按键
  beatGenerator = new BeatGenerator(); // 创建节拍生成器
  rhythmSelector = new RhythmSelector(); // 创建节奏选择器
  gameInfo = new GameInfo(); // 创建游戏UI显示
  
  // 游戏状态
  gameStarted = false; // 游戏是否已开始
  
  // 按键高亮状态
  keyHighlights = [false, false, false, false];
  keyHighlightTimers = [0, 0, 0, 0];
  
  // 模式唤醒按钮状态
  modeButtonVisible = true; // 模式按钮是否可见
  modeButtonSize = 60; // 按钮尺寸
  modeButtonMargin = 20; // 边距

  constructor() {
    // 设置全局引用，供其他组件使用
    GameGlobal.main = this;
    
    // 确保DataBus正确初始化
    if (!GameGlobal.databus || typeof GameGlobal.databus.getGameStats !== 'function') {
      console.error('DataBus 未正确初始化，重新创建...');
      GameGlobal.databus = new DataBus();
    }
    
    // 确保音效管理器正确初始化
    if (!GameGlobal.musicManager || typeof GameGlobal.musicManager.playHitSound !== 'function') {
      console.error('MusicManager 未正确初始化，重新创建...');
      GameGlobal.musicManager = new Music();
    }
    
    // 当开始游戏被点击时，重新开始游戏
    this.gameInfo.on('restart', this.restart.bind(this));

    // 设置节奏选择器回调
    this.rhythmSelector.onStartGame = this.startGameWithConfig.bind(this);
    this.rhythmSelector.onGameRestart = this.restartGameWithConfig.bind(this);

    // 设置按键事件回调
    GameGlobal.databus.onKeyPress = this.handleKeyPress.bind(this);

    // 显示节奏选择器
    this.showRhythmSelector();
  }

  /**
   * 显示节奏选择器
   */
  showRhythmSelector() {
    this.gameStarted = false;
    this.rhythmSelector.showInitial(); // 使用初始模式
    // 开始渲染循环以显示选择器
    cancelAnimationFrame(this.aniId);
    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * 在游戏中唤醒节奏选择器
   */
  showInGameRhythmSelector() {
    // 游戏继续运行，但显示选择器
    this.rhythmSelector.showInGame();
  }

  /**
   * 使用配置开始游戏
   * @param {Object} config - 节奏配置
   */
  startGameWithConfig(config) {
    console.log('开始游戏，配置:', config);
    
    // 设置游戏配置（只使用JSON模式）
    GameGlobal.databus.setInitialBPM(config.bpm); // 设置初始BPM
    this.beatGenerator.setRhythmPattern(config.patternId); // 设置节奏模式
    this.beatGenerator.updateBPM(config.bpm);
    
    // 开始游戏
    this.start();
  }

  /**
   * 游戏内重启并应用新配置
   * @param {Object} config - 节奏配置
   */
  restartGameWithConfig(config) {
    console.log('游戏内重启，配置:', config);
    
    // 应用新配置（只使用JSON模式）
    GameGlobal.databus.setInitialBPM(config.bpm);
    this.beatGenerator.setRhythmPattern(config.patternId); // 设置节奏模式
    this.beatGenerator.updateBPM(config.bpm);
    
    // 重置游戏状态但保持游戏运行
    this.resetGameState();
  }

  /**
   * 重置游戏状态（不停止游戏）
   */
  resetGameState() {
    // 清除当前的节奏点
    GameGlobal.databus.notes.forEach(note => {
      GameGlobal.databus.pool.recover('note', note);
    });
    GameGlobal.databus.notes = [];
    
    // 重置节拍生成器
    this.beatGenerator.reset();
    
    // 重置按键高亮状态
    this.keyHighlights = [false, false, false, false];
    this.keyHighlightTimers = [0, 0, 0, 0];
    
    console.log('游戏状态已重置，新节奏设置已应用');
  }

  /**
   * 重新开始游戏（从结束界面）
   */
  restart() {
    this.showRhythmSelector();
  }
  /**
   * 开始游戏
   */
  start() {
    this.gameStarted = true;
    GameGlobal.databus.reset(); // 重置数据
    this.beatGenerator.reset(); // 重置节拍生成器
    this.keyHighlights = [false, false, false, false]; // 重置高亮状态
    this.keyHighlightTimers = [0, 0, 0, 0];
    
    cancelAnimationFrame(this.aniId); // 清除上一局的动画
    this.aniId = requestAnimationFrame(this.loop.bind(this)); // 开始新的动画循环
  }

  /**
   * 处理按键输入
   * @param {number} trackIndex - 轨道索引
   */
  handleKeyPress(trackIndex) {
    if (GameGlobal.databus.isGameOver) return;
    
    // 设置高亮效果
    this.keyHighlights[trackIndex] = true;
    this.keyHighlightTimers[trackIndex] = 10; // 10帧的高亮时间
    
    // 检查是否命中节奏点
    this.checkNoteHit(trackIndex);
  }

  /**
   * 处理游戏区域的触摸事件
   * @param {number} x - 触摸X坐标
   * @param {number} y - 触摸Y坐标
   */
  handleGameAreaTouch(x, y) {
    if (!this.gameStarted) return;
    
    // 检查是否点击了模式唤醒按钮
    if (this.isPointInModeButton(x, y)) {
      this.showInGameRhythmSelector();
      // 添加振动反馈
      if (typeof wx !== 'undefined' && typeof wx.vibrateShort === 'function') {
        wx.vibrateShort({ type: 'medium' });
      }
      return;
    }
    
    // 其他游戏区域的触摸处理可以在这里添加
    // 比如点击轨道区域等
  }

  /**
   * 检查点是否在模式唤醒按钮内
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  isPointInModeButton(x, y) {
    const buttonArea = this.getModeButtonArea();
    return x >= buttonArea.x && x <= buttonArea.x + buttonArea.width &&
           y >= buttonArea.y && y <= buttonArea.y + buttonArea.height;
  }

  /**
   * 获取模式唤醒按钮区域
   */
  getModeButtonArea() {
    return {
      x: this.modeButtonMargin,
      y: this.modeButtonMargin,
      width: this.modeButtonSize,
      height: this.modeButtonSize
    };
  }

  /**
   * 检查节奏点命中
   * @param {number} trackIndex - 轨道索引
   */
  checkNoteHit(trackIndex) {
    const judgeZone = this.trackSystem.getJudgeZone();
    let hitNote = null;
    let bestDistance = Infinity;
    
    // 找到该轨道上最接近判定线的节奏点
    GameGlobal.databus.notes.forEach(note => {
      if (note.track === trackIndex && note.isActive && note.isInJudgeZone(judgeZone.y, judgeZone.height)) {
        const distance = Math.abs((note.y + note.height / 2) - judgeZone.perfectY);
        if (distance < bestDistance) {
          bestDistance = distance;
          hitNote = note;
        }
      }
    });
    
    if (hitNote) {
      // 获取判定结果（使用新的API）
      const hitType = hitNote.getJudgeResult(judgeZone);
      
      // 销毁节奏点
      hitNote.destroy();
      
      // 更新分数和连击
      GameGlobal.databus.addScore(hitType);
      
      // 播放音效
      if (GameGlobal.musicManager && typeof GameGlobal.musicManager.playHitSound === 'function') {
        GameGlobal.musicManager.playHitSound(hitType);
      } else {
        console.warn('音效管理器未初始化或方法不存在');
      }
      
      // 震动反馈
      if (hitType !== 'MISS' && typeof wx.vibrateShort === 'function') {
        wx.vibrateShort({
          type: hitType === 'PERFECT' ? 'medium' : 'light'
        });
      }
      
      console.log(`命中: ${hitType}, 连击: ${GameGlobal.databus.combo}, 分数: ${GameGlobal.databus.score}`);
    }
  }

  /**
   * 检查未命中的节奏点（超出判定区域）
   */
  checkMissedNotes() {
    const judgeZone = this.trackSystem.getJudgeZone();
    
    GameGlobal.databus.notes.forEach(note => {
      if (note.isActive && note.y > judgeZone.y + judgeZone.height + 50) {
        // 超出判定区域，认为MISS
        note.destroy();
        GameGlobal.databus.addScore('MISS');
        if (GameGlobal.musicManager && typeof GameGlobal.musicManager.playHitSound === 'function') {
          GameGlobal.musicManager.playHitSound('MISS');
        }
        console.log('MISS - 节奏点超出判定区域');
      }
    });
  }

  /**
   * 更新按键高亮效果
   */
  updateKeyHighlights() {
    for (let i = 0; i < this.keyHighlightTimers.length; i++) {
      if (this.keyHighlightTimers[i] > 0) {
        this.keyHighlightTimers[i]--;
        if (this.keyHighlightTimers[i] <= 0) {
          this.keyHighlights[i] = false;
        }
      }
    }
  }

  /**
   * canvas重绘函数
   * 每一帧重新绘制所有的需要展示的元素
   */
  render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空画布

    this.bg.render(ctx); // 绘制背景
    
    // 如果游戏还未开始，显示节奏选择器
    if (!this.gameStarted) {
      this.rhythmSelector.render(ctx);
      return;
    }
    
    // 绘制模式唤醒按钮（在游戏进行中）
    if (this.modeButtonVisible) {
      this.renderModeButton(ctx);
    }
    
    this.trackSystem.render(ctx); // 绘制轨道系统
    
    // 添加调试信息
    console.log(`渲染阶段 - 音符数量: ${GameGlobal.databus.notes.length}`);
    
    // 绘制所有节奏点
    GameGlobal.databus.notes.forEach((note) => note.render(ctx));
    
    // 绘制按键高亮效果
    this.renderKeyHighlights(ctx);
    
    this.virtualKeys.render(ctx); // 绘制虚拟按键
    this.gameInfo.render(ctx); // 绘制游戏UI
    
    // 绘制所有动画
    GameGlobal.databus.animations.forEach((ani) => {
      if (ani.isPlaying) {
        ani.aniRender(ctx);
      }
    });
    
    // 如果节奏选择器在游戏中被唤醒，绘制在最上层
    if (this.rhythmSelector.isVisible && this.rhythmSelector.displayMode === 'in-game') {
      this.rhythmSelector.render(ctx);
    }
  }

  /**
   * 绘制按键高亮效果
   */
  renderKeyHighlights(ctx) {
    this.keyHighlights.forEach((highlight, index) => {
      if (highlight) {
        this.trackSystem.highlightTrack(index, ctx);
      }
    });
  }

  /**
   * 绘制模式唤醒按钮
   */
  renderModeButton(ctx) {
    const button = this.getModeButtonArea();
    
    // 绘制按钮背景（半透明）
    ctx.fillStyle = 'rgba(52, 73, 94, 0.8)';
    ctx.fillRect(button.x, button.y, button.width, button.height);
    
    // 绘制按钮边框
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.strokeRect(button.x, button.y, button.width, button.height);
    
    // 绘制设置图标（简单的齿轮图标）
    const centerX = button.x + button.width / 2;
    const centerY = button.y + button.height / 2;
    const radius = 15;
    
    // 绘制外圆
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // 绘制齿轮齿牙
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const x1 = centerX + Math.cos(angle) * (radius - 3);
      const y1 = centerY + Math.sin(angle) * (radius - 3);
      const x2 = centerX + Math.cos(angle) * (radius + 5);
      const y2 = centerY + Math.sin(angle) * (radius + 5);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // 绘制中心点
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 游戏逻辑更新主函数
  update() {
    GameGlobal.databus.frame++; // 增加帧数

    // 如果游戏还未开始，不更新游戏逻辑
    if (!this.gameStarted) {
      return;
    }

    if (GameGlobal.databus.isGameOver) {
      return;
    }

    this.bg.update(); // 更新背景
    
    // 生成节奏点
    this.beatGenerator.generateBeats();
    
    // 更新所有节奏点
    GameGlobal.databus.notes.forEach((note) => note.update());
    
    // 检查未命中的节奏点
    this.checkMissedNotes();
    
    // 更新按键高亮效果
    this.updateKeyHighlights();
    
    // 添加调试信息
    if (GameGlobal.databus.frame % 60 === 0) { // 每60帧打印一次
      console.log(`当前节拍: ${GameGlobal.databus.bpm}`);
      console.log(`音符数量: ${GameGlobal.databus.notes.length}`);
      if (GameGlobal.databus.notes.length > 0) {
        console.log(`第一个音符: 轨道${GameGlobal.databus.notes[0].track}, Y位置${GameGlobal.databus.notes[0].y}`);
      }
    }
  }

  // 实现游戏帧循环
  loop() {
    this.update(); // 更新游戏逻辑
    this.render(); // 渲染游戏画面

    // 请求下一帧动画
    this.aniId = requestAnimationFrame(this.loop.bind(this));
  }
}
