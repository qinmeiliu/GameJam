// ============================================================
// GameScene – Core game logic lives here
// This is the main game loop / state machine.
// Replace the placeholder content with your actual game mechanic.
// ============================================================

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    // Receive any data passed from MenuScene (e.g., selected stake)
    this.playerBalance = data.balance ?? VI.GAME.DEFAULT_BALANCE;
    this.currentBet    = 0;
  }

  create() {
    const { width, height } = this.scale;

    // ── Background ────────────────────────────────────────────
    this._drawTableFelt();

    // ── Launch persistent HUD overlay ─────────────────────────
    this.scene.launch('UIScene', { gameScene: this });

    // ── Ducky mascot (idle position, bottom-right) ─────────────
    // this.ducky = this.add.sprite(width - 140, height - 140, 'ducky-anim');
    // this.ducky.play('ducky-idle');
    this._drawDuckyCorner(width - 140, height - 140);

    // ── Placeholder: replace with real game mechanic ───────────
    this._buildPlaceholderContent();

    // ── Input ─────────────────────────────────────────────────
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  update() {
    // Game loop – add real-time logic here if needed
  }

  // ── Called by UIScene when a bet is confirmed ────────────────
  placeBet(amount) {
    if (amount > this.playerBalance) return;
    this.currentBet     = amount;
    this.playerBalance -= amount;
    this.events.emit('balanceChanged', this.playerBalance);
  }

  // ── Called at round resolution ───────────────────────────────
  resolveRound(multiplier) {
    const winnings      = Math.floor(this.currentBet * multiplier);
    this.playerBalance += winnings;
    this.currentBet     = 0;
    this.events.emit('balanceChanged', this.playerBalance);
    this.events.emit('roundResolved', { winnings, multiplier });

    if (multiplier > 1) {
      this._playWinEffect();
    }
  }

  // ── Private helpers ─────────────────────────────────────────

  _drawTableFelt() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.fillStyle(VI.COLORS.BG_DEEP, 1);
    g.fillRect(0, 0, width, height);

    // Subtle felt texture suggestion
    g.fillStyle(0x0f1a0a, 0.6);
    g.fillRect(60, 60, width - 120, height - 120);

    // Border
    g.lineStyle(2, VI.COLORS.GOLD, 0.5);
    g.strokeRoundedRect(60, 60, width - 120, height - 120, 16);
  }

  _drawDuckyCorner(x, y) {
    // Placeholder until real asset is available
    this.add.text(x, y, '🦆', { fontSize: '48px' }).setOrigin(0.5);
  }

  _buildPlaceholderContent() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.text(cx, height / 2 - 40, '🎰  Your game goes here', {
      fontFamily: VI.FONTS.HEADING,
      fontSize:   '28px',
      color:      VI.HEX.GOLD,
    }).setOrigin(0.5);

    this.add.text(cx, height / 2 + 10, 'Edit  src/scenes/GameScene.js  to build your mechanic', {
      fontFamily: VI.FONTS.BODY,
      fontSize:   '15px',
      color:      '#ffffff66',
    }).setOrigin(0.5);

    const escLabel = this.add.text(cx, height / 2 + 60, 'ESC → Menu', {
      fontFamily: VI.FONTS.MONO,
      fontSize:   '13px',
      color:      VI.HEX.NEON_BLUE,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: escLabel,
      alpha:   0.2,
      yoyo:    true,
      repeat:  -1,
      duration: 1200,
    });
  }

  _playWinEffect() {
    // TODO: trigger Ducky win animation + particle burst + sound
    this.cameras.main.flash(300, 240, 192, 64, false);
    this.events.emit('duckyReact', 'win');
  }
}
