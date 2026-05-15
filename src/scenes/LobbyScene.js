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
    this._launching    = false;                              // double-click guard for table tap

    // Pick 6 random characters from the full 8-character roster.
    // Each seat keeps its character for the whole scene visit; re-entering
    // the Lobby re-shuffles. The 2 characters left out will sit this round out.
    const pool = [...MURDER_DATA.victims];
    this._shuffleArr(pool);
    this._seatChars = pool.slice(0, this._maxSeats);
  }

  _shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  create() {
    const { width, height } = this.scale;

    this._drawBackground();
    this._buildTopBar();
    this._buildRoundTable();
    this._buildSeats();
    this._buildCenterPlate();
    this._buildTableActionHint();

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

    // Cyan rim (Glow-Fi base layer)
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

    // ── Pulsing GOLD "call to action" ring just outside the table ──
    //    Always visible, gently breathing so the eye lands on the table.
    this._tablePulseG = this.add.graphics();
    const drawPulseRing = (alpha, ringR) => {
      this._tablePulseG.clear();
      this._tablePulseG.lineStyle(3, VI.COLORS.GOLD, alpha);
      this._tablePulseG.strokeCircle(tx, ty, ringR);
      this._tablePulseG.lineStyle(14, VI.COLORS.GOLD, alpha * 0.18);
      this._tablePulseG.strokeCircle(tx, ty, ringR);
    };
    drawPulseRing(0.65, r + 6);
    // Tween a pseudo-property and redraw each step
    this._tablePulseT = { alpha: 0.4, ringR: r + 4 };
    this.tweens.add({
      targets: this._tablePulseT,
      alpha:   { from: 0.35, to: 0.95 },
      ringR:   { from: r + 4, to: r + 12 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: () => drawPulseRing(this._tablePulseT.alpha, this._tablePulseT.ringR),
    });
    // Stash the redraw fn so hover/click can override
    this._tableDrawPulse = drawPulseRing;

    // ── Interactive zone — the entire felt becomes the click target ──
    const tableZone = this.add.zone(tx, ty, r * 2, r * 2).setInteractive(
      new Phaser.Geom.Circle(r, r, r),
      Phaser.Geom.Circle.Contains,
      { cursor: 'pointer' }
    );

    tableZone.on('pointerover', () => this._onTableHover(true));
    tableZone.on('pointerout',  () => this._onTableHover(false));
    tableZone.on('pointerup',   () => this._startInvestigation());
  }

  // ── Table hover state — brighten the rim + the CTA hint ─────

  _onTableHover(hovering) {
    this._tableHovering = hovering;
    if (this._tableHintLabel) {
      this._tableHintLabel.setColor(hovering ? '#ffffff' : VI.HEX.GOLD);
      this._tableHintLabel.setScale(hovering ? 1.08 : 1);
    }
  }

  // ── Click → fly to GameScene ────────────────────────────────

  _startInvestigation() {
    if (this._launching) return;
    this._launching = true;

    // Localized gold-ring burst on the table — no full-screen camera flash
    // (the screen-wide gold flash on every transition was distracting).
    const tx = this._tableCenterX();
    const ty = this._tableCenterY();
    const burst = this.add.graphics();
    burst.fillStyle(VI.COLORS.GOLD, 0.45);
    burst.fillCircle(tx, ty, this._tableRadius());
    this.tweens.add({
      targets: burst,
      alpha: { from: 0.45, to: 0 },
      scale: { from: 1, to: 1.4 },
      duration: 360, ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy(),
    });

    this.time.delayedCall(260, () => {
      // Defensive: stop any leftover GameScene/UIScene (e.g. after the
      // player hit ← LOBBY from a running round) before relaunching them.
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
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
    const char  = this._seatChars[idx];          // { id, name, trait, color } from MURDER_DATA.victims
    const color = char.color;
    const name  = char.name.toUpperCase();

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
      // Localized seat pulse instead of a full-screen camera flash.
      // Tweening the silhouette layer keeps the feedback right at the click.
      this.tweens.add({
        targets: this._seats[idx].silG,
        alpha: { from: 0.2, to: 1 },
        duration: 220, ease: 'Cubic.easeOut',
      });
    });

    return { idx, cx, cy, hexR, color, name, char, hex, silG, plus, label, sublabel, zone };
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

      // Character-specific silhouette per GDD spec (butler bowtie, chef hat, etc.)
      this._drawSilhouette(s.silG, s.cx, s.cy, s.char);

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

  _drawSilhouette(g, cx, cy, char) {
    // GDD-spec geometric silhouettes — one variant per character id.
    // Each silhouette stays inside an imaginary 36×40 bounding box centered
    // on (cx, cy) so they all fit cleanly inside the seat hex.
    const c = char.color;
    g.fillStyle(c, 0.9);

    switch (char.id) {
      case 'butler': {
        // Tall rectangle body, small circle head, bowtie triangle
        g.fillCircle(cx, cy - 13, 6);
        g.fillRect(cx - 8, cy - 5, 16, 22);
        // Bowtie
        g.fillTriangle(cx - 8, cy - 4, cx, cy + 1, cx - 8, cy + 4);
        g.fillTriangle(cx + 8, cy - 4, cx, cy + 1, cx + 8, cy + 4);
        break;
      }
      case 'chef': {
        // Stocky rectangle, tall chef hat cylinder above
        g.fillEllipse(cx, cy - 22, 14, 8);            // hat top
        g.fillRect(cx - 6, cy - 22, 12, 10);          // hat band
        g.fillCircle(cx, cy - 10, 7);
        g.fillRect(cx - 12, cy - 3, 24, 20);          // stocky body
        break;
      }
      case 'mayor': {
        // Wide rectangle, top hat, tiny circle head
        g.fillRect(cx - 9, cy - 24, 18, 4);           // hat brim
        g.fillRect(cx - 6, cy - 32, 12, 10);          // hat crown
        g.fillCircle(cx, cy - 14, 5);                 // tiny head
        g.fillRect(cx - 13, cy - 7, 26, 22);          // wide body
        break;
      }
      case 'janitor': {
        // Medium rectangle, mop handle diagonal line
        g.fillCircle(cx, cy - 12, 6);
        g.fillRect(cx - 8, cy - 5, 16, 22);
        // Mop handle (diagonal)
        g.lineStyle(2, c, 1);
        g.lineBetween(cx + 4, cy - 4, cx + 18, cy - 22);
        g.fillStyle(c, 0.7);
        g.fillCircle(cx + 18, cy - 22, 4);            // mop head
        g.fillStyle(c, 0.9);
        break;
      }
      case 'count': {
        // Cape triangle sweeping behind rectangle body
        g.fillTriangle(cx - 18, cy + 18, cx + 18, cy + 18, cx, cy - 10);    // cape
        g.fillStyle(0x000000, 0.35);
        g.fillCircle(cx, cy - 13, 7);                 // shadow
        g.fillStyle(c, 0.95);
        g.fillCircle(cx, cy - 13, 6);                 // head
        g.fillRect(cx - 7, cy - 5, 14, 22);           // body
        break;
      }
      case 'mime': {
        // Slim rectangle, beret circle, vertical stripe accents
        g.fillCircle(cx - 2, cy - 18, 7);             // beret (offset)
        g.fillCircle(cx, cy - 12, 6);                 // head
        g.fillRect(cx - 5, cy - 5, 10, 22);           // slim body
        // Stripes
        g.fillStyle(0x000000, 0.4);
        g.fillRect(cx - 5, cy + 2,  10, 2);
        g.fillRect(cx - 5, cy + 8,  10, 2);
        g.fillStyle(c, 0.9);
        break;
      }
      case 'duchess': {
        // Hourglass silhouette, tall hair up, fan shape hand
        g.fillTriangle(cx - 4, cy - 22, cx + 4, cy - 22, cx, cy - 30);   // tall hair point
        g.fillRect(cx - 5, cy - 22, 10, 6);                              // hair base
        g.fillCircle(cx, cy - 14, 6);                                    // head
        // Hourglass body (triangle down + triangle up)
        g.fillTriangle(cx - 10, cy - 5, cx + 10, cy - 5, cx, cy + 5);
        g.fillTriangle(cx - 11, cy + 18, cx + 11, cy + 18, cx, cy + 5);
        // Fan hand
        g.fillTriangle(cx + 11, cy + 2, cx + 18, cy - 2, cx + 16, cy + 6);
        break;
      }
      case 'librarian': {
        // Rectangle with stack of small rectangles (books) balanced on arm
        g.fillCircle(cx, cy - 13, 6);
        g.fillRect(cx - 8, cy - 5, 16, 22);
        // Book stack on right arm
        g.fillRect(cx + 8, cy - 4, 10, 4);
        g.fillRect(cx + 8, cy + 1, 10, 4);
        g.fillRect(cx + 8, cy + 6, 10, 4);
        // Glasses hint
        g.fillStyle(0x000000, 0.5);
        g.fillCircle(cx - 2, cy - 13, 2);
        g.fillCircle(cx + 2, cy - 13, 2);
        g.fillStyle(c, 0.9);
        break;
      }
      default: {
        // Fallback (shouldn't happen if MURDER_DATA stays in sync)
        g.fillCircle(cx, cy - 12, 8);
        g.fillRect(cx - 10, cy - 4, 20, 22);
      }
    }
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
    // v0.5: non-linear suspect mults from VI.GAME.SUSPECT_MULTS
    const base = VI.GAME.SUSPECT_MULTS[n] || (n * 0.8);
    // Best-case max ≈ base × folder 1.5 × weapon 3.0 × early 1.15 × no-clue 1.20
    const max  = base * 1.5 * 3.0 * 1.15 * 1.20;
    this._plateRefs.guests.setText(`${n} GUESTS`);
    this._plateRefs.base.setText(`BASE  ${base.toFixed(1)}×`);
    this._plateRefs.odds.setText(`ODDS  1 IN ${n}`);
    this._plateRefs.maxP.setText(`MAX   ${max.toFixed(1)}×`);
  }

  _suspectCount() {
    return this._mandatory + this._optionalOn.filter(Boolean).length;
  }

  _refreshAll() {
    for (let i = 0; i < this._maxSeats; i++) this._drawSeat(i, false);
    this._refreshPlate();
  }

  // ── Table CTA hint ──────────────────────────────────────────
  // The whole table is now the click target. This text sits just below
  // the centre plate (still inside the table felt) and pulses gold so
  // players know what to click.

  _buildTableActionHint() {
    const tx = this._tableCenterX();
    const ty = this._tableCenterY() + 105;   // below the centre plate, inside the table

    this._tableHintLabel = this.add.text(tx, ty, '🔍  TAP TABLE TO BEGIN', {
      fontFamily: VI.FONTS.HEADING, fontSize: '15px',
      color: VI.HEX.GOLD, letterSpacing: 5,
      stroke: '#000', strokeThickness: 3,
      shadow: { blur: 10, color: VI.HEX.GOLD, fill: true },
    }).setOrigin(0.5);

    // Gentle alpha breath to draw the eye to the table
    this.tweens.add({
      targets: this._tableHintLabel,
      alpha:   { from: 0.6, to: 1 },
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
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
