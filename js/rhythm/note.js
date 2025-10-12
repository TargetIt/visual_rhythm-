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
    
    // 计算轨道位置
    const trackWidth = SCREEN_WIDTH / 4;
    this.x = track * trackWidth + (trackWidth - this.width) / 2;
    this.y = -this.height; // 从顶部开始
    
    // 根据轨道设置颜色
    this.color = this.getTrackColor(track);
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
    
    // 绘制节奏点
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // 绘制边框
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
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