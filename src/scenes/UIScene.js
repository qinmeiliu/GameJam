// ============================================================
// UIScene – Persistent HUD overlay (runs on top of GameScene)
// Shows balance, current bet, chip selector, and win/loss toasts
// ============================================================

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    const { width, height } = this.scale;

    // ── Balance display ────────────────────────────────────────
    this.balanceLabel = this.add.text(20, 20, '', {
      fontFamily: VI.FONTS.HEADING,
      fontSize:   '22px',
      color:      VI.HEX.GOLD,
      stroke:     '#000',
      strokeThickness: 3,
    });
    this._updateBalance(this.gameScene.playerBalance);

    // ── Bet display ────────────────────────────────────────────
    this.betLabel = this.add.text(20, 54, 'BET: $0', {
      fontFamily: VI.FONTS.BODY,
      fontSize:   '16px',
      color:      '#ffffff99',
    });

    // ── Chip tray ─────────────────────────────────────────────
    this._buildChipTray(width / 2, height - 44);

    // ── Event listeners from GameScene ─────────────────────────
    this.gameScene.events.on('balanceChanged', this._updateBalance, this);
    this.gameScene.events.on('roundResolved',  this._showToast,     this);

    // Cleanup when UIScene stops
    this.events.on('shutdown', () => {
      this.gameScene.events.off('balanceChanged', this._updateBalance, this);
      this.gameScene.events.off('roundResolved',  this._showToast,     this);
    });
  }

  // ── Private helpers ─────────────────────────────────────────

  _updateBalance(amount) {
    this.balanceLabel.setText(`BALANCE  $${amount.toLocaleString()}`);
  }

  _buildChipTray(cx, cy) {
    const chips = VI.GAME.CHIP_DENOMINATIONS;
    const spacing = 72;
    const startX  = cx - ((chips.length - 1) / 2) * spacing;

    // Tray background
    const tw = chips.length * spacing + 40;
    const g  = this.add.graphics();
    g.fillStyle(VI.COLORS.BG_SURFACE, 0.85);
    g.fillRoundedRect(startX - 56, cy - 28, tw, 56, 28);
    g.lineStyle(1, VI.COLORS.GOLD, 0.4);
    g.strokeRoundedRect(startX - 56, cy - 28, tw, 56, 28);

    chips.forEach((value, i) => {
      const x = startX + i * spacing;
      this._drawChip(x, cy, value);
    });
  }

  _drawChip(x, y, value) {
    const CHIP_COLORS = {
      1:   VI.COLORS.WHITE,
      5:   0xff4444,
      25:  0x44cc44,
      100: VI.COLORS.NEON_BLUE,
      500: VI.COLORS.GOLD,
    };

    const g = this.add.graphics();
    const color = CHIP_COLORS[value] ?? VI.COLORS.PURPLE;

    // Outer ring
    g.lineStyle(3, color, 1);
    g.strokeCircle(x, y, 24);

    // Fill
    g.fillStyle(color, 0.25);
    g.fillCircle(x, y, 24);

    // Dash marks
    g.lineStyle(2, color, 0.6);
    for (let a = 0; a < 360; a += 45) {
      const rad = Phaser.Math.DegToRad(a);
      g.lineBetween(
        x + Math.cos(rad) * 18, y + Math.sin(rad) * 18,
        x + Math.cos(rad) * 24, y + Math.sin(rad) * 24,
      );
    }

    // Value label
    const label = value >= 100 ? `${value / 100}C` : `${value}`;
    const txt = this.add.text(x, y, label, {
      fontFamily: VI.FONTS.HEADING,
      fontSize:   '11px',
      color:      '#fff',
    }).setOrigin(0.5);

    // Hit area
    const zone = this.add.zone(x, y, 52, 52).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { g.setScale(1.15); txt.setScale(1.15); });
    zone.on('pointerout',   () => { g.setScale(1);    txt.setScale(1); });
    zone.on('pointerup',    () => {
      this.gameScene.placeBet(value);
      this.betLabel.setText(`BET: $${this.gameScene.currentBet}`);
    });
  }

  _showToast({ winnings, multiplier }) {
    const { width } = this.scale;
    const isWin  = multiplier > 1;
    const msg    = isWin ? `WIN  +$${winnings}` : `LOSS  -$${Math.abs(winnings)}`;
    const colour = isWin ? VI.HEX.GOLD : '#ff4444';

    const toast = this.add.text(width / 2, 120, msg, {
      fontFamily: VI.FONTS.HEADING,
      fontSize:   '36px',
      color:      colour,
      stroke:     '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets:  toast,
      alpha:    { from: 0, to: 1 },
      y:        { from: 140, to: 100 },
      duration: 300,
      ease:     'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets:  toast,
          alpha:    0,
          y:        70,
          delay:    1200,
          duration: 400,
          onComplete: () => toast.destroy(),
        });
      },
    });
  }
}
