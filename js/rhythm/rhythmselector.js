import PatternLoader from './patternloader';

/**
 * 节奏选择器 - 让用户选择节奏类型和速度
 */
export default class RhythmSelector {
  constructor() {
    this.isVisible = true;
    this.selectedRhythmType = ''; // 不再设置默认选择
    this.selectedBPM = 120; // 默认BPM
    this.bpmInput = 120; // 用户输入的BPM
    
    // 节奏模式加载器
    this.patternLoader = new PatternLoader();
    
    // 节奏模式选项（从JSON加载）
    this.rhythmPatterns = [];
    this.selectedPatternId = null;
    
    this.selectedIndex = 0; // 当前选中的节奏类型索引
    
    // 下拉菜单状态
    this.dropdownOpen = false; // 下拉菜单是否展开
    this.dropdownMaxHeight = 200; // 下拉菜单最大高度
    
    // 键盘输入状态
    this.keyboardInputMode = false; // 是否正在键盘输入
    this.inputBuffer = ''; // 键盘输入缓冲
    this.originalBPMValue = 60; // 进入键盘输入前的原始值
    this.lastClickTime = 0; // 上次点击时间（用于双击检测）
    this.doubleClickThreshold = 300; // 双击时间阈值（毫秒）
    
    // 虚拟键盘布局
    this.virtualKeyboard = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['←', '0', '✓']
    ];
    this.keyboardButtonSize = 50;
    this.keyboardSpacing = 10;
    
    // 显示模式
    this.displayMode = 'initial'; // 'initial' | 'in-game'
    
    // UI位置和尺寸
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.cardWidth = 320;
    this.cardHeight = 350; // 调整高度，移除模式切换按钮后减小
    
    // 回调函数
    this.onStartGame = null;
    this.onGameRestart = null; // 游戏内重启回调
    
    // 保存原有事件处理器的引用
    this.originalTouchStartHandler = null;
    
    // 加载节奏模式数据
    this.loadRhythmPatterns();
    
    // 绑定触摸事件
    this.bindEvents();
  }

  /**
   * 加载节奏模式数据
   */
  loadRhythmPatterns() {
    try {
      // 在小程序环境中，需要动态加载JSON文件
      if (typeof wx !== 'undefined') {
        // 使用微信小程序的文件系统读取本地JSON文件
        const fs = wx.getFileSystemManager();
        try {
          const data = fs.readFileSync('rhythm-patterns.json', 'utf8');
          const patternData = JSON.parse(data);
          this.patternLoader.loadPatterns(patternData);
          this.rhythmPatterns = this.patternLoader.getAvailablePatterns();
          console.log('节奏模式数据加载成功', this.rhythmPatterns);
          // 默认选择第一个模式
          if (this.rhythmPatterns.length > 0 && !this.selectedPatternId) {
            this.selectRhythmType(0);
          }
        } catch (readErr) {
          console.error('读取节奏模式数据失败:', readErr);
        }
      } else {
        // 在浏览器环境中，使用require加载JSON文件
        try {
          const patternData = require('../../rhythm-patterns.json');
          this.patternLoader.loadPatterns(patternData);
          this.rhythmPatterns = this.patternLoader.getAvailablePatterns();
          console.log('节奏模式数据加载成功', this.rhythmPatterns);
          // 默认选择第一个模式
          if (this.rhythmPatterns.length > 0 && !this.selectedPatternId) {
            this.selectRhythmType(0);
          }
        } catch (err) {
          console.error('加载节奏模式数据失败:', err);
        }
      }
    } catch (error) {
      console.error('加载节奏模式数据时出错:', error);
    }
  }

  /**
   * 绑定触摸事件
   */
  bindEvents() {
    // 在小程序环境中使用 wx API
    if (typeof wx !== 'undefined' && wx.onTouchStart) {
      // 保存原有的事件处理器（如果存在）
      this.originalTouchStartHandler = wx._touchStartHandlers && wx._touchStartHandlers.length > 0 
        ? wx._touchStartHandlers[wx._touchStartHandlers.length - 1] 
        : null;
      
      // 设置touch事件处理器
      wx.onTouchStart(this.handleTouchStart.bind(this));
      wx.onTouchEnd(this.handleTouchEnd.bind(this));
    }
  }

  /**
   * 解绑触摸事件
   */
  unbindEvents() {
    if (typeof wx !== 'undefined') {
      // 恢复原有的事件处理器
      if (this.originalTouchStartHandler) {
        wx.onTouchStart(this.originalTouchStartHandler);
      }
      // 注意：这里只是简单示例，实际可能需要更复杂的管理
    }
  }

  /**
   * 处理触摸开始事件
   */
  handleTouchStart(event) {
    if (!this.isVisible) {
      // 如果选择器不可见，调用原有的事件处理器
      if (this.originalTouchStartHandler) {
        this.originalTouchStartHandler(event);
      }
      return;
    }
    
    const touch = event.touches[0];
    if (touch) {
      // 在小程序中，触摸坐标直接使用 clientX 和 clientY
      this.handleInput(touch.clientX, touch.clientY);
    }
  }

  /**
   * 处理触摸结束事件
   */
  handleTouchEnd(event) {
    // 触摸结束时不需要特殊处理
  }

  /**
   * 处理虚拟键盘输入
   * @param {string} key - 按键值
   */
  handleVirtualKeyInput(key) {
    if (!this.keyboardInputMode) return;
    
    if (key >= '0' && key <= '9') {
      // 数字输入
      this.inputBuffer += key;
      // 限制最大长度
      if (this.inputBuffer.length > 3) {
        this.inputBuffer = this.inputBuffer.substring(0, 3);
      }
      this.updateBPMFromInput();
    } else if (key === '←') {
      // 退格
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      this.updateBPMFromInput();
    } else if (key === '✓') {
      // 确认
      this.exitKeyboardInput();
    }
    
    // 振动反馈
    this.safeVibrate('light');
  }

  /**
   * 安全的振动反馈
   * @param {string} type - 振动类型 ('light'|'medium'|'heavy')
   * @param {Function} onSuccess - 成功回调
   * @param {Function} onFail - 失败回调
   */
  safeVibrate(type = 'light', onSuccess = null, onFail = null) {
    try {
      if (typeof wx !== 'undefined' && typeof wx.vibrateShort === 'function') {
        wx.vibrateShort({
          type: type,
          success: onSuccess || (() => {}),
          fail: onFail || (() => {})
        });
      } else {
        console.log('振动API不可用');
        if (onFail) onFail();
      }
    } catch (error) {
      console.warn('振动反馈失败:', error);
      if (onFail) onFail(error);
    }
  }
  /**
   * 处理输入事件
   */
  handleInput(x, y) {
    // 如果正在键盘输入模式，优先检查虚拟键盘
    if (this.keyboardInputMode) {
      const virtualKey = this.getVirtualKeyByPosition(x, y);
      if (virtualKey) {
        this.handleVirtualKeyInput(virtualKey);
        return;
      }
      
      // 检查是否点击了取消按钮区域
      const cancelButton = this.getCancelButtonArea();
      if (this.isPointInRect(x, y, cancelButton)) {
        this.cancelKeyboardInput();
        this.safeVibrate('light');
        return;
      }
      
      // 点击其他区域不退出，继续保持输入模式
      return;
    }

    // 检查是否点击了节奏类型下拉菜单
    const dropdownTrigger = this.getDropdownTriggerArea();
    if (this.isPointInRect(x, y, dropdownTrigger)) {
      this.toggleDropdown();
      this.safeVibrate('light');
      return;
    }

    // 如果下拉菜单展开，检查是否点击了选项
    if (this.dropdownOpen) {
      const dropdownList = this.getDropdownListArea();
      if (this.isPointInRect(x, y, dropdownList)) {
        const itemHeight = 40;
        const clickIndex = Math.floor((y - dropdownList.y) / itemHeight);
        if (clickIndex >= 0 && clickIndex < this.rhythmPatterns.length) {
          this.selectRhythmType(clickIndex);
          this.safeVibrate('light');
        }
        return;
      } else {
        // 点击下拉菜单外部，关闭菜单
        this.closeDropdown();
        return;
      }
    }

    // 检查是否点击了BPM数字区域（双击检测）
    const bpmNumberArea = this.getBPMNumberArea();
    if (this.isPointInRect(x, y, bpmNumberArea)) {
      const now = Date.now();
      if (now - this.lastClickTime < this.doubleClickThreshold) {
        // 双击检测成功，进入键盘输入模式
        this.enterKeyboardInput();
        this.safeVibrate('medium');
      }
      this.lastClickTime = now;
      return;
    }

    // 检查是否点击了BPM调整按钮
    const bpmDecreaseBtn = this.getBPMDecreaseButton();
    const bpmIncreaseBtn = this.getBPMIncreaseButton();
    
    if (this.isPointInRect(x, y, bpmDecreaseBtn)) {
      this.adjustBPM(-5);
      this.safeVibrate('light');
      return;
    }
    
    if (this.isPointInRect(x, y, bpmIncreaseBtn)) {
      this.adjustBPM(5);
      this.safeVibrate('light');
      return;
    }

    // 检查是否点击了开始游戏按钮
    const startButton = this.getStartButton();
    if (this.isPointInRect(x, y, startButton)) {
      this.startGame();
      this.safeVibrate('medium'); // 开始游戏使用更强的振动
      return;
    }
  }

  /**
   * 检查点是否在矩形内
   */
  isPointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
  }


  /**
   * 切换下拉菜单状态
   */
  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  /**
   * 关闭下拉菜单
   */
  closeDropdown() {
    this.dropdownOpen = false;
  }

  /**
   * 选择节奏类型
   * @param {number} index - 节奏类型索引
   */
  selectRhythmType(index) {
    if (index >= 0 && index < this.rhythmPatterns.length) {
      this.selectedIndex = index;
      this.selectedPatternId = this.rhythmPatterns[index].id;
      this.selectedRhythmType = this.rhythmPatterns[index].name;
      
      // 自动设置BPM
      const pattern = this.rhythmPatterns[index];
      if (pattern.bpm) {
        this.bpmInput = pattern.bpm;
        this.selectedBPM = pattern.bpm;
      }
      
      // 关闭下拉菜单
      this.closeDropdown();
    } else {
      console.warn('尝试选择无效的节奏类型索引:', index);
    }
  }

  /**
   * 获取下拉菜单触发器区域
   */
  getDropdownTriggerArea() {
    return {
      x: this.centerX - this.cardWidth / 2 + 20,
      y: this.centerY - this.cardHeight / 2 + 60,
      width: this.cardWidth - 40,
      height: 45
    };
  }

  /**
   * 获取下拉菜单列表区域
   */
  getDropdownListArea() {
    const trigger = this.getDropdownTriggerArea();
    const listHeight = Math.min(this.rhythmPatterns.length * 40, this.dropdownMaxHeight);
    return {
      x: trigger.x,
      y: trigger.y + trigger.height,
      width: trigger.width,
      height: listHeight
    };
  }

  /**
   * 获取BPM减少按钮区域
   */
  getBPMDecreaseButton() {
    return {
      x: this.centerX - 60,
      y: this.centerY + 20, // 调整位置以适应新布局
      width: 40,
      height: 40
    };
  }

  /**
   * 获取BPM增加按钮区域
   */
  getBPMIncreaseButton() {
    return {
      x: this.centerX + 20,
      y: this.centerY + 20, // 调整位置以适应新布局
      width: 40,
      height: 40
    };
  }

  /**
   * 获取BPM数字区域
   */
  getBPMNumberArea() {
    return {
      x: this.centerX - 40,
      y: this.centerY + 25,
      width: 80,
      height: 30
    };
  }

  /**
   * 进入键盘输入模式
   */
  enterKeyboardInput() {
    this.keyboardInputMode = true;
    this.originalBPMValue = this.bpmInput; // 保存原始值
    this.inputBuffer = this.bpmInput.toString();
    console.log('进入键盘输入模式');
  }

  /**
   * 退出键盘输入模式
   */
  exitKeyboardInput() {
    this.keyboardInputMode = false;
    // 应用最终的BPM值
    if (this.inputBuffer && !isNaN(parseInt(this.inputBuffer))) {
      const newBPM = Math.max(40, Math.min(200, parseInt(this.inputBuffer)));
      this.bpmInput = newBPM;
      this.selectedBPM = newBPM;
    } else if (this.inputBuffer === '') {
      // 如果输入缓冲区为空，恢复到上次的有效值
      this.bpmInput = this.selectedBPM;
    }
    this.inputBuffer = '';
    console.log('退出键盘输入模式');
  }

  /**
   * 取消键盘输入
   */
  cancelKeyboardInput() {
    this.keyboardInputMode = false;
    this.inputBuffer = '';
    // 恢复到进入键盘输入模式前的原始值
    this.bpmInput = this.originalBPMValue;
    this.selectedBPM = this.originalBPMValue;
    console.log('取消键盘输入');
  }

  /**
   * 根据输入缓冲更新BPM显示
   */
  updateBPMFromInput() {
    if (this.inputBuffer === '') {
      // 如果输入缓冲区为空，显示空值但不更新selectedBPM
      this.bpmInput = '';
      return;
    }
    
    if (!isNaN(parseInt(this.inputBuffer))) {
      const value = parseInt(this.inputBuffer);
      // 实时验证范围
      if (value >= 40 && value <= 200) {
        this.bpmInput = value;
        this.selectedBPM = value;
      } else if (value < 40) {
        // 如果小于最小值，显示输入但不应用
        this.bpmInput = value;
      } else if (value > 200) {
        // 如果大于最大值，显示输入但不应用
        this.bpmInput = value;
      }
    } else {
      // 如果不是有效数字，保持输入缓冲区显示
      this.bpmInput = this.inputBuffer;
    }
  }

  /**
   * 获取虚拟键盘按键区域
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  getVirtualKeyArea(row, col) {
    const keyboardStartY = this.centerY + 100;
    const keyboardWidth = this.keyboardButtonSize * 3 + this.keyboardSpacing * 2;
    const keyboardStartX = this.centerX - keyboardWidth / 2;
    
    return {
      x: keyboardStartX + col * (this.keyboardButtonSize + this.keyboardSpacing),
      y: keyboardStartY + row * (this.keyboardButtonSize + this.keyboardSpacing),
      width: this.keyboardButtonSize,
      height: this.keyboardButtonSize
    };
  }

  /**
   * 根据位置获取虚拟按键
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  getVirtualKeyByPosition(x, y) {
    for (let row = 0; row < this.virtualKeyboard.length; row++) {
      for (let col = 0; col < this.virtualKeyboard[row].length; col++) {
        const keyArea = this.getVirtualKeyArea(row, col);
        if (this.isPointInRect(x, y, keyArea)) {
          return this.virtualKeyboard[row][col];
        }
      }
    }
    return null;
  }

  /**
   * 获取取消按钮区域
   */
  getCancelButtonArea() {
    return {
      x: this.centerX + 80,
      y: this.centerY + 100,
      width: 60,
      height: 40
    };
  }
  getStartButton() {
    return {
      x: this.centerX - 80,
      y: this.centerY + 90, // 调整位置以适应新布局
      width: 160,
      height: 50
    };
  }

  /**
   * 调整BPM
   */
  adjustBPM(delta) {
    // 在键盘输入模式下禁用按钮调整
    if (this.keyboardInputMode) {
      return;
    }
    
    this.bpmInput = Math.max(40, Math.min(200, this.bpmInput + delta));
    this.selectedBPM = this.bpmInput;
  }

  /**
   * 开始游戏
   */
  startGame() {
    // 如果没有选择节奏模式，则尝试选择第一个可用的模式
    if (!this.selectedPatternId) {
      if (this.rhythmPatterns.length > 0) {
        console.log('未选择节奏模式，自动选择第一个模式');
        this.selectRhythmType(0);
      } else {
        console.warn('没有可用的节奏模式');
        return;
      }
    }
    
    // 确保BPM在有效范围内
    this.selectedBPM = Math.max(40, Math.min(200, this.selectedBPM));
    this.bpmInput = this.selectedBPM;
    
    // 隐藏选择器
    this.isVisible = false;
    
    // 调用回调函数
    if (this.onStartGame) {
      this.onStartGame({
        patternId: this.selectedPatternId,
        bpm: this.selectedBPM,
        rhythmType: this.selectedRhythmType
      });
    } else {
      console.warn('未设置开始游戏的回调函数');
    }
  }

  /**
   * 显示选择器
   */
  show() {
    this.isVisible = true;
  }

  /**
   * 以初始模式显示（游戏开始前）
   */
  showInitial() {
    this.displayMode = 'initial';
    this.show();
  }

  /**
   * 以游戏内模式显示（游戏过程中）
   */
  showInGame() {
    this.displayMode = 'in-game';
    this.show();
  }

  /**
   * 隐藏选择器
   */
  hide() {
    this.isVisible = false;
    // 退出键盘输入模式
    if (this.keyboardInputMode) {
      this.exitKeyboardInput();
    }
    // 解绑事件，释放资源
    this.unbindEvents();
  }

  /**
   * 渲染选择器界面
   */
  render(ctx) {
    if (!this.isVisible) return;

    // 绘制半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制主卡片
    this.renderCard(ctx);
    
    // 绘制标题
    this.renderTitle(ctx);
    
    // 绘制节奏模式下拉菜单
    this.renderRhythmDropdown(ctx);
    
    // 绘制BPM选择
    this.renderBPMSelector(ctx);
    
    // 绘制开始按钮
    this.renderStartButton(ctx);
  }

  /**
   * 绘制主卡片
   */
  renderCard(ctx) {
    const cardX = this.centerX - this.cardWidth / 2;
    const cardY = this.centerY - this.cardHeight / 2;
    
    // 绘制卡片背景
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(cardX, cardY, this.cardWidth, this.cardHeight);
    
    // 绘制卡片边框
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.strokeRect(cardX, cardY, this.cardWidth, this.cardHeight);
  }

  /**
   * 绘制标题
   */
  renderTitle(ctx) {
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('选择节奏模式', this.centerX, this.centerY - this.cardHeight / 2 + 40);
  }


  /**
   * 绘制节奏模式下拉菜单
   */
  renderRhythmDropdown(ctx) {
    const trigger = this.getDropdownTriggerArea();
    
    // 绘制标题
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('节奏模式:', trigger.x, trigger.y - 10);
    
    // 绘制下拉菜单触发器
    ctx.fillStyle = '#34495e';
    ctx.fillRect(trigger.x, trigger.y, trigger.width, trigger.height);
    
    // 绘制边框
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.strokeRect(trigger.x, trigger.y, trigger.width, trigger.height);
    
    // 绘制当前选中的节奏模式
    const selectedItem = this.rhythmPatterns[this.selectedIndex] || { name: '未选择' };
    
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(selectedItem.name, trigger.x + 15, trigger.y + 28);
    
    // 绘制下拉箭头
    const arrowX = trigger.x + trigger.width - 25;
    const arrowY = trigger.y + trigger.height / 2;
    this.drawDropdownArrow(ctx, arrowX, arrowY, this.dropdownOpen);
    
    // 如果下拉菜单展开，绘制选项列表
    if (this.dropdownOpen) {
      this.renderDropdownList(ctx);
    }
  }

  /**
   * 绘制下拉箭头
   */
  drawDropdownArrow(ctx, x, y, isOpen) {
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    
    if (isOpen) {
      // 向上的箭头
      ctx.moveTo(x - 6, y + 3);
      ctx.lineTo(x, y - 3);
      ctx.lineTo(x + 6, y + 3);
    } else {
      // 向下的箭头
      ctx.moveTo(x - 6, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x + 6, y - 3);
    }
    
    ctx.closePath();
    ctx.fill();
  }

  /**
   * 绘制下拉菜单列表
   */
  renderDropdownList(ctx) {
    const listArea = this.getDropdownListArea();
    
    // 绘制列表背景
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(listArea.x, listArea.y, listArea.width, listArea.height);
    
    // 绘制列表边框
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.strokeRect(listArea.x, listArea.y, listArea.width, listArea.height);
    
    // 绘制每个节奏模式选项
    this.rhythmPatterns.forEach((type, index) => {
      const itemY = listArea.y + index * 40;
      const isSelected = index === this.selectedIndex;
      const isHovered = false; // 可以后续添加悬停效果
      
      // 绘制选项背景
      if (isSelected) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(listArea.x + 2, itemY, listArea.width - 4, 38);
      } else if (isHovered) {
        ctx.fillStyle = '#34495e';
        ctx.fillRect(listArea.x + 2, itemY, listArea.width - 4, 38);
      }
      
      // 绘制选项分割线
      if (index > 0) {
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(listArea.x + 10, itemY);
        ctx.lineTo(listArea.x + listArea.width - 10, itemY);
        ctx.stroke();
      }
      
      // 绘制选项文本
      ctx.fillStyle = isSelected ? '#ffffff' : '#ecf0f1';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(type.name, listArea.x + 15, itemY + 15);
      
      // 绘制描述文本
      ctx.fillStyle = isSelected ? '#ecf0f1' : '#95a5a6';
      ctx.font = '11px Arial';
      ctx.fillText(type.description, listArea.x + 15, itemY + 30);
    });
  }

  /**
   * 绘制BPM选择器
   */
  renderBPMSelector(ctx) {
    // 绘制标题
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('节奏速度 (BPM)', this.centerX, this.centerY);
    
    // 绘制减少按钮
    const decreaseBtn = this.getBPMDecreaseButton();
    ctx.fillStyle = this.keyboardInputMode ? '#95a5a6' : '#e74c3c'; // 键盘输入模式下禁用按钮
    ctx.fillRect(decreaseBtn.x, decreaseBtn.y, decreaseBtn.width, decreaseBtn.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('-', decreaseBtn.x + decreaseBtn.width / 2, decreaseBtn.y + decreaseBtn.height / 2 + 8);
    
    // 绘制BPM数值区域
    const numberArea = this.getBPMNumberArea();
    
    // 如果正在键盘输入，显示输入框样式
    if (this.keyboardInputMode) {
      // 绘制输入框背景
      ctx.fillStyle = '#3498db';
      ctx.fillRect(numberArea.x, numberArea.y, numberArea.width, numberArea.height);
      
      // 绘制输入框边框
      ctx.strokeStyle = '#2980b9';
      ctx.lineWidth = 2;
      ctx.strokeRect(numberArea.x, numberArea.y, numberArea.width, numberArea.height);
      
      // 显示当前输入内容
      const displayText = this.inputBuffer || '0';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(displayText, this.centerX, this.centerY + 45);
      
      // 绘制光标（闪烁效果）
      const time = Date.now();
      if (Math.floor(time / 500) % 2 === 0) {
        const textWidth = ctx.measureText(displayText).width;
        const cursorX = this.centerX + textWidth / 2 + 2;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cursorX, numberArea.y + 5);
        ctx.lineTo(cursorX, numberArea.y + numberArea.height - 5);
        ctx.stroke();
      }
      
      // 绘制虚拟键盘
      this.renderVirtualKeyboard(ctx);
      
      // 绘制取消按钮
      this.renderCancelButton(ctx);
      
    } else {
      // 正常模式，绘制双击提示
      ctx.fillStyle = '#ecf0f1';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.bpmInput.toString(), this.centerX, this.centerY + 45);
      
      // 绘制双击提示文字
      ctx.fillStyle = '#95a5a6';
      ctx.font = '12px Arial';
      ctx.fillText('（双击数字进行键盘输入）', this.centerX, this.centerY + 65);
    }
    
    // 绘制增加按钮
    const increaseBtn = this.getBPMIncreaseButton();
    ctx.fillStyle = this.keyboardInputMode ? '#95a5a6' : '#27ae60'; // 键盘输入模式下禁用按钮
    ctx.fillRect(increaseBtn.x, increaseBtn.y, increaseBtn.width, increaseBtn.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+', increaseBtn.x + increaseBtn.width / 2, increaseBtn.y + increaseBtn.height / 2 + 8);
  }

  /**
   * 绘制开始游戏按钮
   */
  renderStartButton(ctx) {
    const button = this.getStartButton();
    
    // 绘制按钮背景
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(button.x, button.y, button.width, button.height);
    
    // 绘制按钮边框
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 3;
    ctx.strokeRect(button.x, button.y, button.width, button.height);
    
    // 根据模式显示不同文本
    const buttonText = this.displayMode === 'in-game' ? '应用设置' : '开始游戏';
    
    // 绘制按钮文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(buttonText, button.x + button.width / 2, button.y + button.height / 2 + 6);
  }

  /**
   * 绘制虚拟键盘
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  renderVirtualKeyboard(ctx) {
    if (!this.keyboardInputMode) return;
    
    // 绘制键盘背景
    const keyboardStartY = this.centerY + 100;
    const keyboardWidth = this.keyboardButtonSize * 3 + this.keyboardSpacing * 2;
    const keyboardHeight = this.keyboardButtonSize * 4 + this.keyboardSpacing * 3;
    const keyboardStartX = this.centerX - keyboardWidth / 2;
    
    // 绘制半透明背景
    ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
    ctx.fillRect(
      keyboardStartX - 10, 
      keyboardStartY - 10, 
      keyboardWidth + 20, 
      keyboardHeight + 20
    );
    
    // 绘制边框
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      keyboardStartX - 10, 
      keyboardStartY - 10, 
      keyboardWidth + 20, 
      keyboardHeight + 20
    );
    
    // 绘制每个按键
    for (let row = 0; row < this.virtualKeyboard.length; row++) {
      for (let col = 0; col < this.virtualKeyboard[row].length; col++) {
        const key = this.virtualKeyboard[row][col];
        const keyArea = this.getVirtualKeyArea(row, col);
        
        // 根据按键类型设置颜色
        let keyColor = '#34495e';
        let textColor = '#ecf0f1';
        
        if (key === '✓') {
          // 确认按钮
          keyColor = '#27ae60';
          textColor = '#ffffff';
        } else if (key === '←') {
          // 退格按钮
          keyColor = '#e74c3c';
          textColor = '#ffffff';
        } else if (key >= '0' && key <= '9') {
          // 数字按钮
          keyColor = '#2c3e50';
          textColor = '#ecf0f1';
        }
        
        // 绘制按键背景
        ctx.fillStyle = keyColor;
        ctx.fillRect(keyArea.x, keyArea.y, keyArea.width, keyArea.height);
        
        // 绘制按键边框
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 1;
        ctx.strokeRect(keyArea.x, keyArea.y, keyArea.width, keyArea.height);
        
        // 绘制按键文字
        ctx.fillStyle = textColor;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          key, 
          keyArea.x + keyArea.width / 2, 
          keyArea.y + keyArea.height / 2 + 6
        );
      }
    }
    
    // 绘制提示文字
    ctx.fillStyle = '#95a5a6';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      '使用虚拟键盘输入BPM值 (40-200)', 
      this.centerX, 
      keyboardStartY + keyboardHeight + 30
    );
  }

  /**
   * 绘制取消按钮
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  renderCancelButton(ctx) {
    if (!this.keyboardInputMode) return;
    
    const cancelBtn = this.getCancelButtonArea();
    
    // 绘制按钮背景
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(cancelBtn.x, cancelBtn.y, cancelBtn.width, cancelBtn.height);
    
    // 绘制按钮边框
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    ctx.strokeRect(cancelBtn.x, cancelBtn.y, cancelBtn.width, cancelBtn.height);
    
    // 绘制按钮文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      '取消', 
      cancelBtn.x + cancelBtn.width / 2, 
      cancelBtn.y + cancelBtn.height / 2 + 5
    );
  }

  /**
   * 获取当前选择的配置
   */
  getSelectedConfig() {
    if (!this.selectedPatternId) {
      return null;
    }
    
    const pattern = this.rhythmPatterns[this.selectedIndex];
    return {
      mode: 'pattern',
      patternId: this.selectedPatternId,
      rhythmName: pattern.name,
      bpm: this.selectedBPM,
      difficulty: pattern.difficulty,
      timeSignature: pattern.timeSignature
    };
  }
}