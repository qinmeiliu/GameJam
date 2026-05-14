// ============================================================
// MenuScene – Vegas Infinite branded main menu
// Ducky mascot + Play / How to Play / Credits
// ============================================================

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  // Phaser reuses the scene instance across restarts, so any state stashed
  // on `this` persists. init() runs on every scene.start('MenuScene') —
  // perfect spot to reset the single-launch guard so returning from Lobby
  // and pressing PLAY again actually works.
  init() {
    this._launched = false;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // ── Background (kept) ─────────────────────────────────────
    this._drawBackground();
    this._drawNeonAccents();

    // ── Game Title — QUACKDUNNIT, single hero word ────────────
    // Cyan back-glow layer, gold front letters, magenta sub-shadow.
    // Single word means we can go big without breaking the line.
    const titleY = cy - 110;

    // Soft cyan haze behind the title for the Glow-Fi feel
    const haze = this.add.graphics();
    haze.fillStyle(VI.COLORS.CYAN, 0.05);
    haze.fillEllipse(cx, titleY + 6, 880, 200);
    haze.fillStyle(VI.COLORS.MAGENTA, 0.04);
    haze.fillEllipse(cx, titleY + 18, 720, 140);

    const title = this.add.text(cx, titleY, 'QUACKDUNNIT', {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '110px',
      color: VI.HEX.GOLD,
      stroke: '#000000',
      strokeThickness: 8,
      shadow: { blur: 28, color: VI.HEX.GOLD, fill: true },
      letterSpacing: 12,
    }).setOrigin(0.5);

    // Gentle title bob — alive, but subtle
    this.tweens.add({
      targets: title, y: titleY - 4,
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Primary action: PLAY (dominant, centered) ──────────────
    this._addPrimaryButton(cx, cy + 50, '▶  PLAY', () => this._startGame());

    // ── Secondary action: HOW TO PLAY (one button only) ────────
    this._addSecondaryButton(cx, cy + 130, 'HOW TO PLAY', () => this._showHelp());

    // ── Version stamp (tiny, corner) ──────────────────────────
    this.add.text(width - 16, height - 16, 'v0.3.0 – QUACKDUNNIT', {
      fontFamily: VI.FONTS.MONO,
      fontSize: '11px',
      color: '#ffffff33',
    }).setOrigin(1, 1);

    // Keyboard shortcuts still active (no on-screen hint)
    const k = this.input.keyboard;
    k.on('keydown-SPACE', () => this._startGame());
    k.on('keydown-ENTER', () => this._startGame());
  }

  _startGame() {
    if (this._launched) return;
    this._launched = true;
    this.cameras.main.flash(200, 253, 224, 84, false);
    this.scene.start('LobbyScene', { balance: VI.GAME.DEFAULT_BALANCE });
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

  // Primary CTA — dominant, glowing magenta-to-purple with gold border
  _addPrimaryButton(x, y, label, callback) {
    const btn = this.add.graphics();
    const bw = 360, bh = 62;

    const drawNormal = () => {
      btn.clear();
      btn.fillStyle(VI.COLORS.VI_PURPLE, 1);
      btn.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 10);
      btn.lineStyle(2, VI.COLORS.GOLD, 0.8);
      btn.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 10);
    };
    const drawHover = () => {
      btn.clear();
      btn.fillStyle(VI.COLORS.MAGENTA, 1);
      btn.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 10);
      btn.lineStyle(3, VI.COLORS.GOLD, 1);
      btn.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 10);
    };
    drawNormal();

    const text = this.add.text(x, y, label, {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '26px',
      color: VI.HEX.GOLD,
      stroke: '#000', strokeThickness: 4,
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Gentle "ready to play" pulse on the border so the eye lands here first
    this.tweens.add({
      targets: btn, alpha: { from: 0.85, to: 1 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const zone = this.add.zone(x, y, bw, bh).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { drawHover();  text.setColor('#ffffff'); });
    zone.on('pointerout',   () => { drawNormal(); text.setColor(VI.HEX.GOLD); });
    zone.on('pointerdown',  () => this.cameras.main.flash(200, 253, 224, 84, false));
    zone.on('pointerup',    callback);
  }

  // Secondary actions — compact, low-contrast, easy to ignore
  _addSecondaryButton(x, y, label, callback) {
    const btn = this.add.graphics();
    const bw = 180, bh = 38;

    const drawNormal = () => {
      btn.clear();
      btn.fillStyle(VI.COLORS.PANEL_SURFACE, 0.9);
      btn.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 6);
      btn.lineStyle(1, VI.COLORS.CYAN, 0.4);
      btn.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 6);
    };
    const drawHover = () => {
      btn.clear();
      btn.fillStyle(VI.COLORS.PANEL_SURFACE, 1);
      btn.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 6);
      btn.lineStyle(2, VI.COLORS.CYAN, 1);
      btn.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 6);
    };
    drawNormal();

    const text = this.add.text(x, y, label, {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '13px',
      color: VI.HEX.CREAM,
      letterSpacing: 3,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, bw, bh).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { drawHover();  text.setColor(VI.HEX.CYAN); });
    zone.on('pointerout',   () => { drawNormal(); text.setColor(VI.HEX.CREAM); });
    zone.on('pointerup',    callback);
  }

  _showHelp() {
    if (this._modalOpen) return;
    this._modalOpen = true;
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.78);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);

    const pw = 640, ph = 460;
    const panel = this.add.graphics().setDepth(101);
    panel.fillStyle(VI.COLORS.PANEL_SURFACE, 1);
    panel.fillRoundedRect(cx - pw/2, cy - ph/2, pw, ph, 14);
    panel.lineStyle(2, VI.COLORS.CYAN, 0.9);
    panel.strokeRoundedRect(cx - pw/2, cy - ph/2, pw, ph, 14);

    const title = this.add.text(cx, cy - ph/2 + 36, 'HOW TO PLAY', {
      fontFamily: VI.FONTS.HEADING, fontSize: '28px',
      color: VI.HEX.GOLD, letterSpacing: 6,
      shadow: { blur: 12, color: VI.HEX.GOLD, fill: true },
    }).setOrigin(0.5).setDepth(102);

    const body = [
      '1.  PICK YOUR ROOM.  Choose 3–6 suspects. More suspects = bigger payout, worse odds.',
      '',
      '2.  PLACE YOUR BET.  Stack chips, lock in a suspect. Bet early (folder > 60%)',
      '     for the +15% EARLY BIRD bonus.',
      '',
      '3.  PLAY ACTION CARDS.  As the folder burns, use blackjack-style moves:',
      '     DOUBLE DOWN, INSURANCE, CASH OUT, CHAOS ROLL, LOCK IN, SIDE SWAP, PRESS, SPLIT.',
      '',
      '4.  ACCUSE.  Wrong on Acc #1 → SECOND CHANCE: 15 seconds, folder burns 3× faster,',
      '     payouts capped at 40%. Wrong twice = COLD CASE.',
      '',
      '5.  THE TWIST.  The killer is pure RNG. Clues are nonsense. Trust scores are theatre.',
      '     You are a gambler dressed as a detective.',
    ].join('\n');

    const text = this.add.text(cx, cy + 4, body, {
      fontFamily: VI.FONTS.BODY, fontSize: '14px',
      color: VI.HEX.CREAM, lineSpacing: 4,
      align: 'left', wordWrap: { width: pw - 60 },
    }).setOrigin(0.5).setDepth(102);

    // Close button (X) top-right of panel
    const closeX = cx + pw/2 - 26, closeY = cy - ph/2 + 26;
    const closeG = this.add.graphics().setDepth(102);
    const drawClose = (hover) => {
      closeG.clear();
      closeG.lineStyle(2, hover ? VI.COLORS.MAGENTA : VI.COLORS.CREAM, hover ? 1 : 0.5);
      closeG.lineBetween(closeX - 8, closeY - 8, closeX + 8, closeY + 8);
      closeG.lineBetween(closeX - 8, closeY + 8, closeX + 8, closeY - 8);
    };
    drawClose(false);
    const closeZone = this.add.zone(closeX, closeY, 28, 28).setInteractive({ cursor: 'pointer' }).setDepth(103);
    closeZone.on('pointerover', () => drawClose(true));
    closeZone.on('pointerout',  () => drawClose(false));

    // GOT IT button at bottom of panel
    const gw = 160, gh = 38;
    const gx = cx, gy = cy + ph/2 - 38;
    const gotitG = this.add.graphics().setDepth(102);
    const drawGotIt = (hover) => {
      gotitG.clear();
      gotitG.fillStyle(hover ? VI.COLORS.MAGENTA : VI.COLORS.VI_PURPLE, 1);
      gotitG.fillRoundedRect(gx - gw/2, gy - gh/2, gw, gh, 8);
      gotitG.lineStyle(1, VI.COLORS.GOLD, hover ? 1 : 0.7);
      gotitG.strokeRoundedRect(gx - gw/2, gy - gh/2, gw, gh, 8);
    };
    drawGotIt(false);
    const gotitLbl = this.add.text(gx, gy, 'GOT IT  ✓', {
      fontFamily: VI.FONTS.HEADING, fontSize: '14px',
      color: VI.HEX.GOLD, letterSpacing: 4,
    }).setOrigin(0.5).setDepth(103);
    const gotitZone = this.add.zone(gx, gy, gw, gh).setInteractive({ cursor: 'pointer' }).setDepth(103);
    gotitZone.on('pointerover', () => { drawGotIt(true);  gotitLbl.setColor('#ffffff'); });
    gotitZone.on('pointerout',  () => { drawGotIt(false); gotitLbl.setColor(VI.HEX.GOLD); });

    const closeModal = () => {
      [overlay, panel, title, text, closeG, closeZone, gotitG, gotitLbl, gotitZone].forEach(o => o && o.destroy());
      this._modalOpen = false;
    };
    closeZone.on('pointerup', closeModal);
    gotitZone.on('pointerup', closeModal);
  }

  _showCredits() {
    console.log('Credits – TODO');
  }
}
