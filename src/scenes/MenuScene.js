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

    // ── Cinematic backdrop: ballroom PNG dimmed under a vignette ─
    // First impression for judges. The ballroom is gold-dominant and
    // opulent — sets the casino-noir tone immediately. Falls back to the
    // vector treatment if the PNG hasn't loaded.
    this._drawCinematicBackdrop();

    // ── Suspect lineup peeking in from corners ────────────────
    // Three of the cast lurk at the edges as if eavesdropping on the case.
    // Each drifts gently with a staggered yoyo for ambient motion.
    this._drawSuspectLineup();

    // ── Game Title — QUACKDUNNIT, single hero word ────────────
    const titleY = cy - 80;

    // Layered hazes — cyan back-glow, magenta sub-shadow, purple bloom.
    const haze = this.add.graphics();
    haze.fillStyle(VI.COLORS.VI_PURPLE, 0.20);
    haze.fillEllipse(cx, titleY + 4, 980, 230);
    haze.fillStyle(VI.COLORS.CYAN, 0.09);
    haze.fillEllipse(cx, titleY + 8, 820, 180);
    haze.fillStyle(VI.COLORS.MAGENTA, 0.06);
    haze.fillEllipse(cx, titleY + 22, 680, 130);

    // Back-shadow layer — cyan offset behind the gold for chromatic depth
    const titleBack = this.add.text(cx + 4, titleY + 4, 'QUACKDUNNIT', {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '118px',
      color: VI.HEX.CYAN,
      letterSpacing: 12,
    }).setOrigin(0.5).setAlpha(0.55);

    // Front title — gold with heavy glow
    const title = this.add.text(cx, titleY, 'QUACKDUNNIT', {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '118px',
      color: VI.HEX.GOLD,
      stroke: '#000000',
      strokeThickness: 8,
      shadow: { blur: 36, color: VI.HEX.GOLD, fill: true },
      letterSpacing: 12,
    }).setOrigin(0.5);

    // Gentle bob — alive, but subtle
    this.tweens.add({
      targets: [title, titleBack], y: '-=4',
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Tagline below title
    const tagline = this.add.text(cx, titleY + 78, 'A CASINO-NOIR WHODUNNIT', {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '15px',
      color: VI.HEX.CREAM,
      letterSpacing: 10,
    }).setOrigin(0.5).setAlpha(0.85);

    // Faint cyan underline beneath the tagline
    const taglineRule = this.add.graphics();
    taglineRule.lineStyle(1, VI.COLORS.CYAN, 0.5);
    taglineRule.lineBetween(cx - 110, titleY + 96, cx + 110, titleY + 96);

    // Ambient gold sparkles around the title — small dots that twinkle
    this._spawnTitleSparkles(cx, titleY);

    // ── Primary action: PLAY (dominant, centered, breathing) ───
    this._addPrimaryButton(cx, cy + 100, '▶  PLAY', () => this._startGame());

    // ── Secondary action: HOW TO PLAY ──────────────────────────
    this._addSecondaryButton(cx, cy + 180, 'HOW TO PLAY', () => this._showHelp());

    // ── Game jam credit + version (bottom corners) ─────────────
    this.add.text(16, height - 16, 'VEGAS INFINITE GAME JAM 2026', {
      fontFamily: VI.FONTS.MONO,
      fontSize: '11px',
      color: VI.HEX.CYAN,
      letterSpacing: 3,
    }).setOrigin(0, 1).setAlpha(0.5);

    this.add.text(width - 16, height - 16, 'v0.5  ·  QUACKDUNNIT', {
      fontFamily: VI.FONTS.MONO,
      fontSize: '11px',
      color: '#ffffff44',
    }).setOrigin(1, 1);

    // Keyboard shortcuts still active (no on-screen hint)
    const k = this.input.keyboard;
    k.on('keydown-SPACE', () => this._startGame());
    k.on('keydown-ENTER', () => this._startGame());
  }

  _startGame() {
    if (this._launched) return;
    this._launched = true;
    this.scene.start('LobbyScene', { balance: VI.GAME.DEFAULT_BALANCE });
  }

  // ── Private helpers ─────────────────────────────────────────

  // Ballroom PNG dimmed under a dark vignette. If the PNG isn't loaded
  // (asset missing or first run before preload completes), falls back to
  // the original vector treatment via _drawBackground / _drawNeonAccents.
  _drawCinematicBackdrop() {
    const { width, height } = this.scale;

    // Flood-black floor first — always present so vignette has something
    // to layer over.
    const floor = this.add.graphics();
    floor.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    floor.fillRect(0, 0, width, height);

    if (this.textures.exists('bg-ballroom')) {
      const bg = this.add.image(width / 2, height / 2, 'bg-ballroom');
      bg.setDisplaySize(width, height);
      bg.setAlpha(0.42);   // dim — the title is the hero, the room is the stage
    } else {
      // Fallback: original radial gradient treatment so the menu still
      // renders cleanly if the texture didn't load for any reason.
      this._drawBackground();
    }

    // Dark vignette overlay — pulls the corners into shadow so the title
    // and CTAs in the center pop against the brighter middle.
    const vignette = this.add.graphics();
    [
      { t: 90, a: 0.55 },
      { t: 60, a: 0.40 },
      { t: 36, a: 0.24 },
      { t: 16, a: 0.10 },
    ].forEach(({ t, a }) => {
      vignette.lineStyle(t, VI.COLORS.FLOOD_BLACK, a);
      vignette.strokeRect(t / 2, t / 2, width - t, height - t);
    });

    // Gold accent corner brackets — anchors the brand and frames the scene
    this._drawNeonAccents();
  }

  // Three suspect portraits drifting at the edges of the screen — chef
  // (lower left), duchess (upper right), butler (lower right). Each is
  // hex-masked just like the GameScene and Lobby renderings so they
  // visually match the in-game cast.
  _drawSuspectLineup() {
    const { width, height } = this.scale;
    const lineup = [
      { id: 'chef',    x: 130,           y: height - 180, r: 64, drift: 8  },
      { id: 'duchess', x: width - 130,   y: 200,          r: 60, drift: 7  },
      { id: 'butler',  x: width - 150,   y: height - 200, r: 60, drift: 9  },
    ];
    lineup.forEach((s, i) => {
      const key = `suspect-${s.id}`;
      if (!this.textures.exists(key)) return;

      const img = this.add.image(s.x, s.y, key);
      img.setDisplaySize(s.r * 2.0, s.r * 2.0);
      img.setAlpha(0.78);

      // Hex mask so the rectangular black bg gets clipped to a hex shape.
      const maskShape = this.make.graphics({}, false);
      maskShape.fillStyle(0xffffff, 1);
      const maskR = s.r * 0.94;
      const maskPts = [];
      for (let a = 0; a < 6; a++) {
        const ang = (Math.PI / 3) * a - Math.PI / 6;
        maskPts.push({ x: s.x + maskR * Math.cos(ang), y: s.y + maskR * Math.sin(ang) });
      }
      maskShape.fillPoints(maskPts, true);
      img.setMask(maskShape.createGeometryMask());

      // Hex frame outline drawn after the image so the frame reads on top.
      const frame = this.add.graphics();
      frame.lineStyle(2, VI.COLORS.GOLD, 0.85);
      frame.strokePoints(maskPts, true);
      frame.lineStyle(7, VI.COLORS.GOLD, 0.14);
      frame.strokePoints(maskPts, true);

      // Slow ambient drift — both image AND mask AND frame move so they
      // stay aligned. Stagger phase per suspect so they don't bob in unison.
      const phaseOffset = i * 0.8;
      this.tweens.add({
        targets: [img, maskShape, frame],
        y: `-=${s.drift}`,
        duration: 2200 + i * 300,
        delay:    phaseOffset * 200,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    });
  }

  // Small twinkling gold dots floating around the title — ambient sparkle.
  _spawnTitleSparkles(cx, cy) {
    const N = 12;
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i) / N + Math.random() * 0.4;
      const dist  = 280 + Math.random() * 220;
      const px = cx + Math.cos(angle) * dist * 0.65;     // wider than tall
      const py = cy + Math.sin(angle) * dist * 0.30;
      const r  = 1.4 + Math.random() * 1.2;

      const dot = this.add.graphics();
      dot.fillStyle(VI.COLORS.GOLD, 1);
      dot.fillCircle(px, py, r);
      dot.fillStyle(VI.COLORS.GOLD, 0.35);
      dot.fillCircle(px, py, r * 2.3);

      // Each sparkle twinkles on its own offset cycle
      this.tweens.add({
        targets: dot,
        alpha:    { from: 0.35, to: 1 },
        duration: 800 + Math.random() * 1400,
        delay:    Math.random() * 1200,
        ease:     'Sine.easeInOut',
        yoyo:     true,
        repeat:   -1,
      });
    }
  }

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
    // Subtle scale pulse on the text so the button feels alive even when
    // the user isn't hovering — the arrow + label gently breathe in sync.
    this.tweens.add({
      targets: text, scale: { from: 1.0, to: 1.04 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const zone = this.add.zone(x, y, bw, bh).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { drawHover();  text.setColor('#ffffff'); });
    zone.on('pointerout',   () => { drawNormal(); text.setColor(VI.HEX.GOLD); });
    // (No screen flash on pointerdown — too jarring across scene transitions)
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
      '1.  CHOOSE YOUR TABLE.  3–6 suspects. More suspects → bigger payouts, lower win',
      '     frequency, and slightly better RTP. Pick your volatility.',
      '',
      '2.  PLACE YOUR BET.  Stack chips ($10 minimum), hit CONFIRM. Bet locks while',
      '     the folder is fresh for the +15% EARLY BIRD bonus. Starting purse: $10,000.',
      '',
      '3.  THE CLUE MARKET.  Two clues offered during ACCUSE. First clue costs 10% of',
      '     your bet; second costs 20%. Skip BOTH for the +20% NO-CLUE BONUS. Clues',
      '     can mislead — sometimes they hint at the killer, sometimes at someone else.',
      '',
      '4.  ACCUSE.  Wrong on Acc #1 → SECOND CHANCE: 15s, folder burns 3× faster,',
      '     no new clue purchases, payout capped at 30%. Wrong twice = COLD CASE.',
      '',
      '5.  THE TWIST.  The killer is pure RNG. Clues are theatre. You are a gambler',
      '     dressed as a detective. The smartest play is to skip the clues entirely.',
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
