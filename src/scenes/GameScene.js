// ============================================================
// GameScene – Main game loop
// All art: placeholder graphics via Phaser Graphics API
// Communicates with UIScene (launched in parallel) via events
// ============================================================

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ── Lifecycle ──────────────────────────────────────────────

  init(data) {
    this.gs = {
      balance:       (data && data.balance      != null) ? data.balance      : VI.GAME.DEFAULT_BALANCE,
      suspectCount:  (data && data.suspectCount != null) ? data.suspectCount : 4,
      round:         null,                 // RoundController instance
      // Phase starts as null (not yet entered) so the first _setPhase(INTRO)
      // actually fires _enter_INTRO. Otherwise the same-state guard in
      // _setPhase would short-circuit and the round never advances.
      phase:         null,
      state:         'playing',            // LEGACY: kept as alias so existing checks keep working
      selectedIdx:   -1,                   // which suspect the player has highlighted
      bet:           0,
      wrongCount:    0,
    };
    this._folderPct       = 1.0;
    this._timerElapsed    = 0;
    this._timerExpired    = false;
    this._clueRevealed    = [false, false];
    this._burnTimer       = null;
    this._burnMultiplier  = 1;     // PRESS sets this to 3
    this._suspectLockedByAction = false;  // DOUBLE_DOWN locks suspect choice
    this._phaseTimers     = [];    // active delayedCall handles per phase (cleared on exit)
  }

  create() {
    const { width, height } = this.scale;

    // Draw static background layers
    this._drawBackground();

    // Case info panel (top bar)
    this._buildCasePanel();

    // Folder integrity bar
    this._buildFolderBar();

    // Suspect display area
    this._buildSuspectArea();

    // Clue feed area
    this._buildClueFeed();

    // Big case file panel (shown during BETTING phase only)
    this._buildCaseFilePanel();

    // Generate first round
    this._startRound();

    // ── Event bus: listen for UIScene actions ──────────────
    this.events.on('ui:bet_confirmed',  (amt) => this._onBetConfirmed(amt));
    this.events.on('ui:suspect_select', (idx) => this._onSuspectSelect(idx));
    this.events.on('ui:accuse',         ()    => this._onAccuse());
    this.events.on('ui:action_card',    (id)  => this._onActionCard(id));

    // ESC → menu
    this.input.keyboard.on('keydown-ESC', () => {
      this._stopTimer();
      this.scene.stop('UIScene');
      this.scene.start('MenuScene');
    });

    // Destruction cleanup
    this.events.once('shutdown', () => this._stopTimer());
  }

  update() { /* burn driven by time events */ }

  // ── Round setup ────────────────────────────────────────────

  _startRound() {
    const gs = this.gs;
    gs.round       = new RoundController(gs.suspectCount);
    gs.state       = 'playing';
    gs.selectedIdx = -1;
    gs.bet         = 0;
    gs.wrongCount  = 0;

    this._folderPct      = 1.0;
    this._clueRevealed   = [false, false];
    this._timerElapsed   = 0;
    this._timerExpired   = false;
    this._burnMultiplier = 1;
    this._suspectLockedByAction = false;

    this._refreshCasePanel();
    this._refreshSuspects();
    this._refreshFolderBar();
    this._clearClueFeed();

    // Emit round start to UIScene
    this.events.emit('game:round_start', {
      balance:      gs.balance,
      suspectCount: gs.suspectCount,
      suspects:     gs.round.suspects,
    });

    // Kick off the phase state machine at INTRO
    this._setPhase(VI.PHASES.INTRO);
  }

  // ── Phase state machine ────────────────────────────────────
  //
  // Transitions: INTRO → BETTING → (ACCUSATION_1 → SECOND_CHANCE → ACCUSATION_2)? → SCOREBOARD
  //
  // Single entry point: _setPhase(name). Runs _exit_<old>() then
  // _enter_<new>(). Each phase owns its delayedCalls via _scheduleInPhase
  // so we never leak timers across transitions.

  _setPhase(next) {
    const prev = this.gs.phase;
    if (prev === next) return;

    // Exit hook
    const exitFn = this[`_exit_${prev}`];
    if (typeof exitFn === 'function') exitFn.call(this);
    this._clearPhaseTimers();

    this.gs.phase = next;
    // LEGACY alias — keep .state in sync for code paths that still check it.
    // Most UI gates check `gs.state === 'playing'`; that's true during
    // BETTING and SECOND_CHANCE so the player can still interact.
    if (next === VI.PHASES.SCOREBOARD) {
      this.gs.state = 'finished';
    } else if (next === VI.PHASES.ACCUSATION_1 || next === VI.PHASES.ACCUSATION_2) {
      this.gs.state = 'resolving';
    } else {
      this.gs.state = 'playing';
    }

    this.events.emit('game:phase_change', { phase: next, prev });

    // Enter hook
    const enterFn = this[`_enter_${next}`];
    if (typeof enterFn === 'function') enterFn.call(this);
  }

  _scheduleInPhase(ms, cb) {
    const handle = this.time.delayedCall(ms, () => {
      // remove from list when fired
      this._phaseTimers = this._phaseTimers.filter(t => t !== handle);
      cb();
    });
    this._phaseTimers.push(handle);
    return handle;
  }

  _clearPhaseTimers() {
    this._phaseTimers.forEach(t => { if (t && t.remove) t.remove(); });
    this._phaseTimers = [];
  }

  // ── Phase: INTRO ───────────────────────────────────────────
  _enter_INTRO() {
    this._addClue('🦆 Ducky has a new case. Study the suspects…', VI.HEX.CYAN);
    this._scheduleInPhase(VI.PHASE_TIMINGS.INTRO_MS, () => this._setPhase(VI.PHASES.BETTING));
  }

  // ── Phase: BETTING ─────────────────────────────────────────
  // Open-ended in spirit — player can read the case file at their own
  // pace. We show a soft 60s countdown for pacing/feedback only; it
  // doesn't force a transition.
  _enter_BETTING() {
    this._showCaseFile();
    this._showTimerText();
    this._timerElapsed = 0;
    this._timerExpired = false;
    this._updateTimerText();

    // Light tick that only updates the timer text — no folder burn here.
    this._stopTimer();
    this._burnTimer = this.time.addEvent({
      delay: 250, loop: true,
      callback: this._bettingTick, callbackScope: this,
    });

    this._addClue('💼 Read the case file. Place your bet to deal the suspects.', VI.HEX.VI_AMBER);
  }
  _exit_BETTING() {
    this._stopTimer();
    this._hideCaseFile();
  }

  // ── Phase: ACCUSE ──────────────────────────────────────────
  // Bet is locked. Suspects appear with their quotes. Folder starts
  // burning over ACCUSE_TOTAL_MS. Player has to call it before the
  // folder hits the floor.
  _enter_ACCUSE() {
    this._revealSuspects();
    this._showTimerText();
    // Reset real-elapsed counter for the 30s accuse window
    this._timerElapsed = 0;
    this._timerExpired = false;
    this._updateTimerText();
    this._addClue('🎲 The cards are dealt. Suspects revealed — call it!', VI.HEX.CYAN);

    // Folder burn timer — ticks every 250ms
    this._stopTimer();
    this._burnTimer = this.time.addEvent({
      delay: 250, loop: true,
      callback: this._burnTick, callbackScope: this,
    });

    // Schedule clue reveals (pure flavour — no action cards for now)
    this._scheduleInPhase(VI.PHASE_TIMINGS.CLUE_1_AT_MS, () => this._revealClue(0));
    this._scheduleInPhase(VI.PHASE_TIMINGS.CLUE_2_AT_MS, () => this._revealClue(1));
    this._scheduleInPhase(VI.PHASE_TIMINGS.LAST_CALL_AT_MS, () => {
      if (this.gs.phase === VI.PHASES.ACCUSE) {
        this._addClue('⏰ LAST CALL — folder almost spent!', VI.HEX.VI_ORANGE);
      }
    });
  }
  _exit_ACCUSE() {
    this._stopTimer();
  }

  // ── Phase: ACCUSATION_1 ────────────────────────────────────
  _enter_ACCUSATION_1() {
    this._stopTimer();
    const gs = this.gs;
    const correct = (gs.selectedIdx === gs.round.killerIdx);
    if (correct) {
      this._resolveWin(false);
    } else {
      gs.wrongCount = 1;
      this._setPhase(VI.PHASES.SECOND_CHANCE);
    }
  }

  // ── Phase: SECOND_CHANCE ───────────────────────────────────
  _enter_SECOND_CHANCE() {
    const gs = this.gs;
    const wrongIdx = gs.selectedIdx;
    const wrongSpr = this._suspectSprites[wrongIdx];
    if (wrongSpr) {
      this.tweens.add({
        targets: [wrongSpr.g, wrongSpr.nameText, wrongSpr.subtextText, wrongSpr.numText],
        alpha: 0.15, duration: 400,
      });
      wrongSpr.zone.disableInteractive();
    }
    this._addClue(`❌ WRONG! ${gs.round.suspects[wrongIdx].name} is innocent.`, VI.HEX.MAGENTA);
    this._addClue('🎲 SECOND CHANCE — folder burns 3× faster, 15s left!', VI.HEX.VI_ORANGE);

    gs.selectedIdx = -1;
    this._refreshSuspectHighlights();

    // Fresh 15s countdown for second chance
    this._timerElapsed = 0;
    this._timerExpired = false;
    this._updateTimerText();

    // Resume burn ticker (wrongCount=1 makes the folder drop 3× per _burnTick)
    this._stopTimer();
    this._burnTimer = this.time.addEvent({
      delay: 250, loop: true,
      callback: this._burnTick, callbackScope: this,
    });
    // Hard 15s timeout → auto-resolve as loss if no accusation
    this._scheduleInPhase(VI.PHASE_TIMINGS.SECOND_CHANCE_MS, () => {
      if (this.gs.phase === VI.PHASES.SECOND_CHANCE) {
        this._addClue('⏰ Second chance timed out. Case closed.', VI.HEX.VI_RED);
        this._resolveLoss();
      }
    });
    this.events.emit('game:second_chance');
  }
  _exit_SECOND_CHANCE() {
    this._stopTimer();
  }

  // ── Phase: ACCUSATION_2 ────────────────────────────────────
  _enter_ACCUSATION_2() {
    const gs = this.gs;
    const correct = (gs.selectedIdx === gs.round.killerIdx);
    if (correct) {
      this._resolveWin(true);   // 2nd-accusation penalty applied
    } else {
      gs.wrongCount = 2;
      this._resolveLoss();
    }
  }

  // ── Phase: SCOREBOARD ──────────────────────────────────────
  _enter_SCOREBOARD() {
    // Visual handled by _showResultOverlay() which is called from
    // _resolveWin / _resolveLoss right before transitioning here.
    // Phase entry just emits a clean event for the UI to react to.
    this.events.emit('game:scoreboard');
  }

  _stopTimer() {
    if (this._burnTimer) { this._burnTimer.remove(); this._burnTimer = null; }
  }

  _burnTick() {
    if (this.gs.state !== 'playing') return;

    // _timerElapsed = REAL seconds since phase entry. Always increments by 0.25.
    // Folder integrity progresses at a multiplied rate (wrongCount and PRESS
    // both speed it up), but the on-screen timer should still tick in real time.
    const wrongMult  = this.gs.wrongCount > 0 ? 3 : 1;
    const actionMult = this._burnMultiplier || 1;
    const burnSpeed  = wrongMult * actionMult;

    const totalSecs = VI.PHASE_TIMINGS.ACCUSE_TOTAL_MS / 1000;  // 30s real for ACCUSE
    const tickSecs  = 0.25;
    const floor     = 0.20;

    this._timerElapsed += tickSecs;
    const folderProgress = (this._timerElapsed * burnSpeed) / totalSecs;
    this._folderPct = Math.max(floor, 1.0 - folderProgress);

    this._refreshFolderBar();
    this.events.emit('game:folder_update', this._folderPct);

    if (this._folderPct <= floor && !this._timerExpired) {
      this._timerExpired = true;
      this._addClue('⏰ TIME OUT — folder at minimum. Accuse now!', VI.HEX.VI_RED);
      this.events.emit('game:timeout');
    }
  }

  // Lightweight tick for BETTING — increments _timerElapsed and updates the
  // timer text. No folder burn (BETTING is open-ended visually). At soft
  // expiry we nudge the player; no auto-advance.
  _bettingTick() {
    if (this.gs.phase !== VI.PHASES.BETTING) return;
    this._timerElapsed += 0.25;
    this._updateTimerText();

    const totalSecs = VI.PHASE_TIMINGS.BETTING_TIMER_MS / 1000;
    if (this._timerElapsed >= totalSecs && !this._timerExpired) {
      this._timerExpired = true;
      this._addClue('⏰ TIME UP — place your bet to deal the suspects!', VI.HEX.VI_RED);
    }
  }

  // ── Case panel ─────────────────────────────────────────────

  _buildCasePanel() {
    const { width } = this.scale;
    const g = this.add.graphics();
    g.fillStyle(VI.COLORS.PANEL_SURFACE, 0.97);
    g.fillRect(0, 0, width, 84);
    g.lineStyle(1, VI.COLORS.CYAN, 0.25);
    g.lineBetween(0, 84, width, 84);

    this._drawMiniDucky(46, 42);

    this.add.text(96, 12, 'CASE FILE', {
      fontFamily: VI.FONTS.BODY, fontSize: '10px',
      color: VI.HEX.CYAN, letterSpacing: 5,
    });
    this._caseTitle  = this.add.text(96, 28, '—', {
      fontFamily: VI.FONTS.HEADING, fontSize: '20px', color: VI.HEX.GOLD,
    });
    this._caseDetail = this.add.text(96, 52, '—', {
      fontFamily: VI.FONTS.MONO, fontSize: '11px', color: VI.HEX.CREAM,
    });

    // Balance (top-right)
    this.add.text(width - 16, 10, 'BALANCE', {
      fontFamily: VI.FONTS.BODY, fontSize: '10px',
      color: VI.HEX.CYAN, letterSpacing: 4,
    }).setOrigin(1, 0);
    this._balanceText = this.add.text(width - 16, 26, `$${this.gs.balance.toLocaleString()}`, {
      fontFamily: VI.FONTS.MONO, fontSize: '26px', color: VI.HEX.GOLD,
    }).setOrigin(1, 0);

    // Timer (centre)
    this._timerText = this.add.text(width / 2, 42, '45s', {
      fontFamily: VI.FONTS.MONO, fontSize: '15px', color: VI.HEX.CREAM, alpha: 0.65,
    }).setOrigin(0.5);
  }

  _refreshCasePanel() {
    const r = this.gs.round;
    if (!r) return;
    this._caseTitle.setText(`THE ${r.victim.victimName.toUpperCase()} CASE`);
    this._caseDetail.setText(`Weapon: ${r.weaponName}  |  Room: ${r.roomName}  |  Motive: ${r.motive}`);
    this._timerExpired = false;
    this._updateTimerText();
  }

  _updateTimerText() {
    if (!this._timerText) return;
    const P = VI.PHASES;
    const T = VI.PHASE_TIMINGS;
    let total = 0;
    if      (this.gs.phase === P.BETTING)       total = T.BETTING_TIMER_MS  / 1000;
    else if (this.gs.phase === P.ACCUSE)        total = T.ACCUSE_TOTAL_MS   / 1000;
    else if (this.gs.phase === P.SECOND_CHANCE) total = T.SECOND_CHANCE_MS  / 1000;

    const elapsed = this._timerElapsed || 0;
    const secs    = Math.max(0, Math.round(total - elapsed));
    const col     = secs < 8 ? VI.HEX.VI_RED : secs < 15 ? VI.HEX.VI_ORANGE : VI.HEX.CREAM;
    this._timerText.setText(`${secs}s`).setColor(col);
  }

  _showTimerText() { if (this._timerText) this._timerText.setVisible(true); }
  _hideTimerText() { if (this._timerText) this._timerText.setVisible(false); }

  // ── Folder bar ─────────────────────────────────────────────

  _buildFolderBar() {
    const { width } = this.scale;
    const by = 84, bh = 10;
    const track = this.add.graphics();
    track.fillStyle(VI.COLORS.PANEL_SURFACE, 1);
    track.fillRect(0, by, width, bh);
    this._folderBarG  = this.add.graphics();
    this._folderLabel = this.add.text(width / 2, by + bh / 2, 'FOLDER INTEGRITY  100%', {
      fontFamily: VI.FONTS.MONO, fontSize: '9px', color: VI.HEX.CYAN, alpha: 0.5,
    }).setOrigin(0.5);
    this._refreshFolderBar();
  }

  _refreshFolderBar() {
    const { width } = this.scale;
    const pct = this._folderPct != null ? this._folderPct : 1.0;
    const by  = 84, bh = 10;
    const col = pct > 0.6 ? VI.COLORS.CYAN : pct > 0.3 ? VI.COLORS.VI_ORANGE : VI.COLORS.VI_RED;

    this._folderBarG.clear();
    this._folderBarG.fillStyle(col, 0.85);
    this._folderBarG.fillRect(0, by, width * pct, bh);

    const lcol = pct > 0.6 ? VI.HEX.CYAN : pct > 0.3 ? VI.HEX.VI_ORANGE : VI.HEX.VI_RED;
    this._folderLabel.setText(`FOLDER INTEGRITY  ${Math.round(pct * 100)}%`).setColor(lcol);
    this._updateTimerText();
  }

  // ── Suspects ───────────────────────────────────────────────

  _buildSuspectArea() {
    this._suspectSprites = [];
  }

  _refreshSuspects() {
    const { width } = this.scale;
    const r = this.gs.round;
    if (!r) return;

    this._suspectSprites.forEach(s => {
      [s.g, s.nameText, s.subtextText, s.highlightG, s.zone, s.numText].forEach(o => { if (o) o.destroy(); });
    });
    this._suspectSprites = [];

    const count = r.suspects.length;
    const areaX = 40, areaY = 106;
    const areaW = width * 0.60, areaH = 410; // leave room for UI strip at y≈554
    const cols  = Math.min(count, 3);
    const rows  = Math.ceil(count / cols);
    const cellW = areaW / cols;
    const cellH = areaH / rows;
    const tokenR = Math.min(cellW, cellH) * 0.28;

    r.suspects.forEach((sus, idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const cx  = areaX + col * cellW + cellW / 2;
      const cy  = areaY + row * cellH + cellH / 2;

      const highlightG = this.add.graphics();
      const g          = this.add.graphics();
      this._drawSuspectToken(g, cx, cy, tokenR, sus.color);

      const numText = this.add.text(cx, cy - 8, `${idx + 1}`, {
        fontFamily: VI.FONTS.HEADING,
        fontSize: `${Math.round(tokenR * 0.55)}px`,
        color: Phaser.Display.Color.IntegerToColor(sus.color).rgba,
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5);

      const nameText = this.add.text(cx, cy + tokenR + 14, sus.name.toUpperCase(), {
        fontFamily: VI.FONTS.HEADING, fontSize: '12px',
        color: VI.HEX.CREAM, stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);

      const subtextText = this.add.text(cx, cy + tokenR + 30, sus.alibi || '…', {
        fontFamily: VI.FONTS.MONO, fontSize: '10px',
        color: '#ffffff44', wordWrap: { width: cellW - 20 },
      }).setOrigin(0.5);

      const zone = this.add.zone(cx, cy, cellW - 8, cellH - 8).setInteractive({ cursor: 'pointer' });
      zone.on('pointerover', () => {
        if (this.gs.state !== 'playing' || this.gs.selectedIdx === idx) return;
        highlightG.clear();
        highlightG.lineStyle(2, VI.COLORS.GOLD, 0.5);
        highlightG.strokeCircle(cx, cy, tokenR + 8);
      });
      zone.on('pointerout', () => {
        if (this.gs.selectedIdx !== idx) highlightG.clear();
      });
      zone.on('pointerup', () => {
        if (this.gs.state !== 'playing') return;
        this.gs.selectedIdx = idx;
        this._refreshSuspectHighlights();
        this.events.emit('game:suspect_selected', { idx, suspect: sus });
      });

      // Suspects start hidden — they reveal when ACCUSE phase begins.
      [g, numText, nameText, subtextText].forEach(o => o.setAlpha(0));
      zone.disableInteractive();

      this._suspectSprites.push({ g, numText, nameText, subtextText, highlightG, zone, cx, cy, tokenR, idx, sus });
    });
  }

  // Staggered fade-in for ACCUSE phase — "the cards are dealt" moment
  _revealSuspects() {
    this._suspectSprites.forEach((s, i) => {
      this.tweens.add({
        targets: [s.g, s.numText, s.nameText, s.subtextText],
        alpha: 1,
        duration: 400, delay: i * 70, ease: 'Cubic.easeOut',
      });
      s.zone.setInteractive({ cursor: 'pointer' });
    });
  }

  _drawSuspectToken(g, cx, cy, r, color) {
    const pts = [];
    for (let a = 0; a < 6; a++) {
      const ang = (Math.PI / 3) * a - Math.PI / 6;
      pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
    }
    g.fillStyle(color, 0.12);
    g.fillPoints(pts, true);
    g.lineStyle(8, color, 0.12);
    g.strokePoints(pts, true);
    g.lineStyle(2, color, 0.9);
    g.strokePoints(pts, true);
    g.fillStyle(color, 0.18);
    g.fillCircle(cx, cy - 8, r * 0.35);
  }

  _refreshSuspectHighlights() {
    const sel = this.gs.selectedIdx;
    this._suspectSprites.forEach(({ highlightG, cx, cy, tokenR, idx }) => {
      highlightG.clear();
      if (idx === sel) {
        highlightG.lineStyle(3, VI.COLORS.GOLD, 1);
        highlightG.strokeCircle(cx, cy, tokenR + 12);
        highlightG.lineStyle(10, VI.COLORS.GOLD, 0.18);
        highlightG.strokeCircle(cx, cy, tokenR + 16);
      }
    });
  }

  // ── Case file panel (BETTING phase) ────────────────────────
  // Big readable panel showing victim + weapon + room + motive.
  // Built once at scene init (hidden); _showCaseFile / _hideCaseFile
  // toggle visibility on phase transitions.

  _buildCaseFilePanel() {
    // Position so the panel's right edge clears the clue feed (which starts at 0.64 × width).
    // Panel center 0.32 × 1280 = 410; with pw=700 the right edge lands at 760, ~60px clear of the feed.
    const cx = Math.round(this.scale.width * 0.32);
    const cy = 330;
    const pw = 700, ph = 380;

    const g = this.add.graphics();
    g.fillStyle(VI.COLORS.PANEL_SURFACE, 0.98);
    g.fillRoundedRect(cx - pw/2, cy - ph/2, pw, ph, 14);
    g.lineStyle(8, VI.COLORS.GOLD, 0.12);
    g.strokeRoundedRect(cx - pw/2, cy - ph/2, pw, ph, 14);
    g.lineStyle(2, VI.COLORS.GOLD, 0.9);
    g.strokeRoundedRect(cx - pw/2, cy - ph/2, pw, ph, 14);

    // Header strip
    const header = this.add.text(cx - pw/2 + 28, cy - ph/2 + 26, 'CASE FILE', {
      fontFamily: VI.FONTS.HEADING, fontSize: '15px',
      color: VI.HEX.GOLD, letterSpacing: 6,
      shadow: { blur: 8, color: VI.HEX.GOLD, fill: true },
    });
    const caseNum = this.add.text(cx + pw/2 - 28, cy - ph/2 + 26, '#247', {
      fontFamily: VI.FONTS.MONO, fontSize: '13px',
      color: VI.HEX.CYAN, alpha: 0.6,
    }).setOrigin(1, 0);

    const sep = this.add.graphics();
    sep.lineStyle(1, VI.COLORS.CYAN, 0.4);
    sep.lineBetween(cx - pw/2 + 28, cy - ph/2 + 54, cx + pw/2 - 28, cy - ph/2 + 54);

    // "THE LATE" eyebrow
    const eyebrow = this.add.text(cx, cy - ph/2 + 76, 'THE LATE', {
      fontFamily: VI.FONTS.MONO, fontSize: '11px',
      color: VI.HEX.CREAM, alpha: 0.5, letterSpacing: 4,
    }).setOrigin(0.5);

    // Victim name (the hero)
    this._cfVictim = this.add.text(cx, cy - ph/2 + 112, '—', {
      fontFamily: VI.FONTS.HEADING, fontSize: '40px',
      color: VI.HEX.MAGENTA, letterSpacing: 4,
      shadow: { blur: 14, color: VI.HEX.MAGENTA, fill: true },
    }).setOrigin(0.5);

    // Title (italic flavour)
    this._cfTitle = this.add.text(cx, cy - ph/2 + 150, '—', {
      fontFamily: VI.FONTS.BODY, fontSize: '14px',
      color: VI.HEX.CREAM, alpha: 0.7, fontStyle: 'italic',
    }).setOrigin(0.5);

    // Murder narrative
    this._cfNarrative = this.add.text(cx, cy + 8, '', {
      fontFamily: VI.FONTS.BODY, fontSize: '17px',
      color: VI.HEX.CREAM, align: 'center',
      lineSpacing: 8, wordWrap: { width: pw - 80 },
    }).setOrigin(0.5);

    // Motive
    this._cfMotive = this.add.text(cx, cy + ph/2 - 72, '', {
      fontFamily: VI.FONTS.MONO, fontSize: '12px',
      color: VI.HEX.CYAN, letterSpacing: 3,
    }).setOrigin(0.5);

    // CTA — pulses to draw eye
    this._cfCTA = this.add.text(cx, cy + ph/2 - 36, '▶  PLACE YOUR BET TO DEAL THE SUSPECTS', {
      fontFamily: VI.FONTS.HEADING, fontSize: '13px',
      color: VI.HEX.GOLD, letterSpacing: 4,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: this._cfCTA, alpha: { from: 0.6, to: 1 },
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Store every element so we can show/hide as a group
    this._caseFileElements = [g, header, caseNum, sep, eyebrow,
      this._cfVictim, this._cfTitle, this._cfNarrative, this._cfMotive, this._cfCTA];
    this._caseFileElements.forEach(e => e.setAlpha(0));
  }

  _showCaseFile() {
    const r = this.gs.round;
    if (!r || !this._caseFileElements) return;

    this._cfVictim.setText(r.victim.victimName.toUpperCase());
    this._cfTitle.setText(r.victim.title);
    this._cfNarrative.setText(
      `Was ${r.victim.deathVerb}\n` +
      `with ${r.weaponName}\n` +
      `in ${r.roomName}.`
    );
    this._cfMotive.setText(`MOTIVE  ·  ${r.motive.toUpperCase()}`);

    // Staggered fade-in
    this._caseFileElements.forEach((e, i) => {
      this.tweens.add({
        targets: e, alpha: { from: 0, to: 1 },
        duration: 350, delay: i * 35, ease: 'Cubic.easeOut',
      });
    });
  }

  _hideCaseFile() {
    if (!this._caseFileElements) return;
    this._caseFileElements.forEach(e => {
      this.tweens.add({
        targets: e, alpha: 0,
        duration: 220, ease: 'Cubic.easeIn',
      });
    });
  }

  // ── Clue feed ──────────────────────────────────────────────

  _buildClueFeed() {
    const { width, height } = this.scale;
    const fx = Math.round(width * 0.64), fy = 100;
    const fw = width - fx - 16, fh = height - fy - 90;

    const bg = this.add.graphics();
    bg.fillStyle(VI.COLORS.PANEL_SURFACE, 0.75);
    bg.fillRoundedRect(fx, fy, fw, fh, 8);
    bg.lineStyle(1, VI.COLORS.CYAN, 0.18);
    bg.strokeRoundedRect(fx, fy, fw, fh, 8);

    this.add.text(fx + fw / 2, fy + 16, 'CLUE FEED', {
      fontFamily: VI.FONTS.HEADING, fontSize: '12px',
      color: VI.HEX.CYAN, letterSpacing: 6,
    }).setOrigin(0.5);

    const sep = this.add.graphics();
    sep.lineStyle(1, VI.COLORS.CYAN, 0.18);
    sep.lineBetween(fx + 10, fy + 30, fx + fw - 10, fy + 30);

    this._clueFeedX = fx + 12;
    this._clueFeedY = fy + 38;
    this._clueFeedW = fw - 24;
    this._clueTexts = [];
    this._clueY     = this._clueFeedY;
  }

  _clearClueFeed() {
    this._clueTexts.forEach(t => t.destroy());
    this._clueTexts = [];
    this._clueY     = this._clueFeedY;
  }

  _addClue(text, color) {
    color = color || VI.HEX.CREAM;
    const t = this.add.text(this._clueFeedX, this._clueY, text, {
      fontFamily: VI.FONTS.MONO, fontSize: '11px',
      color, wordWrap: { width: this._clueFeedW }, lineSpacing: 2,
    });
    this._clueTexts.push(t);
    this._clueY += t.height + 8;
    t.setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 380, ease: 'Power2' });
  }

  _revealClue(idx) {
    if (this.gs.state !== 'playing' || this._clueRevealed[idx]) return;
    this._clueRevealed[idx] = true;
    const clue = this.gs.round.clues[idx];
    if (!clue) return;
    const icons = ['🔍', '📋'];
    this._addClue(`${icons[idx]} CLUE ${idx + 1}: ${clue.text}`, VI.HEX.CYAN);
    this.events.emit('game:clue_revealed', { idx, clue });
    if (clue.suspectIdx != null) this._pulseSuspect(clue.suspectIdx);
  }

  _pulseSuspect(idx) {
    const s = this._suspectSprites[idx];
    if (!s) return;
    this.tweens.add({ targets: s.g, alpha: { from: 1, to: 0.3 }, duration: 200, yoyo: true, repeat: 2 });
  }

  // ── Accusation flow ────────────────────────────────────────

  _onBetConfirmed(amt) {
    // Bets can only be placed in BETTING (before suspects appear).
    if (this.gs.phase !== VI.PHASES.BETTING) return;
    this.gs.bet = amt;

    // Chips leave the bankroll the moment they hit the table — visceral
    // feedback the player asked for. The resolution math (_resolveWin/Loss)
    // accounts for this upfront deduction.
    this.gs.balance = Math.max(0, this.gs.balance - amt);
    this._balanceText.setText(`$${this.gs.balance.toLocaleString()}`);
    // Make the balance flash magenta briefly so it's obvious it moved
    this.tweens.add({
      targets: this._balanceText,
      alpha: { from: 0.4, to: 1 }, duration: 320, ease: 'Cubic.easeOut',
    });

    if (this.gs.round && this.gs.round.registerBetLock) {
      this.gs.round.registerBetLock(this._folderPct);
    }
    const eb = (this._folderPct > 0.60) ? '  ★ EARLY BIRD +15%' : '';
    this._addClue(`💰 Bet placed: $${amt} (balance now $${this.gs.balance.toLocaleString()})${eb}`, VI.HEX.VI_AMBER);

    // Tell UIScene so any balance-aware checks (e.g. chip affordability)
    // see the updated number on the next interaction.
    this.events.emit('game:balance_update', this.gs.balance);

    // Bet locked → "deal the cards" — transition to ACCUSE.
    this._setPhase(VI.PHASES.ACCUSE);
  }

  _onSuspectSelect(idx) {
    if (this._suspectLockedByAction) {
      this.events.emit('game:error', 'Suspect locked by DOUBLE DOWN');
      return;
    }
    this.gs.selectedIdx = idx;
    this._refreshSuspectHighlights();
  }

  _onAccuse() {
    const gs = this.gs;
    // Accuse window is the ACCUSE phase (post-bet) or SECOND_CHANCE.
    if (gs.phase !== VI.PHASES.ACCUSE && gs.phase !== VI.PHASES.SECOND_CHANCE) return;
    if (gs.selectedIdx < 0) { this.events.emit('game:error', 'Select a suspect first!'); return; }
    if (gs.bet <= 0)        { this.events.emit('game:error', 'No bet placed!');          return; }

    // Transition into the appropriate accusation phase
    const targetPhase = (gs.phase === VI.PHASES.SECOND_CHANCE)
      ? VI.PHASES.ACCUSATION_2
      : VI.PHASES.ACCUSATION_1;
    this._setPhase(targetPhase);
  }

  _resolveWin(secondAccusation) {
    const gs = this.gs;
    // Bet was deducted on confirm. On a win, credit the FULL gross payout
    // (which includes the original stake plus winnings).
    const payout = gs.round.calculatePayout(gs.bet, gs.selectedIdx, this._folderPct, { secondAccusation });
    const net    = payout - gs.bet;                   // net profit (for display)
    gs.balance   = Math.round(gs.balance + payout);
    this._balanceText.setText(`$${gs.balance.toLocaleString()}`);
    this.events.emit('game:balance_update', gs.balance);

    const tag = secondAccusation ? ' (Acc#2 — 40% cap)' : '';
    this._addClue(`✅ CORRECT! ${gs.round.suspects[gs.selectedIdx].name} is the killer!${tag}`, VI.HEX.GOLD);
    this._addClue(`💰 PAYOUT: +$${Math.round(net).toLocaleString()}`, VI.HEX.GOLD);
    this._markGuiltySuspect(gs.selectedIdx);
    this._showResultOverlay(true, net);
    this.events.emit('game:win', { payout: net, balance: gs.balance });
    this._setPhase(VI.PHASES.SCOREBOARD);
  }

  _resolveLoss() {
    const gs = this.gs;
    // Bet was already taken from the balance on confirm. INSURANCE refunds 50%.
    const refund = gs.round.getInsuranceRefund(gs.bet);
    if (refund > 0) {
      gs.balance = Math.round(gs.balance + refund);
      this._balanceText.setText(`$${gs.balance.toLocaleString()}`);
      this.events.emit('game:balance_update', gs.balance);
      this._addClue(`🛡 INSURANCE refund: +$${refund.toLocaleString()}`, VI.HEX.CYAN);
    }
    const lost = gs.bet - refund;                     // net loss (for display)
    this._addClue(`❌ WRONG AGAIN! Killer was ${gs.round.suspects[gs.round.killerIdx].name}.`, VI.HEX.VI_RED);
    this._addClue(`💸 NET LOST: -$${lost.toLocaleString()}`, VI.HEX.MAGENTA);
    this._markGuiltySuspect(gs.round.killerIdx);
    this._showResultOverlay(false, -lost);
    this.events.emit('game:loss', { lost, balance: gs.balance });
    this._setPhase(VI.PHASES.SCOREBOARD);
  }

  _markGuiltySuspect(idx) {
    const s = this._suspectSprites[idx];
    if (!s) return;
    const badge = this.add.text(s.cx, s.cy, 'KILLER', {
      fontFamily: VI.FONTS.HEADING, fontSize: '16px', color: VI.HEX.MAGENTA,
      stroke: '#000', strokeThickness: 4,
      shadow: { blur: 12, color: VI.HEX.MAGENTA, fill: true },
    }).setOrigin(0.5);
    this.tweens.add({ targets: badge, scaleX: 1.12, scaleY: 1.12, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  _showResultOverlay(win, delta) {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.72);
    overlay.fillRect(0, 0, width, height);

    const panel = this.add.graphics();
    panel.fillStyle(VI.COLORS.PANEL_SURFACE, 0.97);
    panel.fillRoundedRect(cx - 270, cy - 150, 540, 300, 16);
    panel.lineStyle(3, win ? VI.COLORS.GOLD : VI.COLORS.VI_RED, 1);
    panel.strokeRoundedRect(cx - 270, cy - 150, 540, 300, 16);

    const headline = this.add.text(cx, cy - 100, win ? '🔍  CASE SOLVED!' : '❌  CASE COLD', {
      fontFamily: VI.FONTS.HEADING, fontSize: '38px',
      color: win ? VI.HEX.GOLD : VI.HEX.VI_RED, stroke: '#000', strokeThickness: 5,
      shadow: { blur: 18, color: win ? VI.HEX.GOLD : VI.HEX.VI_RED, fill: true },
    }).setOrigin(0.5);

    const killerName = this.gs.round.suspects[this.gs.round.killerIdx].name;
    const verdictLine = win
      ? `${killerName} has been arrested!`
      : `The killer was ${killerName}. They escape free.`;
    this.add.text(cx, cy - 52, verdictLine, {
      fontFamily: VI.FONTS.BODY, fontSize: '15px', color: VI.HEX.CREAM,
    }).setOrigin(0.5);

    const amtColor = delta >= 0 ? VI.HEX.GOLD : VI.HEX.MAGENTA;
    this.add.text(cx, cy, `${delta >= 0 ? '+' : ''}$${Math.round(delta).toLocaleString()}`, {
      fontFamily: VI.FONTS.MONO, fontSize: '44px', color: amtColor,
    }).setOrigin(0.5);

    this.add.text(cx, cy + 54, `Balance: $${this.gs.balance.toLocaleString()}`, {
      fontFamily: VI.FONTS.MONO, fontSize: '18px', color: VI.HEX.CREAM,
    }).setOrigin(0.5);

    // Next case button
    const bw = 230, bh = 50;
    const btnG = this.add.graphics();
    const _drawBtn = (hover) => {
      btnG.clear();
      btnG.fillStyle(hover ? VI.COLORS.MAGENTA : VI.COLORS.VI_PURPLE, 1);
      btnG.fillRoundedRect(cx - bw/2, cy + 90, bw, bh, 10);
      btnG.lineStyle(2, VI.COLORS.GOLD, hover ? 1 : 0.7);
      btnG.strokeRoundedRect(cx - bw/2, cy + 90, bw, bh, 10);
    };
    _drawBtn(false);
    const btnLbl = this.add.text(cx, cy + 115, 'NEXT CASE  →', {
      fontFamily: VI.FONTS.HEADING, fontSize: '18px', color: '#fff',
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, cy + 115, bw, bh).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { _drawBtn(true);  btnLbl.setColor(VI.HEX.GOLD); });
    zone.on('pointerout',   () => { _drawBtn(false); btnLbl.setColor('#fff'); });
    zone.on('pointerup', () => {
      [overlay, panel, headline, btnG, btnLbl, zone].forEach(o => o && o.destroy && o.destroy());
      this.events.emit('game:next_round', this.gs.balance);
      this._startRound();
    });

    // Cameras
    if (win) { this.cameras.main.flash(400, 253, 224, 84, false); }
    else      { this.cameras.main.shake(300, 0.012); }
  }

  // ── Action cards (GDD v0.4 canonical 8) ────────────────────
  // RoundController is math authority; this is scene-side dispatcher.
  _onActionCard(id) {
    // Action cards are being redesigned — disabled for this milestone.
    // Keep the handler so any leftover UI references no-op cleanly.
    return;
    /* eslint-disable no-unreachable */
    if (this.gs.phase !== VI.PHASES.ACCUSE) {
      this.events.emit('game:error', 'Actions only available during the accuse phase');
      return;
    }
    const r = this.gs.round.applyAction(id);
    if (!r) {
      this.events.emit('game:error', 'Action already used this round');
      return;
    }
    if (r.multBet)  { this.gs.bet = Math.round(this.gs.bet * r.multBet); this.events.emit('game:bet_updated', this.gs.bet); }
    if (r.betDelta) { this.gs.bet = Math.max(0, this.gs.bet + r.betDelta); this.events.emit('game:bet_updated', this.gs.bet); }
    if (r.cycleSuspect && this.gs.selectedIdx >= 0) {
      const n = this.gs.round.suspects.length;
      this.gs.selectedIdx = (this.gs.selectedIdx + r.cycleSuspect + n) % n;
      this._refreshSuspectHighlights();
    }
    if (r.lockSuspect)    this._suspectLockedByAction = true;
    if (r.lockFolder)     this.gs.round.lockFolderAt(this._folderPct);
    if (r.burnMultiplier) this._burnMultiplier = r.burnMultiplier;
    if (r.cashOut) { this._cashOutResolve(); return; }
    const actionMeta = MURDER_DATA.actions.find(a => a.id === id) || { short: id, icon: '🃏' };
    this._addClue(`${actionMeta.icon} ${actionMeta.short}: ${r.text}`, VI.HEX.VI_BLUE);
    this.events.emit('game:action_used', id);
  }

  _cashOutResolve() {
    const gs = this.gs;
    if (gs.bet <= 0 || gs.selectedIdx < 0) {
      this._addClue('💸 CASH OUT requires a bet + suspect. Try again.', VI.HEX.MAGENTA);
      gs.round._actionUsed['CASH_OUT'] = false;
      gs.round._cashedOut = false;
      return;
    }
    this._stopTimer();
    // Bet was already deducted on confirm. Credit the cash-out amount in full.
    const payout = gs.round.calculateCashOut(gs.bet, this._folderPct);
    gs.balance   = Math.round(gs.balance + payout);
    this._balanceText.setText(`$${gs.balance.toLocaleString()}`);
    this.events.emit('game:balance_update', gs.balance);
    this._addClue(`💸 CASH OUT: collected $${payout.toLocaleString()}.`, VI.HEX.GOLD);
    this._showResultOverlay(true, payout - gs.bet);
    this.events.emit('game:win', { payout: payout - gs.bet, balance: gs.balance });
    this._setPhase(VI.PHASES.SCOREBOARD);
  }

  _dimSuspect(idx) {
    const s = this._suspectSprites[idx];
    if (!s) return;
    this.tweens.add({ targets: [s.g, s.nameText, s.numText], alpha: 0.22, duration: 300 });
    s.zone.disableInteractive();
  }

  // ── Background & decoration ────────────────────────────────
  _drawBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    bg.fillRect(0, 0, width, height);
    bg.fillStyle(VI.COLORS.CYAN, 0.03);
    bg.fillEllipse(width * 0.75, height * 0.3, 620, 420);
    bg.fillStyle(VI.COLORS.MAGENTA, 0.025);
    bg.fillEllipse(width * 0.2, height * 0.75, 500, 360);
    bg.fillStyle(VI.COLORS.VI_PURPLE, 0.04);
    bg.fillEllipse(width * 0.5, height * 0.55, 720, 520);
    const dot = this.add.graphics();
    dot.fillStyle(VI.COLORS.CYAN, VI.GAME.DOT_OPACITY);
    for (let x = 0; x < width; x += VI.GAME.DOT_SPACING) {
      for (let y = 100; y < height; y += VI.GAME.DOT_SPACING) {
        dot.fillCircle(x, y, VI.GAME.DOT_RADIUS);
      }
    }
    const arc = this.add.graphics();
    arc.lineStyle(3, VI.COLORS.VI_AMBER, 0.12);
    arc.beginPath();
    arc.arc(width * 0.65, height * 1.2, 430, Phaser.Math.DegToRad(222), Phaser.Math.DegToRad(308));
    arc.strokePath();
  }

  _drawMiniDucky(x, y) {
    const g = this.add.graphics();
    g.fillStyle(VI.COLORS.GOLD, 0.92);
    g.fillEllipse(x, y + 4, 30, 22);
    g.fillEllipse(x + 8, y - 10, 18, 16);
    g.fillStyle(VI.COLORS.VI_ORANGE, 1);
    g.fillTriangle(x + 16, y - 10, x + 25, y - 6, x + 16, y - 3);
    g.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    g.fillCircle(x + 10, y - 13, 2.5);
  }
}
