import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

/**
 * 轨道系统 - 管理四条垂直轨道
 */
export default class TrackSystem {
  constructor() {
    this.trackCount = 4;
    this.trackWidth = SCREEN_WIDTH / this.trackCount;
    this.tracks = [];
    
    // 初始化轨道
    this.initTracks();
  }

  /**
   * 初始化轨道
   */
  initTracks() {
    for (let i = 0; i < this.trackCount; i++) {
      this.tracks.push({
        index: i,
        x: i * this.trackWidth,
        width: this.trackWidth,
        color: this.getTrackColor(i),
        keyBinding: this.getKeyBinding(i)
      });
    }
  }

  /**
   * 获取轨道颜色
   */
  getTrackColor(index) {
    const colors = ['#FF6B6B40', '#4ECDC440', '#45B7D140', '#96CEB440'];
    return colors[index] || '#FFFFFF40';
  }

  /**
   * 获取按键绑定
   */
  getKeyBinding(index) {
    const keys = ['A', 'S', 'D', 'F'];
    return keys[index] || '';
  }

  /**
   * 渲染判定区域（半透明显示）
   * @param {*} ctx - 绘图上下文
   */
  renderJudgeZone(ctx) {
    const judgeZone = this.getJudgeZone();
    const judgeLineY = SCREEN_HEIGHT * 2 / 3;
    
    // PERFECT区域（以判定线为中心，上下各扩展1/6屏幕高度）
    const perfectZoneHeight = SCREEN_HEIGHT / 6; // PERFECT区域高度
    const perfectZoneY = judgeLineY - perfectZoneHeight / 2;
    
    // GOOD区域（包围PERFECT区域的上下区域）
    const goodZoneTopY = judgeZone.y;
    const goodZoneTopHeight = perfectZoneY - judgeZone.y;
    const goodZoneBottomY = perfectZoneY + perfectZoneHeight;
    const goodZoneBottomHeight = (judgeZone.y + judgeZone.height) - goodZoneBottomY;
    
    // 绘制GOOD区域（低透明度）
    ctx.fillStyle = '#00FF0015'; // 绿色，低透明度（15/255 ≈ 6%）
    
    // 上GOOD区域
    if (goodZoneTopHeight > 0) {
      ctx.fillRect(0, goodZoneTopY, SCREEN_WIDTH, goodZoneTopHeight);
    }
    
    // 下GOOD区域
    if (goodZoneBottomHeight > 0) {
      ctx.fillRect(0, goodZoneBottomY, SCREEN_WIDTH, goodZoneBottomHeight);
    }
    
    // 绘制PERFECT区域（高透明度）
    ctx.fillStyle = '#FFD70030'; // 金色，高透明度（48/255 ≈ 19%）
    ctx.fillRect(0, perfectZoneY, SCREEN_WIDTH, perfectZoneHeight);
    
    // 绘制区域边界线
    ctx.strokeStyle = '#FFFFFF20'; // 半透明白色边框
    ctx.lineWidth = 1;
    
    // 判定区域上边界
    ctx.beginPath();
    ctx.moveTo(0, judgeZone.y);
    ctx.lineTo(SCREEN_WIDTH, judgeZone.y);
    ctx.stroke();
    
    // 判定区域下边界
    ctx.beginPath();
    ctx.moveTo(0, judgeZone.y + judgeZone.height);
    ctx.lineTo(SCREEN_WIDTH, judgeZone.y + judgeZone.height);
    ctx.stroke();
    
    // PERFECT区域边界
    ctx.strokeStyle = '#FFD70040'; // 金色边框，较明显
    ctx.beginPath();
    ctx.moveTo(0, perfectZoneY);
    ctx.lineTo(SCREEN_WIDTH, perfectZoneY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, perfectZoneY + perfectZoneHeight);
    ctx.lineTo(SCREEN_WIDTH, perfectZoneY + perfectZoneHeight);
    ctx.stroke();
  }

  /**
   * 渲染轨道
   */
  render(ctx) {
    // 绘制轨道背景
    this.tracks.forEach((track, index) => {
      // 轨道背景
      ctx.fillStyle = track.color;
      ctx.fillRect(track.x, 0, track.width, SCREEN_HEIGHT);
      
      // 轨道分界线
      if (index < this.trackCount - 1) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(track.x + track.width, 0);
        ctx.lineTo(track.x + track.width, SCREEN_HEIGHT);
        ctx.stroke();
      }
    });

    // 绘制判定区域（半透明显示）
    this.renderJudgeZone(ctx);

    // 绘制判定线 (屏幕2/3位置，即从顶部1/3处)
    const judgeLineY = SCREEN_HEIGHT * 2 / 3; // 判定线位置
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, judgeLineY);
    ctx.lineTo(SCREEN_WIDTH, judgeLineY);
    ctx.stroke();

    // 在判定线上绘制按键提示
    this.tracks.forEach((track) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        track.keyBinding,
        track.x + track.width / 2,
        judgeLineY - 10
      );
    });
  }

  /**
   * 获取轨道信息
   * @param {number} index - 轨道索引
   */
  getTrack(index) {
    return this.tracks[index];
  }

  /**
   * 根据X坐标获取轨道索引
   * @param {number} x - X坐标
   */
  getTrackByX(x) {
    for (let i = 0; i < this.trackCount; i++) {
      const track = this.tracks[i];
      if (x >= track.x && x < track.x + track.width) {
        return i;
      }
    }
    return -1; // 未找到
  }

  /**
   * 获取判定区域信息
   */
  getJudgeZone() {
    const judgeZoneHeight = SCREEN_HEIGHT / 3; // 判定区域高度为屏幕高度的三分之一
    const judgeLineY = SCREEN_HEIGHT * 2 / 3; // 判定线位置
    const perfectZoneHeight = SCREEN_HEIGHT / 6; // PERFECT区域高度（判定区域的一半）
    
    return {
      y: judgeLineY - judgeZoneHeight / 2, // 判定区域顶部（以判定线为中心）
      height: judgeZoneHeight, // 判定区域高度
      perfectY: judgeLineY, // 完美判定线（就是主判定线）
      perfectZoneY: judgeLineY - perfectZoneHeight / 2, // PERFECT区域顶部
      perfectZoneHeight: perfectZoneHeight, // PERFECT区域高度
      goodRange: judgeZoneHeight / 2 // 良好判定范围（判定区域的一半）
    };
  }

  /**
   * 高亮轨道（按键按下时的视觉反馈）
   * @param {number} trackIndex - 轨道索引
   * @param {*} ctx - 绘图上下文
   */
  highlightTrack(trackIndex, ctx) {
    if (trackIndex < 0 || trackIndex >= this.trackCount) return;
    
    const track = this.tracks[trackIndex];
    const judgeZone = this.getJudgeZone();
    
    // 绘制高亮效果
    ctx.fillStyle = '#FFFFFF60';
    ctx.fillRect(track.x, judgeZone.y, track.width, judgeZone.height);
  }
}