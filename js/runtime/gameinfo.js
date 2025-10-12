import Emitter from '../libs/tinyemitter';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

const atlas = wx.createImage();
atlas.src = 'images/Common.png';

export default class GameInfo extends Emitter {
  constructor() {
    super();

    this.btnArea = {
      startX: SCREEN_WIDTH / 2 - 40,
      startY: SCREEN_HEIGHT / 2 - 100 + 180,
      endX: SCREEN_WIDTH / 2 + 50,
      endY: SCREEN_HEIGHT / 2 - 100 + 255,
    };

    // 绑定触摸事件
    wx.onTouchStart(this.touchEventHandler.bind(this))
  }

  setFont(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
  }

  render(ctx) {
    this.renderGameScore(ctx); // 绘制当前分数和连击

    // 游戏结束时停止帧循环并显示游戏结束画面
    if (GameGlobal.databus.isGameOver) {
      this.renderGameOver(ctx); // 绘制游戏结束画面
    }
  }

  renderGameScore(ctx) {
    // 防护检查，确保DataBus正确初始化
    if (!GameGlobal.databus || typeof GameGlobal.databus.getGameStats !== 'function') {
      this.setFont(ctx);
      ctx.fillText('初始化中...', 10, 30);
      return;
    }
    
    const stats = GameGlobal.databus.getGameStats();
    this.setFont(ctx);
    
    // 显示分数
    ctx.fillText(`分数: ${stats.score}`, 10, 30);
    
    // 显示连击
    ctx.fillText(`连击: ${stats.combo}`, 10, 60);
    
    // 显示BPM
    ctx.fillText(`BPM: ${GameGlobal.databus.bpm}`, 10, 90);
    
    // 显示精度（右上角）
    ctx.textAlign = 'right';
    ctx.fillText(`精度: ${stats.accuracy}%`, SCREEN_WIDTH - 10, 30);
    ctx.fillText(`最大连击: ${stats.maxCombo}`, SCREEN_WIDTH - 10, 60);
    
    // 显示命中统计
    ctx.fillText(`P: ${stats.perfectHits}`, SCREEN_WIDTH - 10, 90);
    ctx.fillText(`G: ${stats.goodHits}`, SCREEN_WIDTH - 10, 120);
    ctx.fillText(`M: ${stats.missHits}`, SCREEN_WIDTH - 10, 150);
    
    // 重置文本对齐
    ctx.textAlign = 'left';
  }

  renderGameOver(ctx) {
    // 防护检查
    if (!GameGlobal.databus || typeof GameGlobal.databus.getGameStats !== 'function') {
      this.drawGameOverImage(ctx);
      this.setFont(ctx);
      ctx.fillText('游戏结束', SCREEN_WIDTH / 2 - 40, SCREEN_HEIGHT / 2 - 100 + 50);
      this.drawRestartButton(ctx);
      return;
    }
    
    const stats = GameGlobal.databus.getGameStats();
    this.drawGameOverImage(ctx);
    this.drawGameOverText(ctx, stats);
    this.drawRestartButton(ctx);
  }

  drawGameOverImage(ctx) {
    ctx.drawImage(
      atlas,
      0,
      0,
      119,
      108,
      SCREEN_WIDTH / 2 - 150,
      SCREEN_HEIGHT / 2 - 100,
      300,
      300
    );
  }

  drawGameOverText(ctx, stats) {
    this.setFont(ctx);
    ctx.textAlign = 'center';
    
    ctx.fillText(
      '游戏结束',
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2 - 100 + 50
    );
    
    // 显示详细统计
    ctx.font = '16px Arial';
    const yStart = SCREEN_HEIGHT / 2 - 100 + 80;
    const lineHeight = 25;
    
    ctx.fillText(`最终得分: ${stats.score}`, SCREEN_WIDTH / 2, yStart);
    ctx.fillText(`最大连击: ${stats.maxCombo}`, SCREEN_WIDTH / 2, yStart + lineHeight);
    ctx.fillText(`精度: ${stats.accuracy}%`, SCREEN_WIDTH / 2, yStart + lineHeight * 2);
    ctx.fillText(`PERFECT: ${stats.perfectHits}`, SCREEN_WIDTH / 2, yStart + lineHeight * 3);
    ctx.fillText(`GOOD: ${stats.goodHits}`, SCREEN_WIDTH / 2, yStart + lineHeight * 4);
    ctx.fillText(`MISS: ${stats.missHits}`, SCREEN_WIDTH / 2, yStart + lineHeight * 5);
    
    // 重置样式
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
  }

  drawRestartButton(ctx) {
    ctx.drawImage(
      atlas,
      120,
      6,
      39,
      24,
      SCREEN_WIDTH / 2 - 60,
      SCREEN_HEIGHT / 2 - 100 + 180,
      120,
      40
    );
    ctx.fillText(
      '重新开始',
      SCREEN_WIDTH / 2 - 40,
      SCREEN_HEIGHT / 2 - 100 + 205
    );
  }

  touchEventHandler(event) {
    const { clientX, clientY } = event.touches[0]; // 获取触摸点的坐标

    // 当前只有游戏结束时展示了UI，所以只处理游戏结束时的状态
    if (GameGlobal.databus.isGameOver) {
      // 检查触摸是否在按钮区域内
      if (
        clientX >= this.btnArea.startX &&
        clientX <= this.btnArea.endX &&
        clientY >= this.btnArea.startY &&
        clientY <= this.btnArea.endY
      ) {
        // 调用重启游戏的回调函数
        this.emit('restart');
      }
    }
  }
}
