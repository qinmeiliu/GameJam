// ============================================================
// UIScene – Persistent HUD overlay (runs on top of GameScene)
// Chip tray, bet display, action cards, accuse button, toasts
// Communication: GameScene ↔ UIScene via this.gs.events
// ============================================================

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  init(data) {
    this._balance      = (data && data.balance      != null) ? data.balance      : VI.GAME.DEFAULT_BALANCE;
    this._suspectCount = (data && data.suspectCount != null) ? data.suspectCount : 4;
    this._currentBet   = 0;
    this._accumulatedBet = 0;
    this._gs           = null;  // set in create() after GameScene is running
    this._actionCooldown = false;
  }

  create() {
    const { width, height } = this.scale;

    // Get a reference to the running GameScene
    this._gs = this.scene.get('GameScene');

    // Bottom panel background
    this._buildBottomPanel(height);

    // Chip tray
    this._buildChipTray(width, height);

    // Bet display
    this._buildBetDisplay(width, height);

    // Action card strip — REMOVED for this milestone (will be redesigned)
    // this._buildActionStrip(width, height);

    // ACCUSE button (hidden until ACCUSE phase begins)
    this._buildAccuseButton(width, height);
    this._setAccuseVisible(false);

    // The bet UI is also gated by phase — start hidden so it only appears
    // once GameScene emits the BETTING phase change. (No flash of bet UI
    // during the INTRO cinematic.)
    this._setBetBuilderVisible(false);

    // Toast layer (top of z-order)
    this._toastY = 130;

    // ── Listen for GameScene events ────────────────────────
    const gs = this._gs;
    gs.events.on('game:round_start',      (d)  => this._onRoundStart(d));
    gs.events.on('game:folder_update',    (p)  => this._onFolderUpdate(p));
    gs.events.on('game:suspect_selected', (d)  => this._onSuspectSelected(d));
    gs.events.on('game:clue_revealed',    (d)  => this._showToast(`🔍 CLUE!`, VI.HEX.CYAN, 1200));
    gs.events.on('game:second_chance',    ()   => this._showToast('🎲 SECOND CHANCE!', VI.HEX.VI_ORANGE, 2000));
    gs.events.on('game:win',              (d)  => this._onWin(d));
    gs.events.on('game:loss',             (d)  => this._onLoss(d));
    gs.events.on('game:error',            (msg)=> this._showToast(`⚠ ${msg}`, VI.HEX.MAGENTA, 1800));
    gs.events.on('game:timeout',          ()   => this._showToast('⏰ ACCUSE NOW!', VI.HEX.VI_RED, 2500));
    gs.events.on('game:bet_updated',      (a)  => this._refreshBetDisplay(a));
    gs.events.on('game:next_round',       (b)  => this._onNextRound(b));
    gs.events.on('game:action_used',      (id) => this._disableActionCard(id));
    gs.events.on('game:phase_change',     (d)  => this._onPhaseChange(d));

    this.events.once('shutdown', () => {
      gs.events.off('game:round_start');
      gs.events.off('game:folder_update');
      gs.events.off('game:suspect_selected');
      gs.events.off('game:clue_revealed');
      gs.events.off('game:second_chance');
      gs.events.off('game:win');
      gs.events.off('game:loss');
      gs.events.off('game:error');
      gs.events.off('game:timeout');
      gs.events.off('game:bet_updated');
      gs.events.off('game:next_round');
      gs.events.off('game:action_used');
      gs.events.off('game:phase_change');
    });
  }

  // ── Phase-driven visibility ─────────────────────────────────
  // BETTING:        chip tray + bet display + confirm-bet visible. ACCUSE hidden.
  // ACCUSE / SC:    ACCUSE button visible. Chip tray locked.
  // ACCUSATION_*:   everything dimmed (round resolving).
  // SCOREBOARD:     everything hidden until next round.

  _onPhaseChange({ phase }) {
    const P = VI.PHASES;
    const inBetting = phase === P.BETTING;
    const inAccuse  = phase === P.ACCUSE || phase === P.SECOND_CHANCE;

    this._setBetBuilderVisible(inBetting);
    this._setAccuseVisible(inAccuse);
  }

  // Visibility toggles are JUST that — visibility. Don't touch input state
  // here: input was wired up at scene construction (zones already have
  // handlers + hit areas, labels/graphics do NOT) and the handlers
  // themselves phase-gate so off-phase clicks no-op anyway. If we
  // setInteractive on Text labels, Phaser creates a hit area on the
  // text bounds that steals clicks from the chip/confirm zones below.

  _setAccuseVisible(visible) {
    if (!this._accuseRefs) return;
    this._accuseRefs.forEach(o => {
      if (o && typeof o.setVisible === 'function') o.setVisible(visible);
    });
  }

  _setBetBuilderVisible(visible) {
    if (!this._betBuilderRefs) return;
    this._betBuilderRefs.forEach(o => {
      if (o && typeof o.setVisible === 'function') o.setVisible(visible);
    });
  }

  // ── Panel & layout ─────────────────────────────────────────

  _buildBottomPanel(height) {
    const { width } = this.scale;
    const panelH = 90;
    const g = this.add.graphics();
    g.fillStyle(VI.COLORS.PANEL_SURFACE, 0.95);
    g.fillRect(0, height - panelH, width, panelH);
    g.lineStyle(1, VI.COLORS.CYAN, 0.2);
    g.lineBetween(0, height - panelH, width, height - panelH);
  }

  // ── Chip tray ──────────────────────────────────────────────

  _buildChipTray(width, height) {
    const chips    = VI.GAME.CHIP_DENOMINATIONS;
    const spacing  = 66;
    const panelH   = 90;
    const cy       = height - panelH / 2;
    const startX   = 60;

    // Tray bg
    const tw = chips.length * spacing + 20;
    const tg = this.add.graphics();
    tg.fillStyle(VI.COLORS.FLOOD_BLACK, 0.6);
    tg.fillRoundedRect(startX - 24, cy - 26, tw, 52, 26);
    tg.lineStyle(1, VI.COLORS.CYAN, 0.2);
    tg.strokeRoundedRect(startX - 24, cy - 26, tw, 52, 26);

    if (!this._betBuilderRefs) this._betBuilderRefs = [];
    this._betBuilderRefs.push(tg);

    this._chipObjs = {};
    chips.forEach((value, i) => {
      const x = startX + i * spacing;
      const chip = this._drawChip(x, cy, value);
      this._chipObjs[value] = chip;
      this._betBuilderRefs.push(chip.g, chip.txt, chip.zone);
    });
  }

  _drawChip(x, y, value) {
    const CHIP_COLORS = { 1: 0xffffff, 5: 0xff4444, 25: 0x44cc44, 100: VI.COLORS.CYAN, 500: VI.COLORS.GOLD };
    const color = CHIP_COLORS[value] != null ? CHIP_COLORS[value] : VI.COLORS.VI_PURPLE;
    const r     = 22;

    const g = this.add.graphics();
    g.fillStyle(color, 0.22);
    g.fillCircle(x, y, r);
    g.lineStyle(3, color, 1);
    g.strokeCircle(x, y, r);
    // Dashes
    g.lineStyle(2, color, 0.55);
    for (let a = 0; a < 8; a++) {
      const rad = Phaser.Math.DegToRad(a * 45);
      g.lineBetween(x + Math.cos(rad) * 16, y + Math.sin(rad) * 16, x + Math.cos(rad) * r, y + Math.sin(rad) * r);
    }

    const label = value >= 100 ? `${value / 100}C` : `${value}`;
    const txt = this.add.text(x, y, label, {
      fontFamily: VI.FONTS.HEADING, fontSize: '11px', color: '#ffffff',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, r * 2 + 8, r * 2 + 8).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { g.setScale(1.14); txt.setScale(1.14); });
    zone.on('pointerout',   () => { g.setScale(1);    txt.setScale(1); });
    zone.on('pointerup',    () => {
      const gs = this._gs;
      if (!gs) return;
      // Chips only respond in BETTING — after confirm, bet is locked.
      if (gs.gs.phase !== VI.PHASES.BETTING) return;
      this._accumulatedBet += value;
      this._refreshBetDisplay(this._accumulatedBet);
    });

    return { g, txt, zone };
  }

  // ── Bet display ────────────────────────────────────────────

  _buildBetDisplay(width, height) {
    const panelH = 90;
    const by = height - panelH / 2;
    const bx = width * 0.42;

    const lbl = this.add.text(bx, by - 16, 'CURRENT BET', {
      fontFamily: VI.FONTS.BODY, fontSize: '10px',
      color: VI.HEX.CYAN, letterSpacing: 4,
    }).setOrigin(0.5);

    this._betText = this.add.text(bx, by + 6, '$0', {
      fontFamily: VI.FONTS.MONO, fontSize: '24px', color: VI.HEX.GOLD,
    }).setOrigin(0.5);

    // Clear bet button
    const clrZone = this.add.zone(bx, by + 30, 70, 18).setInteractive({ cursor: 'pointer' });
    const clrTxt  = this.add.text(bx, by + 30, 'CLEAR', {
      fontFamily: VI.FONTS.MONO, fontSize: '10px', color: '#ffffff33',
    }).setOrigin(0.5);
    clrZone.on('pointerover', () => clrTxt.setColor(VI.HEX.MAGENTA));
    clrZone.on('pointerout',  () => clrTxt.setColor('#ffffff33'));
    clrZone.on('pointerup', () => {
      this._accumulatedBet = 0;
      this._refreshBetDisplay(0);
    });

    // Confirm bet button
    const cfW = 110, cfH = 30;
    const cfX = bx + 90, cfY = by;
    const cfG = this.add.graphics();
    cfG.fillStyle(VI.COLORS.VI_BLUE, 0.9);
    cfG.fillRoundedRect(cfX - cfW/2, cfY - cfH/2, cfW, cfH, 6);
    cfG.lineStyle(1, VI.COLORS.CYAN, 0.6);
    cfG.strokeRoundedRect(cfX - cfW/2, cfY - cfH/2, cfW, cfH, 6);

    const cfLbl = this.add.text(cfX, cfY, 'CONFIRM BET', {
      fontFamily: VI.FONTS.HEADING, fontSize: '11px', color: '#fff',
    }).setOrigin(0.5);

    const cfZone = this.add.zone(cfX, cfY, cfW, cfH).setInteractive({ cursor: 'pointer' });
    cfZone.on('pointerover', () => { cfG.clear(); cfG.fillStyle(VI.COLORS.CYAN, 1); cfG.fillRoundedRect(cfX - cfW/2, cfY - cfH/2, cfW, cfH, 6); cfLbl.setColor(VI.HEX.FLOOD_BLACK); });
    cfZone.on('pointerout',  () => { cfG.clear(); cfG.fillStyle(VI.COLORS.VI_BLUE, 0.9); cfG.fillRoundedRect(cfX - cfW/2, cfY - cfH/2, cfW, cfH, 6); cfG.lineStyle(1, VI.COLORS.CYAN, 0.6); cfG.strokeRoundedRect(cfX - cfW/2, cfY - cfH/2, cfW, cfH, 6); cfLbl.setColor('#fff'); });
    cfZone.on('pointerup', () => {
      if (this._accumulatedBet <= 0) { this._showToast('Place a bet first!', VI.HEX.MAGENTA, 1200); return; }
      const gs = this._gs;
      if (!gs) return;
      // CONFIRM BET is only valid during BETTING (transitions us to ACCUSE)
      if (gs.gs.phase !== VI.PHASES.BETTING) return;
      if (this._accumulatedBet > gs.gs.balance) {
        this._showToast('Not enough balance!', VI.HEX.MAGENTA, 1200); return;
      }
      this._currentBet = this._accumulatedBet;
      gs.events.emit('ui:bet_confirmed', this._currentBet);
      this._showToast(`Bet confirmed: $${this._currentBet}`, VI.HEX.VI_AMBER, 900);
    });

    // Track every bet-builder element so we can show/hide as a group
    if (!this._betBuilderRefs) this._betBuilderRefs = [];
    this._betBuilderRefs.push(lbl, this._betText, clrTxt, clrZone, cfG, cfLbl, cfZone);
  }

  _refreshBetDisplay(amt) {
    this._accumulatedBet = amt;
    if (this._betText) this._betText.setText(`$${amt.toLocaleString()}`);
  }

  // ── Action card strip ──────────────────────────────────────

  _buildActionStrip(width, height) {
    // Pull GDD-canonical 8 action set from murders.js (single source of truth)
    const cards = (MURDER_DATA && MURDER_DATA.actions) ? MURDER_DATA.actions : [];

    const cw = 58, ch = 64;
    const gap = 4;
    const totalW = cards.length * (cw + gap) - gap;
    const startX = (width - totalW) / 2;
    const y      = height - 90 - ch / 2 - 8;

    this._actionCards = {};
    cards.forEach((card, i) => {
      const cx = startX + i * (cw + gap) + cw / 2;
      this._actionCards[card.id] = this._drawActionCard(cx, y, cw, ch, card);
    });
  }

  _drawActionCard(x, y, w, h, card) {
    const g = this.add.graphics();
    const _draw = (hover, used) => {
      g.clear();
      if (used) {
        g.fillStyle(VI.COLORS.PANEL_SURFACE, 0.4);
        g.fillRoundedRect(x - w/2, y - h/2, w, h, 6);
        g.lineStyle(1, card.color, 0.2);
        g.strokeRoundedRect(x - w/2, y - h/2, w, h, 6);
      } else if (hover) {
        g.fillStyle(card.color, 0.25);
        g.fillRoundedRect(x - w/2, y - h/2, w, h, 6);
        g.lineStyle(2, card.color, 1);
        g.strokeRoundedRect(x - w/2, y - h/2, w, h, 6);
      } else {
        g.fillStyle(card.color, 0.1);
        g.fillRoundedRect(x - w/2, y - h/2, w, h, 6);
        g.lineStyle(1, card.color, 0.5);
        g.strokeRoundedRect(x - w/2, y - h/2, w, h, 6);
      }
    };
    _draw(false, false);

    const txt = this.add.text(x, y, card.label, {
      fontFamily: VI.FONTS.HEADING, fontSize: '9px',
      color: Phaser.Display.Color.IntegerToColor(card.color).rgba,
      align: 'center', lineSpacing: 2,
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ cursor: 'pointer' });
    let used = false;
    zone.on('pointerover',  () => { if (!used) _draw(true,  false); });
    zone.on('pointerout',   () => { if (!used) _draw(false, false); });
    zone.on('pointerup', () => {
      if (used || this._actionCooldown) return;
      const gs = this._gs;
      if (!gs || gs.gs.state !== 'playing') return;
      gs.events.emit('ui:action_card', card.id);
      // Card stays active; disabled on 'game:action_used' event
    });

    return { g, txt, zone, _draw, get used() { return used; }, setUsed() { used = true; _draw(false, true); txt.setAlpha(0.3); zone.disableInteractive(); } };
  }

  _disableActionCard(id) {
    const c = this._actionCards[id];
    if (c) c.setUsed();
  }

  // ── Accuse button ──────────────────────────────────────────

  _buildAccuseButton(width, height) {
    // Center-bottom, large — fills the space where the chip tray was.
    const bw = 380, bh = 72;
    const bx = width / 2;
    const by = height - 90 / 2;     // vertically centered in the bottom panel
    const g  = this.add.graphics();

    const _draw = (hover) => {
      g.clear();
      if (hover) {
        g.fillStyle(VI.COLORS.MAGENTA, 1);
        g.fillRoundedRect(bx - bw/2, by - bh/2, bw, bh, 14);
        g.lineStyle(14, VI.COLORS.GOLD, 0.18);
        g.strokeRoundedRect(bx - bw/2, by - bh/2, bw, bh, 14);
        g.lineStyle(3, VI.COLORS.GOLD, 1);
        g.strokeRoundedRect(bx - bw/2, by - bh/2, bw, bh, 14);
      } else {
        g.fillStyle(VI.COLORS.VI_RED, 0.9);
        g.fillRoundedRect(bx - bw/2, by - bh/2, bw, bh, 14);
        g.lineStyle(14, VI.COLORS.MAGENTA, 0.12);
        g.strokeRoundedRect(bx - bw/2, by - bh/2, bw, bh, 14);
        g.lineStyle(2, VI.COLORS.GOLD, 0.85);
        g.strokeRoundedRect(bx - bw/2, by - bh/2, bw, bh, 14);
      }
    };
    _draw(false);

    const lbl = this.add.text(bx, by, '🔍  ACCUSE!', {
      fontFamily: VI.FONTS.HEADING, fontSize: '28px', color: VI.HEX.GOLD,
      stroke: '#000', strokeThickness: 5, letterSpacing: 6,
      shadow: { blur: 14, color: VI.HEX.GOLD, fill: true },
    }).setOrigin(0.5);

    const zone = this.add.zone(bx, by, bw, bh).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { _draw(true);  lbl.setColor('#ffffff'); });
    zone.on('pointerout',   () => { _draw(false); lbl.setColor(VI.HEX.GOLD); });
    // (No screen-wide flash on ACCUSE — the magenta hover state is enough.)
    zone.on('pointerup', () => {
      const gs = this._gs;
      if (!gs) return;
      gs.events.emit('ui:accuse');
    });

    // Gentle alpha breath so the button calls out for attention during ACCUSE.
    // Stored on the graphics + label so they pulse together.
    this._accusePulse = this.tweens.add({
      targets: [g, lbl],
      alpha: { from: 0.85, to: 1 },
      duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Stash refs so _setAccuseVisible can toggle the whole button group together
    this._accuseRefs = [g, lbl, zone];
  }

  // ── Suspect selected indicator (bottom-left) ───────────────

  _onSuspectSelected(data) {
    if (!this._suspectLabel) {
      const { height } = this.scale;
      this._suspectHeader = this.add.text(16, height - 92 - 68, 'SUSPECT', {
        fontFamily: VI.FONTS.BODY, fontSize: '10px',
        color: VI.HEX.CYAN, letterSpacing: 4,
      });
      this._suspectLabel = this.add.text(16, height - 92 - 50, '—', {
        fontFamily: VI.FONTS.HEADING, fontSize: '16px', color: VI.HEX.GOLD,
      });
    }
    this._suspectLabel.setText(data.suspect.name.toUpperCase());
    this._suspectHeader.setVisible(true);
    this._suspectLabel.setVisible(true);
    this._gs.events.emit('ui:suspect_select', data.idx);
  }

  // Hide the suspect label whenever a fresh round begins — otherwise the
  // last suspect from the previous round stays pinned to the bottom-left.
  _clearSuspectLabel() {
    if (this._suspectHeader) this._suspectHeader.setVisible(false);
    if (this._suspectLabel)  this._suspectLabel.setVisible(false);
    if (this._suspectLabel)  this._suspectLabel.setText('—');
  }

  // ── Event handlers ─────────────────────────────────────────

  _onRoundStart(data) {
    this._accumulatedBet = 0;
    this._currentBet     = 0;
    if (this._betText) this._betText.setText('$0');
    // Wipe the previous round's SUSPECT label so the bottom-left doesn't
    // keep showing "THE MIME" or whoever was picked last time.
    this._clearSuspectLabel();
    // Re-enable action cards
    if (this._actionCards) {
      // Rebuild strip — easiest approach
      Object.values(this._actionCards).forEach(c => {
        c.g.destroy(); c.txt.destroy(); c.zone.destroy();
      });
      const { width, height } = this.scale;
      this._buildActionStrip(width, height);
    }
  }

  _onFolderUpdate(pct) {
    // Could animate a secondary indicator here; GameScene already renders the bar
  }

  _onWin(data) {
    this._showToast(`+$${Math.round(data.payout).toLocaleString()}`, VI.HEX.GOLD, 2500);
    this._accumulatedBet = 0;
    if (this._betText) this._betText.setText('$0');
  }

  _onLoss(data) {
    this._showToast(`-$${data.lost.toLocaleString()}`, VI.HEX.VI_RED, 2500);
    this._accumulatedBet = 0;
    if (this._betText) this._betText.setText('$0');
  }

  _onNextRound(balance) {
    this._balance        = balance;
    this._accumulatedBet = 0;
    this._currentBet     = 0;
    if (this._betText) this._betText.setText('$0');
  }

  // ── Toast notifications ─────────────────────────────────────

  _showToast(msg, color, duration) {
    color    = color    || VI.HEX.CREAM;
    duration = duration || 1500;

    const { width } = this.scale;
    const toast = this.add.text(width / 2, this._toastY, msg, {
      fontFamily: VI.FONTS.HEADING, fontSize: '28px',
      color, stroke: '#000000', strokeThickness: 4,
      shadow: { blur: 12, color, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: toast, alpha: 1, y: this._toastY - 12,
      duration: 280, ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: toast, alpha: 0, y: this._toastY - 36,
          delay: duration, duration: 350, ease: 'Power2',
          onComplete: () => toast.destroy(),
        });
      },
    });
  }
}
