let instance;

/**
 * 统一的音效管理器 - 节奏游戏版本
 */
export default class Music {
  bgmAudio = wx.createInnerAudioContext();
  drumHitAudio = wx.createInnerAudioContext();
  perfectAudio = wx.createInnerAudioContext();
  goodAudio = wx.createInnerAudioContext();
  missAudio = wx.createInnerAudioContext();
  
  // Web Audio API 支持
  audioContext = null;
  drumBuffer = null;
  masterGain = null;

  constructor() {
    if (instance) return instance;

    instance = this;

    this.initAudio();
    this.initWebAudio();
  }

  /**
   * 初始化基础音频
   */
  initAudio() {
    // 先尝试加载音频文件，如果失败则使用降级策略
    try {
      this.bgmAudio.loop = true;
      this.bgmAudio.autoplay = false;
      
      // 使用相对路径加载音频文件
      this.loadAudioWithFallback(this.bgmAudio, 'audio/bgm.mp3', '背景音乐');
      this.loadAudioWithFallback(this.drumHitAudio, 'audio/bullet.mp3', '鼓声音效');
      this.loadAudioWithFallback(this.perfectAudio, 'audio/bullet.mp3', 'Perfect音效');
      this.loadAudioWithFallback(this.goodAudio, 'audio/bullet.mp3', 'Good音效');
      this.loadAudioWithFallback(this.missAudio, 'audio/boom.mp3', 'Miss音效');
      
    } catch (error) {
      console.warn('音频初始化失败:', error);
      this.initFallbackAudio();
    }
  }
  
  /**
   * 带降级策略的音频加载
   * @param {Object} audioContext - 音频上下文
   * @param {string} src - 音频源路径
   * @param {string} name - 音频名称
   */
  loadAudioWithFallback(audioContext, src, name) {
    try {
      audioContext.src = src;
      
      // 添加错误处理
      audioContext.onError = (err) => {
        console.warn(`${name}加载失败:`, err, '使用降级策略');
        // 清空源，防止重复报错
        audioContext.src = '';
      };
      
      audioContext.onCanplay = () => {
        console.log(`${name}加载成功`);
      };
      
    } catch (error) {
      console.warn(`${name}设置失败:`, error);
    }
  }
  
  /**
   * 初始化降级音频（不使用文件系统）
   */
  initFallbackAudio() {
    console.log('使用降级音频策略，仅使用Web Audio API生成音效');
    // 清空所有音频源，仅依赖Web Audio API
    this.bgmAudio.src = '';
    this.drumHitAudio.src = '';
    this.perfectAudio.src = '';
    this.goodAudio.src = '';
    this.missAudio.src = '';
  }

  /**
   * 安全的音频播放方法
   * @param {Object} audioContext - 音频上下文
   * @param {string} audioName - 音频名称（用于错误日志）
   */
  safePlay(audioContext, audioName = '未知音频') {
    try {
      if (!audioContext) {
        console.warn(`${audioName}上下文为空`);
        return false;
      }
      
      // 检查是否有有效的音频源
      if (!audioContext.src || audioContext.src === '') {
        console.warn(`${audioName}没有有效的音频源，跳过播放`);
        return false;
      }
      
      audioContext.currentTime = 0;
      const playResult = audioContext.play();
      
      // 检查是否返回Promise对象
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(err => {
          console.warn(`播放${audioName}失败:`, err);
        });
      }
      
      return true;
    } catch (err) {
      console.warn(`播放${audioName}发生异常:`, err);
      return false;
    }
  }

  /**
   * 初始化Web Audio API（如果支持）
   */
  initWebAudio() {
    try {
      // 检查是否支持Web Audio API
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        this.audioContext = new (AudioContext || webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        
        // 加载鼓声音频缓冲
        this.loadDrumSound();
      }
    } catch (error) {
      console.warn('Web Audio API 不支持:', error);
    }
  }

  /**
   * 加载鼓声音频缓冲
   */
  async loadDrumSound() {
    try {
      // 这里应该加载实际的音频文件
      // 由于是小程序环境，我们使用程序生成的鼓声
      this.drumBuffer = this.createDrumSound();
    } catch (error) {
      console.warn('加载鼓声失败:', error);
    }
  }

  /**
   * 程序生成鼓声
   */
  createDrumSound() {
    if (!this.audioContext) return null;
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1; // 100ms
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    // 生成鼓声波形（模拟踢鼓声）
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 50); // 指数衰减包络
      const noise = (Math.random() * 2 - 1) * 0.1; // 噪声成分
      const tone = Math.sin(2 * Math.PI * 60 * t * Math.exp(-t * 10)); // 基频
      
      data[i] = (tone + noise) * envelope;
    }
    
    return buffer;
  }

  /**
   * 播放鼓声（Web Audio API版本）
   */
  playDrumHit() {
    if (this.audioContext && this.drumBuffer) {
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.drumBuffer;
        source.connect(this.masterGain);
        source.start();
      } catch (err) {
        console.warn('Web Audio 播放失败:', err);
        this.fallbackPlayDrum();
      }
    } else {
      this.fallbackPlayDrum();
    }
  }
  
  /**
   * 降级鼓声播放
   */
  fallbackPlayDrum() {
    // 先尝试播放文件系统音频
    const playSuccess = this.safePlay(this.drumHitAudio, '鼓声音效');
    
    // 如果文件系统音频播放失败，则使用Web Audio API生成音效
    if (!playSuccess && this.audioContext && this.drumBuffer) {
      try {
        const source = this.audioContext.createBufferSource();
        source.buffer = this.drumBuffer;
        source.connect(this.masterGain);
        source.start();
        console.log('使用Web Audio API生成鼓声');
      } catch (err) {
        console.warn('Web Audio API播放也失败:', err);
      }
    }
  }

  /**
   * 播放完美命中音效
   */
  playPerfect() {
    const success = this.safePlay(this.perfectAudio, 'Perfect音效');
    if (!success) {
      console.log('Perfect音效不可用，使用默认反馈');
    }
  }

  /**
   * 播放良好命中音效
   */
  playGood() {
    const success = this.safePlay(this.goodAudio, 'Good音效');
    if (!success) {
      console.log('Good音效不可用，使用默认反馈');
    }
  }

  /**
   * 播放错失音效
   */
  playMiss() {
    const success = this.safePlay(this.missAudio, 'Miss音效');
    if (!success) {
      console.log('Miss音效不可用，使用默认反馈');
    }
  }

  /**
   * 播放背景音乐
   */
  playBGM() {
    const success = this.safePlay(this.bgmAudio, '背景音乐');
    if (!success) {
      console.log('背景音乐不可用，游戏将在静音模式下运行');
    }
  }

  /**
   * 停止背景音乐
   */
  stopBGM() {
    try {
      this.bgmAudio.pause();
    } catch (err) {
      console.warn('停止背景音乐失败:', err);
    }
  }

  /**
   * 设置主音量
   * @param {number} volume - 音量值 (0-1)
   */
  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
    
    // 同时设置基础音频音量
    this.bgmAudio.volume = volume;
    this.drumHitAudio.volume = volume;
    this.perfectAudio.volume = volume;
    this.goodAudio.volume = volume;
    this.missAudio.volume = volume;
  }

  /**
   * 根据命中类型播放相应音效
   * @param {string} hitType - 命中类型 (PERFECT/GOOD/MISS)
   */
  playHitSound(hitType) {
    switch (hitType) {
      case 'PERFECT':
        this.playDrumHit();
        this.playPerfect();
        break;
      case 'GOOD':
        this.playDrumHit();
        this.playGood();
        break;
      case 'MISS':
        this.playMiss();
        break;
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.bgmAudio.destroy();
    this.drumHitAudio.destroy();
    this.perfectAudio.destroy();
    this.goodAudio.destroy();
    this.missAudio.destroy();
  }
}
