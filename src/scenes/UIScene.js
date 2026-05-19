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

    // ── CRITICAL: null out every instance ref that's populated under an
    //    "if (!this._xxx)" guard. Phaser reuses scene instances across
    //    scene.start() restarts, so these references survive shutdown as
    //    pointers to *destroyed* GameObjects. If create() then sees the
    //    truthy old ref it skips recreation, and later setVisible/setText
    //    calls hit a dead object and break round flow (this is the
    //    "stuck after Lobby return" bug).
    this._betText            = null;
    this._betBuilderRefs     = null;
    this._chipObjs           = null;
    this._accuseRefs         = null;
    this._accusePulse        = null;
    this._actionCards        = null;
    this._suspectHeader      = null;
    this._suspectLabel       = null;
    this._toastY             = 130;
    this._betStackChips      = null;   // physical chip pile next to the bet counter
    this._betStackX          = 0;
    this._betStackBaseY      = 0;
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

    // Always start fresh — never re-use across scene restarts (the previous
    // array could hold pointers to destroyed Phaser objects).
    this._betBuilderRefs = [tg];

    this._chipObjs = {};
    chips.forEach((value, i) => {
      const x = startX + i * spacing;
      const chip = this._drawChip(x, cy, value);
      this._chipObjs[value] = chip;
      this._betBuilderRefs.push(chip.g, chip.txt, chip.zone);
    });
  }

  _drawChip(x, y, value) {
    // v0.5.2: denominations bumped to [10, 25, 100, 500, 1000] alongside a
    // 10K bankroll. Colors shift accordingly — gold reserved for the new
    // top tier ($1K), and the previous gold ($500) drops to cyan.
    const CHIP_COLORS = {
      10:   0xffffff,           // white  — minimum bet
      25:   0xff4444,           // red
      100:  0x44cc44,           // green
      500:  VI.COLORS.CYAN,     // cyan
      1000: VI.COLORS.GOLD,     // gold   — high roller
    };
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

    // Compact label: literal for under $1K, "K" suffix for thousands.
    const label = value >= 1000 ? `${value / 1000}K` : `${value}`;
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
      // Cosmetic — chip flies in an arc to the bet pile and lands.
      this._spawnFlyingChip(x, y, value);
    });

    return { g, txt, zone };
  }

  // ── Bet-pile animations ────────────────────────────────────
  // The bet pile is a *physical* chip stack rendered to the left of the bet
  // counter. Every click in the tray spawns a flying mini-chip that arcs
  // over the stage, lands on top of the pile, and triggers a tiny squash-
  // and-stretch settle. The pile caps at 12 visible chips — older ones fade
  // off the bottom (the bet text still tracks the truth).

  _drawStackChip(x, y, value) {
    // Same color mapping used by the tray, so a $1000 stack-chip is gold
    // regardless of which method drew it.
    const CHIP_COLORS = {
      10:   0xffffff,
      25:   0xff4444,
      100:  0x44cc44,
      500:  VI.COLORS.CYAN,
      1000: VI.COLORS.GOLD,
    };
    const color = CHIP_COLORS[value] != null ? CHIP_COLORS[value] : VI.COLORS.VI_PURPLE;
    const r = 13;
    const g = this.add.graphics();
    g.fillStyle(color, 0.35);
    g.fillCircle(0, 0, r);
    g.lineStyle(2, color, 1);
    g.strokeCircle(0, 0, r);
    g.lineStyle(1.5, color, 0.55);
    // Six tiny dashes — small enough that they read as a casino chip from afar
    for (let a = 0; a < 6; a++) {
      const rad = Phaser.Math.DegToRad(a * 60);
      g.lineBetween(Math.cos(rad) * 8, Math.sin(rad) * 8, Math.cos(rad) * r, Math.sin(rad) * r);
    }
    g.x = x;
    g.y = y;
    return g;
  }

  _spawnFlyingChip(fromX, fromY, value) {
    const STACK_OFFSET = 7;   // px per chip in the pile
    const stackIdx = this._betStackChips ? this._betStackChips.length : 0;
    const toX = this._betStackX;
    const toY = this._betStackBaseY - stackIdx * STACK_OFFSET;

    // Tiny x-jitter on each chip so the pile reads as hand-stacked, not stamped.
    const jitterX = (Math.random() - 0.5) * 4;

    const flying = this._drawStackChip(fromX, fromY, value);

    // Quadratic-bezier arc — control point ~90px above midpoint to give it
    // some lift. onUpdate interpolates so the chip flies over the table.
    const ctrlX = (fromX + toX) / 2;
    const ctrlY = Math.min(fromY, toY) - 110;
    const tgt = { t: 0 };

    this.tweens.add({
      targets: tgt,
      t: 1,
      duration: 380,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const t  = tgt.t;
        const it = 1 - t;
        flying.x = it * it * fromX + 2 * it * t * ctrlX + t * t * (toX + jitterX);
        flying.y = it * it * fromY + 2 * it * t * ctrlY + t * t * toY;
      },
      onComplete: () => this._landFlyingChip(flying, value),
    });
  }

  _landFlyingChip(flying, value) {
    if (!this._betStackChips) {
      // Scene must've torn down mid-flight — just drop the chip.
      flying.destroy();
      return;
    }
    this._betStackChips.push({ g: flying, value });

    // Squash-and-stretch settle on land
    flying.scaleY = 0.55; flying.scaleX = 1.35;
    this.tweens.add({
      targets: flying,
      scaleX: 1, scaleY: 1,
      duration: 220,
      ease: 'Back.Out',
    });

    // Cap visible pile at 12. Older chips fade off the bottom so the pile
    // never grows past the case-file panel above it.
    while (this._betStackChips.length > 12) {
      const oldest = this._betStackChips.shift();
      this.tweens.add({
        targets: oldest.g,
        alpha: 0,
        duration: 220,
        onComplete: () => oldest.g.destroy(),
      });
    }
  }

  // CLEAR button — scatter the pile outward + fade so the reset reads as a
  // deliberate sweep, not just a number flip back to $0.
  _clearBetStack() {
    if (!this._betStackChips) return;
    const chips = this._betStackChips;
    this._betStackChips = [];
    chips.forEach((c, i) => {
      const angle    = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 50;
      this.tweens.add({
        targets: c.g,
        x: c.g.x + Math.cos(angle) * distance,
        y: c.g.y + Math.sin(angle) * distance,
        rotation: (Math.random() - 0.5) * 3.5,
        alpha: 0,
        duration: 420 + i * 25,
        ease: 'Cubic.easeIn',
        onComplete: () => c.g.destroy(),
      });
    });
  }

  // Confirm/round-end — gentle fade. The chips have "left the felt."
  _fadeBetStack() {
    if (!this._betStackChips) return;
    const chips = this._betStackChips;
    this._betStackChips = [];
    chips.forEach((c, i) => {
      this.tweens.add({
        targets: c.g,
        alpha: 0,
        duration: 280,
        delay: i * 24,
        ease: 'Cubic.easeIn',
        onComplete: () => c.g.destroy(),
      });
    });
  }

  // ── Bet display ────────────────────────────────────────────

  _buildBetDisplay(width, height) {
    const panelH = 90;
    const by = height - panelH / 2;
    const bx = width * 0.42;

    // Physical chip pile lives just to the LEFT of the bet number. New chips
    // arc from the tray and stack upward. Initialized fresh per scene so
    // stale graphics never survive a restart.
    this._betStackChips = [];
    this._betStackX     = bx - 110;
    this._betStackBaseY = by + 14;     // bottom of the pile (first chip lands here)

    const lbl = this.add.text(bx, by - 16, 'CURRENT BET', {
      fontFamily: VI.FONTS.BODY, fontSize: '10px',
      color: VI.HEX.CYAN, letterSpacing: 4,
    }).setOrigin(0.5);

    // Right-aligned so long bets (e.g. $10,000) grow leftward into empty
    // space instead of overlapping the CONFIRM BET button to the right.
    this._betText = this.add.text(bx + 30, by + 6, '$0', {
      fontFamily: VI.FONTS.MONO, fontSize: '24px', color: VI.HEX.GOLD,
    }).setOrigin(1, 0.5);

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
      // Scatter the chip pile so the reset reads as deliberate, not silent.
      this._clearBetStack();
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
      if (this._accumulatedBet <= 0) {
        this._showToast('Place a bet first!', VI.HEX.MAGENTA, 1200); return;
      }
      // Reject bets below the minimum (clue math gets unreadable below $10).
      if (this._accumulatedBet < VI.GAME.MIN_BET) {
        this._showToast(`Minimum bet is $${VI.GAME.MIN_BET}`, VI.HEX.MAGENTA, 1500); return;
      }
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
      // Chips have been "pushed to the table" — fade the pile.
      this._fadeBetStack();
    });

    // ── Live POTENTIAL WIN preview ────────────────────────────
    // Sits in the gap between the CONFIRM BET button (right edge ≈ x=682)
    // and the game log (left edge ≈ x=819) — empty space during BETTING.
    // Recalculates every chip-click via _refreshBetDisplay so the player
    // sees the max possible payout grow as they stack chips.
    const pwX = 750;
    const pwLbl = this.add.text(pwX, by - 16, 'WIN UP TO', {
      fontFamily: VI.FONTS.BODY, fontSize: '10px',
      color: VI.HEX.GOLD, letterSpacing: 4,
    }).setOrigin(0.5);
    this._potentialWinText = this.add.text(pwX, by + 6, '$0', {
      fontFamily: VI.FONTS.MONO, fontSize: '22px', color: VI.HEX.GOLD,
      shadow: { blur: 8, color: VI.HEX.GOLD, fill: true },
    }).setOrigin(0.5);
    // Subtle ambient pulse so the preview stays eye-catching even when bet=0
    this._potentialWinPulse = this.tweens.add({
      targets: [pwLbl, this._potentialWinText],
      alpha: { from: 0.72, to: 1 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Track every bet-builder element so we can show/hide as a group.
    // _buildChipTray already initialised the array; we just append here.
    if (!this._betBuilderRefs) this._betBuilderRefs = [];
    this._betBuilderRefs.push(lbl, this._betText, clrTxt, clrZone, cfG, cfLbl, cfZone,
      pwLbl, this._potentialWinText);
  }

  _refreshBetDisplay(amt) {
    this._accumulatedBet = amt;
    if (this._betText) this._betText.setText(`$${amt.toLocaleString()}`);
    this._refreshPotentialWin(amt);
  }

  // Live POTENTIAL WIN — recomputes the best-case payout each chip-click.
  // Pulls suspect count / weapon tier from the live RoundController so the
  // number reflects this round's weapon (rare = 3.0× big number).
  _refreshPotentialWin(amt) {
    if (!this._potentialWinText) return;
    const round = this._gs && this._gs.gs && this._gs.gs.round;
    let potential = 0;
    if (round && typeof round.getMaxPotentialPayout === 'function') {
      potential = round.getMaxPotentialPayout(amt);
    }
    this._potentialWinText.setText(`$${potential.toLocaleString()}`);
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
    // Wrap in try/catch — if a stale destroyed Text from a previous
    // scene instance ever slips through (shouldn't happen now that
    // init() nulls these, but belt-and-suspenders), don't crash
    // round-start handling.
    try {
      if (this._suspectHeader && this._suspectHeader.scene) this._suspectHeader.setVisible(false);
      if (this._suspectLabel  && this._suspectLabel.scene)  this._suspectLabel.setVisible(false).setText('—');
    } catch (e) { /* swallow */ }
  }

  // ── Event handlers ─────────────────────────────────────────

  _onRoundStart(data) {
    this._accumulatedBet = 0;
    this._currentBet     = 0;
    if (this._betText) this._betText.setText('$0');
    // Reset POTENTIAL WIN to $0 — fresh round, no bet placed yet. Subsequent
    // chip-clicks will repopulate it via _refreshBetDisplay.
    this._refreshPotentialWin(0);
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
    this._fadeBetStack();   // safety — pile should already be empty from confirm
  }

  _onLoss(data) {
    this._showToast(`-$${data.lost.toLocaleString()}`, VI.HEX.VI_RED, 2500);
    this._accumulatedBet = 0;
    if (this._betText) this._betText.setText('$0');
    this._fadeBetStack();
  }

  _onNextRound(balance) {
    this._balance        = balance;
    this._accumulatedBet = 0;
    this._currentBet     = 0;
    if (this._betText) this._betText.setText('$0');
    this._fadeBetStack();
  }

  // ── Toast notifications ─────────────────────────────────────

  _showToast(msg, color, duration) {
    color    = color    || VI.HEX.CREAM;
    duration = duration || 1500;

    // Slot-based vertical stack so back-to-back toasts (e.g. SECOND CHANCE
    // banner + "Select a suspect first" error) don't paint on top of each
    // other. Each new toast takes the lowest free slot; freed on cleanup.
    if (!this._toastSlots) this._toastSlots = [];
    let slot = 0;
    while (this._toastSlots[slot]) slot++;
    this._toastSlots[slot] = true;

    const TOAST_GAP = 46;   // px between stacked toasts
    const baseY = this._toastY + slot * TOAST_GAP;

    const { width } = this.scale;
    const toast = this.add.text(width / 2, baseY, msg, {
      fontFamily: VI.FONTS.HEADING, fontSize: '28px',
      color, stroke: '#000000', strokeThickness: 4,
      shadow: { blur: 12, color, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: toast, alpha: 1, y: baseY - 12,
      duration: 280, ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: toast, alpha: 0, y: baseY - 36,
          delay: duration, duration: 350, ease: 'Power2',
          onComplete: () => {
            toast.destroy();
            this._toastSlots[slot] = false;
          },
        });
      },
    });
  }
}
