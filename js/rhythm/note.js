import Sprite from '../base/sprite';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

// 节奏点相关常量
const NOTE_WIDTH = 60;
const NOTE_HEIGHT = 20;
const NOTE_SPEED = 4; // 节奏点下落速度

/**
 * 节奏点类 - 从顶部落下的节拍元素
 */
export default class Note extends Sprite {
  constructor() {
    super('', NOTE_WIDTH, NOTE_HEIGHT);
    
    this.track = 0; // 所在轨道 (0-3)
    this.speed = NOTE_SPEED;
    this.isActive = true;
    this.hitTime = 0; // 预期命中时间
    
    // 新增的音符属性
    this.isStrongNote = false; // 是否为强音符
    this.isWeakNote = false; // 是否为弱音符
    this.velocity = 1.0; // 音符强度 (0-1)
    this.is8thNote = false; // 是否为8分音符
    this.is16thNote = false; // 是否为16分音符
  }

  /**
   * 初始化节奏点
   * @param {number} track - 轨道编号 (0-3)
   * @param {number} hitTime - 预期命中时间
   */
  init(track, hitTime) {
    this.track = track;
    this.hitTime = hitTime;
    this.isActive = true;
    
    console.log(`初始化Note: 轨道${track}, 命中时间${hitTime}`);
    
    // 计算轨道位置
    const trackWidth = SCREEN_WIDTH / 4;
    this.x = track * trackWidth + (trackWidth - this.width) / 2;
    this.y = -this.height; // 从顶部开始
    
    // 根据轨道设置颜色
    this.color = this.getTrackColor(track);
    
    console.log(`Note位置: x=${this.x}, y=${this.y}`);
  }

  /**
   * 根据轨道获取颜色
   */
  getTrackColor(track) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    return colors[track] || '#FFFFFF';
  }

  /**
   * 更新节奏点位置
   */
  update() {
    if (!this.isActive) return;
    
    this.y += this.speed;
    
    // 如果超出屏幕底部，标记为非活跃状态
    if (this.y > SCREEN_HEIGHT + 50) {
      this.destroy();
    }
  }

  /**
   * 渲染节奏点
   */
  render(ctx) {
    if (!this.isActive) return;
    
    // 添加调试日志
    console.log(`渲染Note: 轨道${this.track}, 位置(${this.x}, ${this.y}), 活跃状态${this.isActive}`);

    // 根据音符类型调整颜色和样式
    let fillColor = this.color;
    let strokeColor = '#FFFFFF';
    let strokeWidth = 2;
    
    // 强音符：更亮的颜色和更粗的边框
    if (this.isStrongNote) {
      strokeColor = '#FFD700'; // 金色边框
      strokeWidth = 3;
      // 增加亮度
      fillColor = this.adjustColorBrightness(this.color, 0.3);
    }
    
    // 弱音符：较暗的颜色和较细的边框
    if (this.isWeakNote) {
      strokeColor = '#CCCCCC'; // 灰色边框
      strokeWidth = 1;
      // 降低亮度
      fillColor = this.adjustColorBrightness(this.color, -0.3);
    }
    
    // 8分音符：添加特殊标记
    if (this.is8thNote) {
      strokeWidth = 2;
      strokeColor = '#FF6B6B';
    }
    
    // 16分音符：添加特殊标记
    if (this.is16thNote) {
      strokeWidth = 2;
      strokeColor = '#4ECDC4';
    }
    
    // 绘制节奏点
    ctx.fillStyle = fillColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // 绘制边框
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // 为特殊音符类型添加额外标记
    if (this.is8thNote || this.is16thNote) {
      this.renderNoteTypeMark(ctx);
    }
  }

  /**
   * 渲染音符类型标记
   */
  renderNoteTypeMark(ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    
    const markText = this.is8thNote ? '8' : '16';
    ctx.fillText(
      markText,
      this.x + this.width / 2,
      this.y + this.height / 2 + 4
    );
  }

  /**
   * 调整颜色亮度
   * @param {string} color - 十六进制颜色值
   * @param {number} amount - 调整量 (-1 到 1)
   */
  adjustColorBrightness(color, amount) {
    // 移除 # 号
    const hex = color.replace('#', '');
    
    // 转换为RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 调整亮度
    const newR = Math.max(0, Math.min(255, Math.round(r + amount * 255)));
    const newG = Math.max(0, Math.min(255, Math.round(g + amount * 255)));
    const newB = Math.max(0, Math.min(255, Math.round(b + amount * 255)));
    
    // 转换回十六进制
    const toHex = (n) => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  }

  /**
   * 销毁节奏点
   */
  destroy() {
    this.isActive = false;
    // 从数据管理器中移除
    GameGlobal.databus.removeNote(this);
  }

  /**
   * 检查是否在判定区域内
   * @param {number} judgeY - 判定区域Y坐标
   * @param {number} judgeHeight - 判定区域高度
   */
  isInJudgeZone(judgeY, judgeHeight) {
    return this.y + this.height >= judgeY && this.y <= judgeY + judgeHeight;
  }

  /**
   * 获取判定结果
   * @param {Object} judgeZone - 判定区域信息
   */
  getJudgeResult(judgeZone) {
    const noteCenter = this.y + this.height / 2;
    const perfectY = judgeZone.perfectY;
    const perfectZoneY = judgeZone.perfectZoneY;
    const perfectZoneHeight = judgeZone.perfectZoneHeight;
    
    // 检查是否在PERFECT区域内
    if (noteCenter >= perfectZoneY && noteCenter <= perfectZoneY + perfectZoneHeight) {
      return 'PERFECT';
    }
    
    // 检查是否在GOOD区域内（整个判定区域除去PERFECT区域）
    if (noteCenter >= judgeZone.y && noteCenter <= judgeZone.y + judgeZone.height) {
      return 'GOOD';
    }
    
    // 超出判定区域
    return 'MISS';
  }
}