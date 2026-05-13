// ============================================================
// LobbyScene – The Round Table
// Player fills empty chairs to invite more suspects to the round.
// 3 seats are mandatory (the bare minimum for a respectable murder).
// 3 more can be toggled on for fatter payouts / longer odds.
// Center of the table = live payout preview that updates on every click.
// ============================================================

class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  init(data) {
    this._balance      = (data && data.balance != null) ? data.balance : VI.GAME.DEFAULT_BALANCE;
    this._mandatory    = 3;                                  // first 3 seats always filled
    this._maxSeats     = 6;
    this._optionalOn   = [false, false, false];              // seats 4, 5, 6 — start empty
    this._seats        = [];                                 // sprite/text refs per seat
    this._plateRefs    = {};                                 // refs into center plaque

    // GDD-flavored suspect silhouette colours, rotated through seats
    this._seatColors = [
      VI.COLORS.CYAN,       // GUEST 1 (mandatory)
      VI.COLORS.MAGENTA,    // GUEST 2 (mandatory)
      VI.COLORS.VI_AMBER,   // GUEST 3 (mandatory)
      VI.COLORS.GOLD,       // GUEST 4 (optional)
      VI.COLORS.VI_PURPLE,  // GUEST 5 (optional)
      VI.COLORS.VI_BLUE,    // GUEST 6 (optional)
    ];

    // Funny names that rotate through occupied seats — purely cosmetic flavour
    this._seatNames = [
      'THE BUTLER',
      'THE CHEF',
      'THE MAYOR',
      'THE DUCHESS',
      'THE MIME',
      'COUNT RUBBERDUCK',
    ];
  }

  create() {
    const { width, height } = this.scale;

    this._drawBackground();
    this._buildTopBar();
    this._buildHeader();
    this._buildRoundTable();
    this._buildSeats();
    this._buildCenterPlate();
    this._buildDuckyAside();
    this._buildStartButton();

    this._refreshAll();
  }

  // ── Top bar (back-to-menu + balance) ────────────────────────

  _buildTopBar() {
    const { width } = this.scale;

    // Back to menu link (left)
    const back = this.add.text(28, 28, '← MENU', {
      fontFamily: VI.FONTS.BODY, fontSize: '13px',
      color: VI.HEX.CREAM, alpha: 0.5, letterSpacing: 3,
    }).setOrigin(0, 0.5).setInteractive({ cursor: 'pointer' });
    back.on('pointerover', () => back.setAlpha(1));
    back.on('pointerout',  () => back.setAlpha(0.5));
    back.on('pointerup',   () => this.scene.start('MenuScene'));

    // Balance (right)
    this.add.text(width - 28, 18, 'YOUR BALANCE', {
      fontFamily: VI.FONTS.BODY, fontSize: '10px',
      color: VI.HEX.CYAN, alpha: 0.6, letterSpacing: 4,
    }).setOrigin(1, 0);
    this.add.text(width - 28, 32, `$${this._balance.toLocaleString()}`, {
      fontFamily: VI.FONTS.MONO, fontSize: '22px', color: VI.HEX.GOLD,
    }).setOrigin(1, 0);
  }

  // ── Header copy (no big title — that lived on Menu) ─────────

  _buildHeader() {
    const { width } = this.scale;
    const cx = width / 2;

    this.add.text(cx, 56, "TONIGHT'S DINNER PARTY", {
      fontFamily: VI.FONTS.HEADING, fontSize: '24px',
      color: VI.HEX.GOLD, letterSpacing: 8,
      shadow: { blur: 14, color: VI.HEX.GOLD, fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, 86, 'PULL UP A CHAIR.  THE MORE GUESTS, THE BIGGER THE POT.', {
      fontFamily: VI.FONTS.BODY, fontSize: '12px',
      color: VI.HEX.CYAN, alpha: 0.7, letterSpacing: 4,
    }).setOrigin(0.5);
  }

  // ── The round table itself ──────────────────────────────────

  _buildRoundTable() {
    const tx = this._tableCenterX();
    const ty = this._tableCenterY();
    const r  = this._tableRadius();

    const g = this.add.graphics();

    // Outer bloom (Splash GFX feel)
    g.fillStyle(VI.COLORS.VI_PURPLE, 0.10);
    g.fillCircle(tx, ty, r + 32);
    g.fillStyle(VI.COLORS.CYAN, 0.05);
    g.fillCircle(tx, ty, r + 14);

    // Table surface — dark felt panel
    g.fillStyle(VI.COLORS.PANEL_SURFACE, 1);
    g.fillCircle(tx, ty, r);

    // Subtle inner gradient ring
    g.fillStyle(VI.COLORS.FLOOD_BLACK, 0.6);
    g.fillCircle(tx, ty, r - 18);

    // Neon rim (Glow-Fi)
    g.lineStyle(2, VI.COLORS.CYAN, 0.85);
    g.strokeCircle(tx, ty, r);
    g.lineStyle(8, VI.COLORS.CYAN, 0.12);
    g.strokeCircle(tx, ty, r);

    // Linear GFX dotted ring on the table surface — runs around the inside
    const dotG = this.add.graphics();
    dotG.fillStyle(VI.COLORS.CYAN, 0.30);
    for (let a = 0; a < 360; a += 6) {
      const rad = Phaser.Math.DegToRad(a);
      dotG.fillCircle(tx + (r - 28) * Math.cos(rad), ty + (r - 28) * Math.sin(rad), 1.6);
    }
  }

  // ── Seats (6 hexes ringed around the table) ─────────────────

  _buildSeats() {
    for (let i = 0; i < this._maxSeats; i++) {
      this._seats.push(this._buildSingleSeat(i));
    }
  }

  _seatPosition(idx) {
    // 6 seats placed every 60° starting from top (-90°)
    const angle = Phaser.Math.DegToRad(-90 + idx * 60);
    const cx = this._tableCenterX() + this._seatRingRadius() * Math.cos(angle);
    const cy = this._tableCenterY() + this._seatRingRadius() * Math.sin(angle);
    return { cx, cy };
  }

  _buildSingleSeat(idx) {
    const { cx, cy } = this._seatPosition(idx);
    const hexR  = 46;
    const color = this._seatColors[idx];
    const name  = this._seatNames[idx];

    // Hex holding device — separate graphics per state for clean refresh
    const hex      = this.add.graphics();
    const silG     = this.add.graphics();
    const plus     = this.add.text(cx, cy - 2, '+', {
      fontFamily: VI.FONTS.HEADING, fontSize: '44px',
      color: VI.HEX.CREAM, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    const label = this.add.text(cx, cy + hexR + 16, '', {
      fontFamily: VI.FONTS.HEADING, fontSize: '11px',
      color: VI.HEX.CREAM, letterSpacing: 3,
    }).setOrigin(0.5);

    const sublabel = this.add.text(cx, cy + hexR + 30, '', {
      fontFamily: VI.FONTS.MONO, fontSize: '9px',
      color: VI.HEX.CYAN, alpha: 0.6, letterSpacing: 2,
    }).setOrigin(0.5);

    // Interaction zone (only for optional seats — seats 0/1/2 are locked)
    const zone = this.add.zone(cx, cy, hexR * 2 + 12, hexR * 2 + 12).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover', () => {
      if (this._isOptional(idx)) this._drawSeat(idx, true);
    });
    zone.on('pointerout', () => {
      this._drawSeat(idx, false);
    });
    zone.on('pointerup', () => {
      if (!this._isOptional(idx)) return;
      const optIdx = idx - this._mandatory;
      this._optionalOn[optIdx] = !this._optionalOn[optIdx];
      this._refreshAll();
      this.cameras.main.flash(80, 253, 224, 84, false);
    });

    return { idx, cx, cy, hexR, color, name, hex, silG, plus, label, sublabel, zone };
  }

  _isOptional(idx) {
    return idx >= this._mandatory;
  }

  _seatIsOccupied(idx) {
    if (idx < this._mandatory) return true;
    return this._optionalOn[idx - this._mandatory];
  }

  _drawSeat(idx, hover) {
    const s = this._seats[idx];
    const occupied = this._seatIsOccupied(idx);

    s.hex.clear();
    s.silG.clear();

    // Hex polygon vertices (flat-top)
    const pts = [];
    for (let a = 0; a < 6; a++) {
      const ang = (Math.PI / 3) * a - Math.PI / 6;
      pts.push({ x: s.cx + s.hexR * Math.cos(ang), y: s.cy + s.hexR * Math.sin(ang) });
    }

    if (occupied) {
      // ── Occupied seat ──
      s.hex.fillStyle(s.color, 0.15);
      s.hex.fillPoints(pts, true);
      // Outer bloom
      s.hex.lineStyle(8, s.color, 0.18);
      s.hex.strokePoints(pts, true);
      // Sharp border
      const borderColor = idx < this._mandatory ? s.color : VI.COLORS.GOLD;
      s.hex.lineStyle(hover ? 3 : 2, borderColor, hover ? 1 : 0.85);
      s.hex.strokePoints(pts, true);

      // Suspect silhouette inside hex — simple geometric shape (rectangle body + circle head)
      this._drawSilhouette(s.silG, s.cx, s.cy, s.color, idx);

      s.plus.setAlpha(0);

      // Labels
      s.label.setText(s.name);
      s.label.setColor(VI.HEX.CREAM);
      s.label.setAlpha(1);
      if (idx < this._mandatory) {
        s.sublabel.setText('🔒  REQUIRED').setColor(VI.HEX.CYAN).setAlpha(0.55);
      } else {
        s.sublabel.setText('CLICK TO REMOVE').setColor(VI.HEX.GOLD).setAlpha(0.8);
      }
    } else {
      // ── Empty seat (clickable to fill) ──
      s.hex.fillStyle(VI.COLORS.PANEL_SURFACE, 0.6);
      s.hex.fillPoints(pts, true);
      // Dashed-feeling outline via two layers
      s.hex.lineStyle(8, VI.COLORS.CYAN, 0.08);
      s.hex.strokePoints(pts, true);
      s.hex.lineStyle(hover ? 3 : 2, VI.COLORS.CYAN, hover ? 0.95 : 0.35);
      s.hex.strokePoints(pts, true);

      s.plus.setAlpha(hover ? 1 : 0.55);
      s.plus.setColor(hover ? VI.HEX.GOLD : VI.HEX.CYAN);

      s.label.setText('EMPTY CHAIR');
      s.label.setColor(VI.HEX.CYAN);
      s.label.setAlpha(0.6);
      s.sublabel.setText('CLICK TO INVITE').setColor(VI.HEX.CREAM).setAlpha(0.5);
    }
  }

  _drawSilhouette(g, cx, cy, color, idx) {
    // Tiny geometric silhouette — rectangle body, circle head.
    // Slight per-seat variation to keep them distinct.
    const variants = [
      // 0: classic head + body
      () => { g.fillStyle(color, 0.9); g.fillCircle(cx, cy - 12, 8); g.fillRect(cx - 10, cy - 4, 20, 22); },
      // 1: top-hat figure
      () => { g.fillStyle(color, 0.9); g.fillRect(cx - 8, cy - 22, 16, 6); g.fillCircle(cx, cy - 12, 8); g.fillRect(cx - 10, cy - 4, 20, 22); },
      // 2: chef-hat figure
      () => { g.fillStyle(color, 0.9); g.fillRect(cx - 6, cy - 24, 12, 10); g.fillCircle(cx, cy - 12, 8); g.fillRect(cx - 10, cy - 4, 20, 22); },
      // 3: hourglass duchess
      () => { g.fillStyle(color, 0.9); g.fillCircle(cx, cy - 12, 7); g.fillTriangle(cx - 12, cy + 18, cx + 12, cy + 18, cx, cy - 4); },
      // 4: slim mime
      () => { g.fillStyle(color, 0.9); g.fillCircle(cx, cy - 12, 7); g.fillRect(cx - 6, cy - 4, 12, 22); },
      // 5: cape figure
      () => { g.fillStyle(color, 0.9); g.fillTriangle(cx - 16, cy + 18, cx + 16, cy + 18, cx, cy - 8); g.fillCircle(cx, cy - 12, 8); g.fillRect(cx - 8, cy - 4, 16, 22); },
    ];
    (variants[idx] || variants[0])();
  }

  // ── Center plaque — live payout preview ─────────────────────

  _buildCenterPlate() {
    const tx = this._tableCenterX();
    const ty = this._tableCenterY();

    // Circular holding device (per GDD)
    const plateG = this.add.graphics();
    const pr = 90;
    plateG.fillStyle(VI.COLORS.FLOOD_BLACK, 0.92);
    plateG.fillCircle(tx, ty, pr);
    plateG.lineStyle(2, VI.COLORS.GOLD, 0.85);
    plateG.strokeCircle(tx, ty, pr);
    plateG.lineStyle(8, VI.COLORS.GOLD, 0.12);
    plateG.strokeCircle(tx, ty, pr);

    // Header
    this.add.text(tx, ty - 64, 'THE STAKES', {
      fontFamily: VI.FONTS.HEADING, fontSize: '11px',
      color: VI.HEX.GOLD, letterSpacing: 5,
    }).setOrigin(0.5);

    // Big "N GUESTS" line
    this._plateRefs.guests = this.add.text(tx, ty - 40, '', {
      fontFamily: VI.FONTS.HEADING, fontSize: '28px',
      color: VI.HEX.CREAM, letterSpacing: 2,
    }).setOrigin(0.5);

    // Stat rows
    this._plateRefs.base = this.add.text(tx, ty - 8, '', {
      fontFamily: VI.FONTS.MONO, fontSize: '12px', color: VI.HEX.GOLD,
    }).setOrigin(0.5);

    this._plateRefs.odds = this.add.text(tx, ty + 14, '', {
      fontFamily: VI.FONTS.MONO, fontSize: '12px', color: VI.HEX.CYAN,
    }).setOrigin(0.5);

    this._plateRefs.maxP = this.add.text(tx, ty + 36, '', {
      fontFamily: VI.FONTS.MONO, fontSize: '12px', color: VI.HEX.MAGENTA,
    }).setOrigin(0.5);

    // Footnote
    this.add.text(tx, ty + 58, '* at full folder × rare weapon', {
      fontFamily: VI.FONTS.MONO, fontSize: '9px',
      color: VI.HEX.CREAM, alpha: 0.4,
    }).setOrigin(0.5);
  }

  _refreshPlate() {
    const n = this._suspectCount();
    const base = (n * 0.8).toFixed(1);
    const max  = (n * 0.8 * 1.5 * 3.0).toFixed(1);   // folder=1.5×, weapon=3.0× rare
    this._plateRefs.guests.setText(`${n} GUESTS`);
    this._plateRefs.base.setText(`BASE  ${base}×`);
    this._plateRefs.odds.setText(`ODDS  1 IN ${n}`);
    this._plateRefs.maxP.setText(`MAX   ${max}×`);
  }

  _suspectCount() {
    return this._mandatory + this._optionalOn.filter(Boolean).length;
  }

  _refreshAll() {
    for (let i = 0; i < this._maxSeats; i++) this._drawSeat(i, false);
    this._refreshPlate();
  }

  // ── Ducky aside (funny commentary, bottom-left) ─────────────

  _buildDuckyAside() {
    const x = 110, y = this.scale.height - 110;

    // Tiny Ducky head
    const g = this.add.graphics();
    g.fillStyle(VI.COLORS.GOLD, 0.95);
    g.fillEllipse(x, y, 56, 40);                  // body
    g.fillEllipse(x + 14, y - 18, 30, 26);        // head
    g.fillStyle(VI.COLORS.VI_ORANGE, 1);
    g.fillTriangle(x + 26, y - 18, x + 44, y - 12, x + 26, y - 8);  // beak
    g.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    g.fillCircle(x + 19, y - 22, 3);              // eye
    g.fillStyle(VI.COLORS.PANEL_SURFACE, 1);      // hat
    g.fillRect(x + 4, y - 36, 22, 4);
    g.fillRect(x + 9, y - 50, 14, 14);
    g.lineStyle(1.5, VI.COLORS.GOLD, 0.9);
    g.strokeRect(x + 4, y - 36, 22, 4);
    g.strokeRect(x + 9, y - 50, 14, 14);

    // Speech bubble
    const bx = x + 80, by = y - 30;
    const bw = 360, bh = 64;
    const bg = this.add.graphics();
    bg.fillStyle(VI.COLORS.PANEL_SURFACE, 0.95);
    bg.fillRoundedRect(bx, by - bh / 2, bw, bh, 10);
    bg.lineStyle(1, VI.COLORS.CYAN, 0.5);
    bg.strokeRoundedRect(bx, by - bh / 2, bw, bh, 10);
    // Tail
    bg.fillStyle(VI.COLORS.PANEL_SURFACE, 0.95);
    bg.fillTriangle(bx, by - 6, bx, by + 6, bx - 10, by + 2);

    this.add.text(bx + 12, by - bh / 2 + 8, '🦆  DUCKY SAYS:', {
      fontFamily: VI.FONTS.HEADING, fontSize: '10px',
      color: VI.HEX.CYAN, letterSpacing: 4,
    });
    this.add.text(bx + 12, by - bh / 2 + 26, '"Three\'s a murder. Six is a dinner party that went WILDLY wrong."', {
      fontFamily: VI.FONTS.BODY, fontSize: '12px',
      color: VI.HEX.CREAM, alpha: 0.85,
      fontStyle: 'italic', wordWrap: { width: bw - 24 },
    });
  }

  // ── BEGIN INVESTIGATION button ──────────────────────────────

  _buildStartButton() {
    const { width, height } = this.scale;
    const x = width / 2;
    const y = height - 56;
    const bw = 360, bh = 56;
    const btn = this.add.graphics();

    const drawNormal = () => {
      btn.clear();
      btn.fillStyle(VI.COLORS.VI_PURPLE, 1);
      btn.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 10);
      btn.lineStyle(2, VI.COLORS.GOLD, 0.85);
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

    const label = this.add.text(x, y, '🔍  BEGIN INVESTIGATION', {
      fontFamily: VI.FONTS.HEADING, fontSize: '20px', color: VI.HEX.GOLD,
      stroke: '#000', strokeThickness: 4, letterSpacing: 4,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, bw, bh).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover', () => { drawHover();  label.setColor('#ffffff'); });
    zone.on('pointerout',  () => { drawNormal(); label.setColor(VI.HEX.GOLD); });
    zone.on('pointerdown', () => this.cameras.main.flash(150, 253, 224, 84, false));
    zone.on('pointerup', () => {
      this.scene.start('GameScene', {
        balance:      this._balance,
        suspectCount: this._suspectCount(),
      });
      this.scene.launch('UIScene', {
        balance:      this._balance,
        suspectCount: this._suspectCount(),
      });
    });
  }

  // ── Background (kept from previous version) ─────────────────

  _drawBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();

    bg.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    bg.fillRect(0, 0, width, height);

    // Splash blobs (Splash GFX)
    bg.fillStyle(VI.COLORS.CYAN, 0.03);
    bg.fillEllipse(width - 120, 80, 500, 300);
    bg.fillStyle(VI.COLORS.MAGENTA, 0.025);
    bg.fillEllipse(100, height - 80, 400, 250);
    bg.fillStyle(VI.COLORS.VI_PURPLE, 0.05);
    bg.fillEllipse(width * 0.5, height * 0.55, 800, 560);

    // Dot matrix (Linear GFX)
    const dot = this.add.graphics();
    dot.fillStyle(VI.COLORS.CYAN, VI.GAME.DOT_OPACITY);
    for (let x = 0; x < width; x += VI.GAME.DOT_SPACING) {
      for (let y = 0; y < height; y += VI.GAME.DOT_SPACING) {
        dot.fillCircle(x, y, VI.GAME.DOT_RADIUS);
      }
    }
  }

  // ── Layout helpers ──────────────────────────────────────────

  _tableCenterX() { return this.scale.width / 2; }
  _tableCenterY() { return 360; }
  _tableRadius()  { return 140; }
  _seatRingRadius() { return 230; }
}
