import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

/**
 * 虚拟按键组件 - A/S/D/F四个按键
 */
export default class VirtualKeys {
  constructor() {
    this.keys = [];
    this.keyHeight = SCREEN_HEIGHT / 3; // 按键区域高度为屏幕高度的1/3
    this.keyY = SCREEN_HEIGHT - this.keyHeight; // 按键Y位置
    this.pressedKeys = new Set(); // 当前按下的按键
    this.keyLabels = ['A', 'S', 'D', 'F'];
    
    this.initKeys();
    this.initEvents();
  }

  /**
   * 初始化按键
   */
  initKeys() {
    const trackWidth = SCREEN_WIDTH / 4;
    const buttonHeight = 60; // 实际按键高度
    const buttonY = this.keyY + (this.keyHeight - buttonHeight) / 2; // 在触控区域内垂直居中
    
    for (let i = 0; i < 4; i++) {
      this.keys.push({
        index: i,
        label: this.keyLabels[i],
        x: i * trackWidth + 10,
        y: buttonY,
        width: trackWidth - 20,
        height: buttonHeight,
        color: this.getKeyColor(i),
        pressed: false
      });
    }
  }

  /**
   * 获取按键颜色
   */
  getKeyColor(index) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    return colors[index] || '#FFFFFF';
  }

  /**
   * 初始化事件监听
   */
  initEvents() {
    // 触摸事件
    wx.onTouchStart(this.handleTouchStart.bind(this));
    wx.onTouchEnd(this.handleTouchEnd.bind(this));
    wx.onTouchCancel(this.handleTouchEnd.bind(this));

    // 键盘事件（如果支持）
    if (typeof wx.onKeyDown === 'function') {
      wx.onKeyDown(this.handleKeyDown.bind(this));
      wx.onKeyUp(this.handleKeyUp.bind(this));
    }
  }

  /**
   * 处理触摸开始
   */
  handleTouchStart(event) {
    if (GameGlobal.databus.isGameOver) return;

    event.touches.forEach(touch => {
      const { clientX, clientY } = touch;
      
      // 先检查是否点击了游戏区域（包括模式按钮）
      if (GameGlobal.main && typeof GameGlobal.main.handleGameAreaTouch === 'function') {
        GameGlobal.main.handleGameAreaTouch(clientX, clientY);
      }
      
      // 然后检查是否命中虚拟按键
      const keyIndex = this.getKeyByPosition(clientX, clientY);
      
      if (keyIndex !== -1) {
        this.pressKey(keyIndex);
      }
    });
  }

  /**
   * 处理触摸结束
   */
  handleTouchEnd(event) {
    // 释放所有按键
    this.keys.forEach((key, index) => {
      this.releaseKey(index);
    });
  }

  /**
   * 处理键盘按下
   */
  handleKeyDown(event) {
    if (GameGlobal.databus.isGameOver) return;

    const key = event.key.toLowerCase();
    const keyIndex = this.keyLabels.findIndex(label => label.toLowerCase() === key);
    
    if (keyIndex !== -1 && !this.pressedKeys.has(keyIndex)) {
      this.pressKey(keyIndex);
    }
  }

  /**
   * 处理键盘释放
   */
  handleKeyUp(event) {
    const key = event.key.toLowerCase();
    const keyIndex = this.keyLabels.findIndex(label => label.toLowerCase() === key);
    
    if (keyIndex !== -1) {
      this.releaseKey(keyIndex);
    }
  }

  /**
   * 根据位置获取按键索引
   */
  getKeyByPosition(x, y) {
    // 检查是否在触控区域内
    if (y < this.keyY || y > this.keyY + this.keyHeight) {
      return -1;
    }
    
    // 根据X坐标判断是哪个轨道
    const trackWidth = SCREEN_WIDTH / 4;
    const trackIndex = Math.floor(x / trackWidth);
    
    if (trackIndex >= 0 && trackIndex < 4) {
      return trackIndex;
    }
    
    return -1;
  }

  /**
   * 按下按键
   */
  pressKey(keyIndex) {
    if (keyIndex < 0 || keyIndex >= this.keys.length) return;
    
    this.keys[keyIndex].pressed = true;
    this.pressedKeys.add(keyIndex);
    
    // 触发按键事件
    this.onKeyPress(keyIndex);
    
    // 震动反馈
    if (typeof wx.vibrateShort === 'function') {
      wx.vibrateShort({
        type: 'light'
      });
    }
  }

  /**
   * 释放按键
   */
  releaseKey(keyIndex) {
    if (keyIndex < 0 || keyIndex >= this.keys.length) return;
    
    this.keys[keyIndex].pressed = false;
    this.pressedKeys.delete(keyIndex);
  }

  /**
   * 按键按下回调
   */
  onKeyPress(keyIndex) {
    // 通知游戏逻辑处理按键输入
    if (GameGlobal.databus && GameGlobal.databus.handleKeyPress) {
      GameGlobal.databus.handleKeyPress(keyIndex);
    }
  }

  /**
   * 渲染虚拟按键
   */
  render(ctx) {
    // 完全透明显示，不绘制任何视觉元素
    // 不绘制背景区域
    // 不绘制按键背景
    // 不绘制边框
    // 不绘制ASDF文字
    // 保持触控功能但完全隐藏视觉显示
  }

  /**
   * 检查按键是否被按下
   */
  isKeyPressed(keyIndex) {
    return this.pressedKeys.has(keyIndex);
  }

  /**
   * 获取所有按下的按键
   */
  getPressedKeys() {
    return Array.from(this.pressedKeys);
  }
}