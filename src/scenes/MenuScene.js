// ============================================================
// MenuScene – Vegas Infinite branded main menu
// Ducky mascot + Play / How to Play / Credits
// ============================================================

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Background ────────────────────────────────────────────
    this._drawBackground();

    // ── Decorative neon lines ─────────────────────────────────
    this._drawNeonAccents();

    // ── Logo / Title ──────────────────────────────────────────
    // Swap text for this.add.image once the logo asset is ready:
    // this.add.image(cx, 140, 'logo').setOrigin(0.5);
    this.add.text(cx, 90, 'VEGAS INFINITE', {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '52px',
      color: VI.HEX.GOLD,
      stroke: '#000000',
      strokeThickness: 6,
      shadow: { blur: 20, color: VI.HEX.GOLD, fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, 152, 'GAME JAM', {
      fontFamily: VI.FONTS.BODY,
      fontSize: '22px',
      color: VI.HEX.CYAN,
      letterSpacing: 12,
    }).setOrigin(0.5);

    // ── Ducky placeholder ──────────────────────────────────────
    // Replace this rect with: this.add.image(cx, 370, 'ducky').setOrigin(0.5);
    this._drawDuckyPlaceholder(cx, 370);

    // ── Buttons ───────────────────────────────────────────────
    this._addButton(cx, 550, '▶  PLAY',         () => this.scene.start('LobbyScene', { balance: VI.GAME.DEFAULT_BALANCE }));
    this._addButton(cx, 618, 'HOW TO PLAY',      () => this._showHelp());
    this._addButton(cx, 686, 'CREDITS',           () => this._showCredits());

    // ── Version stamp ─────────────────────────────────────────
    this.add.text(width - 16, height - 16, 'v0.1.0 – Game Jam Build', {
      fontFamily: VI.FONTS.MONO,
      fontSize: '11px',
      color: '#ffffff33',
    }).setOrigin(1, 1);
  }

  // ── Private helpers ─────────────────────────────────────────

  _drawBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();

    // Deep base
    bg.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    bg.fillRect(0, 0, width, height);

    // Radial gradient effect (fake it with concentric ellipses fading out)
    const steps = 8;
    for (let i = steps; i > 0; i--) {
      const alpha = 0.04 * (steps - i + 1);
      const size  = (i / steps);
      bg.fillStyle(VI.COLORS.VI_PURPLE, alpha);
      bg.fillEllipse(width / 2, height / 2, width * size, height * size);
    }

    // Dot matrix (Linear GFX — Brand Bible toolkit)
    const dot = this.add.graphics();
    dot.fillStyle(VI.COLORS.CYAN, VI.GAME.DOT_OPACITY);
    for (let x = 0; x < width; x += VI.GAME.DOT_SPACING) {
      for (let y = 0; y < height; y += VI.GAME.DOT_SPACING) {
        dot.fillCircle(x, y, VI.GAME.DOT_RADIUS);
      }
    }
  }

  _drawNeonAccents() {
    const { width, height } = this.scale;
    const g = this.add.graphics();

    // Top horizontal bar
    g.lineStyle(2, VI.COLORS.GOLD, 0.6);
    g.lineBetween(80, 200, width - 80, 200);

    // Bottom horizontal bar
    g.lineBetween(80, height - 60, width - 80, height - 60);

    // Decorative corner brackets
    const bw = 40, bh = 40, m = 30;
    [
      [m, m], [width - m, m], [m, height - m], [width - m, height - m],
    ].forEach(([x, y]) => {
      const sx = x === m ? 1 : -1;
      const sy = y === m ? 1 : -1;
      g.lineStyle(2, VI.COLORS.GOLD, 0.8);
      g.strokeRect(x, y, sx * bw, sy * bh);
    });
  }

  _drawDuckyPlaceholder(x, y) {
    // Temporary placeholder until ducky asset is dropped in
    const g = this.add.graphics();
    g.lineStyle(2, VI.COLORS.GOLD, 0.5);
    g.strokeRoundedRect(x - 80, y - 90, 160, 160, 12);

    this.add.text(x, y - 10, '🦆', { fontSize: '72px' }).setOrigin(0.5);
    this.add.text(x, y + 60, 'Ducky', {
      fontFamily: VI.FONTS.BODY,
      fontSize: '13px',
      color: '#ffffff44',
    }).setOrigin(0.5);
  }

  _addButton(x, y, label, callback) {
    const btn = this.add.graphics();
    const bw = 280, bh = 48;

    const drawNormal = () => {
      btn.clear();
      btn.fillStyle(VI.COLORS.PANEL_SURFACE, 0.9);
      btn.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
      btn.lineStyle(1, VI.COLORS.GOLD, 0.6);
      btn.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    };

    const drawHover = () => {
      btn.clear();
      btn.fillStyle(VI.COLORS.VI_PURPLE, 1);
      btn.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
      btn.lineStyle(2, VI.COLORS.GOLD, 1);
      btn.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    };

    drawNormal();

    const text = this.add.text(x, y, label, {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, bw, bh).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { drawHover(); text.setColor(VI.HEX.GOLD); });
    zone.on('pointerout',   () => { drawNormal(); text.setColor('#ffffff'); });
    zone.on('pointerdown',  () => { this.cameras.main.flash(200, 0, 0, 0, false); });
    zone.on('pointerup',    callback);
  }

  _showHelp() {
    // TODO: push a modal overlay scene or display rules text
    console.log('How to Play – TODO');
  }

  _showCredits() {
    console.log('Credits – TODO');
  }
}
