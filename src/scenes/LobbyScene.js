// ============================================================
// LobbyScene – Pre-game setup
// Player chooses number of suspects (3–6) then enters GameScene
// Higher suspect count = lower odds = higher payout multiplier
// ============================================================

class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
    this._suspectCount = 4;   // default
  }

  init(data) {
    this._balance = (data && data.balance != null) ? data.balance : VI.GAME.DEFAULT_BALANCE;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this._drawBackground();

    // ── Title ─────────────────────────────────────────────────
    this.add.text(cx, 72, 'DUCKY DETECTIVE AGENCY', {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '42px',
      color: VI.HEX.GOLD,
      stroke: '#000000',
      strokeThickness: 5,
      shadow: { blur: 16, color: VI.HEX.GOLD, fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, 126, 'HOW MANY SUSPECTS?', {
      fontFamily: VI.FONTS.BODY,
      fontSize: '18px',
      color: VI.HEX.CYAN,
      letterSpacing: 8,
    }).setOrigin(0.5);

    // ── Suspect count selector (3–6) ──────────────────────────
    this._selectorBtns = {};
    const counts = [3, 4, 5, 6];
    const btnW = 110, btnH = 110, gap = 24;
    const totalW = counts.length * btnW + (counts.length - 1) * gap;
    const startX = cx - totalW / 2;

    counts.forEach((n, i) => {
      const bx = startX + i * (btnW + gap) + btnW / 2;
      const by = 280;
      this._selectorBtns[n] = this._makeCountBtn(bx, by, btnW, btnH, n);
    });

    this._refreshSelector();

    // ── Payout preview table ──────────────────────────────────
    this._buildPayoutTable(cx, 420);

    // ── Ducky illustration ────────────────────────────────────
    this._drawDucky(cx + 340, 300);

    // ── Balance display ───────────────────────────────────────
    this.add.text(cx, 560, `YOUR BALANCE`, {
      fontFamily: VI.FONTS.BODY,
      fontSize: '13px',
      color: VI.HEX.CREAM,
      letterSpacing: 4,
      alpha: 0.6,
    }).setOrigin(0.5);
    this.add.text(cx, 585, `$${this._balance.toLocaleString()}`, {
      fontFamily: VI.FONTS.MONO,
      fontSize: '28px',
      color: VI.HEX.GOLD,
    }).setOrigin(0.5);

    // ── START button ──────────────────────────────────────────
    this._addStartButton(cx, 655);

    // ── Back button ───────────────────────────────────────────
    const back = this.add.text(80, 36, '← MENU', {
      fontFamily: VI.FONTS.BODY,
      fontSize: '14px',
      color: VI.HEX.CREAM,
      alpha: 0.5,
    }).setOrigin(0, 0.5).setInteractive({ cursor: 'pointer' });
    back.on('pointerover',  () => back.setAlpha(1));
    back.on('pointerout',   () => back.setAlpha(0.5));
    back.on('pointerup',    () => this.scene.start('MenuScene'));
  }

  // ── Private ────────────────────────────────────────────────

  _drawBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();

    bg.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    bg.fillRect(0, 0, width, height);

    // Splash blob (Accent GFX) — top-right cyan
    bg.fillStyle(VI.COLORS.CYAN, 0.04);
    bg.fillEllipse(width - 120, 80, 500, 300);

    // Splash blob — bottom-left magenta
    bg.fillStyle(VI.COLORS.MAGENTA, 0.03);
    bg.fillEllipse(100, height - 80, 400, 250);

    // Dot matrix (Linear GFX)
    const dot = this.add.graphics();
    dot.fillStyle(VI.COLORS.CYAN, VI.GAME.DOT_OPACITY);
    for (let x = 0; x < width; x += VI.GAME.DOT_SPACING) {
      for (let y = 0; y < height; y += VI.GAME.DOT_SPACING) {
        dot.fillCircle(x, y, VI.GAME.DOT_RADIUS);
      }
    }

    // Separator line
    const sep = this.add.graphics();
    sep.lineStyle(1, VI.COLORS.GOLD, 0.3);
    sep.lineBetween(80, 160, width - 80, 160);
  }

  _makeCountBtn(x, y, w, h, n) {
    const g = this.add.graphics();
    const zone = this.add.zone(x, y, w, h).setInteractive({ cursor: 'pointer' });

    // Odds info
    const payout = (n * 0.8).toFixed(1);
    const label  = this.add.text(x, y - 18, `${n}`, {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '38px',
      color: '#ffffff',
    }).setOrigin(0.5);
    const sub = this.add.text(x, y + 22, `${payout}x BASE`, {
      fontFamily: VI.FONTS.MONO,
      fontSize: '10px',
      color: VI.HEX.CREAM,
      alpha: 0.7,
    }).setOrigin(0.5);
    const odds = this.add.text(x, y + 38, `1 in ${n}`, {
      fontFamily: VI.FONTS.MONO,
      fontSize: '10px',
      color: VI.HEX.CYAN,
      alpha: 0.7,
    }).setOrigin(0.5);

    zone.on('pointerover', () => {
      if (this._suspectCount !== n) {
        g.clear();
        g.fillStyle(VI.COLORS.PANEL_SURFACE, 1);
        g.fillRoundedRect(x - w/2, y - h/2, w, h, 10);
        g.lineStyle(2, VI.COLORS.CYAN, 0.8);
        g.strokeRoundedRect(x - w/2, y - h/2, w, h, 10);
      }
    });
    zone.on('pointerout', () => this._refreshSelector());
    zone.on('pointerup', () => {
      this._suspectCount = n;
      this._refreshSelector();
    });

    return { g, label, sub, odds, zone, x, y, w, h, n };
  }

  _refreshSelector() {
    Object.values(this._selectorBtns).forEach(({ g, label, sub, odds, x, y, w, h, n }) => {
      const selected = n === this._suspectCount;
      g.clear();
      if (selected) {
        g.fillStyle(VI.COLORS.VI_PURPLE, 1);
        g.fillRoundedRect(x - w/2, y - h/2, w, h, 10);
        g.lineStyle(2, VI.COLORS.GOLD, 1);
        g.strokeRoundedRect(x - w/2, y - h/2, w, h, 10);
        label.setColor(VI.HEX.GOLD);
        sub.setAlpha(1);
        odds.setAlpha(1);
      } else {
        g.fillStyle(VI.COLORS.PANEL_SURFACE, 0.6);
        g.fillRoundedRect(x - w/2, y - h/2, w, h, 10);
        g.lineStyle(1, VI.COLORS.CYAN, 0.25);
        g.strokeRoundedRect(x - w/2, y - h/2, w, h, 10);
        label.setColor('#ffffff88');
        sub.setAlpha(0.4);
        odds.setAlpha(0.4);
      }
    });

    // Update payout table highlight
    if (this._payoutRows) {
      this._payoutRows.forEach(({ n, cells }) => {
        const active = n === this._suspectCount;
        cells.forEach(t => t.setAlpha(active ? 1 : 0.35));
      });
    }
  }

  _buildPayoutTable(cx, y) {
    // Header
    this.add.text(cx - 260, y - 32, 'SUSPECTS', {
      fontFamily: VI.FONTS.MONO, fontSize: '11px',
      color: VI.HEX.CYAN, alpha: 0.6,
    }).setOrigin(0, 0.5);
    this.add.text(cx - 80, y - 32, 'BASE MULT', {
      fontFamily: VI.FONTS.MONO, fontSize: '11px',
      color: VI.HEX.CYAN, alpha: 0.6,
    }).setOrigin(0, 0.5);
    this.add.text(cx + 80, y - 32, 'ODDS', {
      fontFamily: VI.FONTS.MONO, fontSize: '11px',
      color: VI.HEX.CYAN, alpha: 0.6,
    }).setOrigin(0, 0.5);
    this.add.text(cx + 200, y - 32, 'MAX PAYOUT*', {
      fontFamily: VI.FONTS.MONO, fontSize: '11px',
      color: VI.HEX.CYAN, alpha: 0.6,
    }).setOrigin(0, 0.5);

    this._payoutRows = [];
    [3, 4, 5, 6].forEach((n, i) => {
      const ry = y + i * 24;
      const base = (n * 0.8).toFixed(1);
      const maxP = (n * 0.8 * 3.0).toFixed(1); // folder=3x, weapon=1x
      const cells = [
        this.add.text(cx - 240, ry, `${n} suspects`, {
          fontFamily: VI.FONTS.MONO, fontSize: '12px', color: VI.HEX.CREAM }),
        this.add.text(cx - 60, ry, `${base}×`, {
          fontFamily: VI.FONTS.MONO, fontSize: '12px', color: VI.HEX.GOLD }),
        this.add.text(cx + 90, ry, `1 in ${n}`, {
          fontFamily: VI.FONTS.MONO, fontSize: '12px', color: VI.HEX.CREAM }),
        this.add.text(cx + 210, ry, `${maxP}×`, {
          fontFamily: VI.FONTS.MONO, fontSize: '12px', color: VI.HEX.MAGENTA }),
      ];
      cells.forEach(t => t.setOrigin(0, 0.5));
      this._payoutRows.push({ n, cells });
    });

    this.add.text(cx - 260, y + 104, '* at full folder integrity + full-burn bonus', {
      fontFamily: VI.FONTS.MONO, fontSize: '10px',
      color: '#ffffff33',
    }).setOrigin(0, 0);
  }

  _drawDucky(x, y) {
    const g = this.add.graphics();

    // Body
    g.fillStyle(VI.COLORS.GOLD, 1);
    g.fillEllipse(x, y + 10, 100, 80);

    // Head
    g.fillEllipse(x + 20, y - 40, 58, 52);

    // Beak
    g.fillStyle(VI.COLORS.VI_ORANGE, 1);
    g.fillTriangle(x + 44, y - 38, x + 72, y - 28, x + 44, y - 20);

    // Eye
    g.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    g.fillCircle(x + 32, y - 46, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x + 34, y - 48, 2);

    // Detective hat
    g.fillStyle(VI.COLORS.PANEL_SURFACE, 1);
    g.fillRect(x - 4, y - 78, 56, 8);      // brim
    g.fillRect(x + 8, y - 102, 32, 28);    // crown
    g.lineStyle(2, VI.COLORS.CYAN, 0.8);
    g.strokeRect(x - 4, y - 78, 56, 8);
    g.strokeRect(x + 8, y - 102, 32, 28);

    // Magnifying glass
    g.lineStyle(3, VI.COLORS.CREAM, 0.9);
    g.strokeCircle(x + 70, y - 10, 20);
    g.lineBetween(x + 85, y + 5, x + 100, y + 22);

    // Neon glow accent on body
    g.lineStyle(2, VI.COLORS.VI_AMBER, 0.4);
    g.strokeEllipse(x, y + 10, 104, 84);

    // Wing hint
    g.fillStyle(VI.COLORS.VI_AMBER, 0.8);
    g.fillEllipse(x - 30, y + 8, 30, 18);
    g.fillEllipse(x + 30, y + 8, 30, 18);

    // Label
    this.add.text(x, y + 68, 'DETECTIVE DUCKY', {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '12px',
      color: VI.HEX.GOLD,
      alpha: 0.7,
      letterSpacing: 4,
    }).setOrigin(0.5);
  }

  _addStartButton(x, y) {
    const bw = 320, bh = 56;
    const btn = this.add.graphics();

    const drawNormal = () => {
      btn.clear();
      btn.fillStyle(VI.COLORS.VI_PURPLE, 1);
      btn.fillRoundedRect(x - bw/2, y - bh/2, bw, bh, 10);
      btn.lineStyle(2, VI.COLORS.GOLD, 0.7);
      btn.strokeRoundedRect(x - bw/2, y - bh/2, bw, bh, 10);
    };
    const drawHover = () => {
      btn.clear();
      btn.fillStyle(VI.COLORS.MAGENTA, 1);
      btn.fillRoundedRect(x - bw/2, y - bh/2, bw, bh, 10);
      btn.lineStyle(2, VI.COLORS.GOLD, 1);
      btn.strokeRoundedRect(x - bw/2, y - bh/2, bw, bh, 10);
    };

    drawNormal();
    const label = this.add.text(x, y, '🔍  BEGIN INVESTIGATION', {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, bw, bh).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { drawHover();  label.setColor(VI.HEX.GOLD); });
    zone.on('pointerout',   () => { drawNormal(); label.setColor('#ffffff'); });
    zone.on('pointerdown',  () => { this.cameras.main.flash(150, 0, 0, 0, false); });
    zone.on('pointerup', () => {
      this.scene.start('GameScene', {
        balance:      this._balance,
        suspectCount: this._suspectCount,
      });
      this.scene.launch('UIScene', {
        balance:      this._balance,
        suspectCount: this._suspectCount,
      });
    });
  }
}
