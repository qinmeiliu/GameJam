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
    this._burnStage       = 0;     // 0/1/2/3 — which screen-edge warning we've already fired this round

    // Null out scene-owned game objects so we don't carry stale refs to
    // destroyed Phaser objects from a previous scene instance (we hit
    // this bug class in UIScene — same precaution here).
    this._folderBarG      = null;
    this._folderFlame     = null;
    this._emberEmitter    = null;
    this._folderLabel     = null;
    this._burnVignetteG   = null;
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

    // Right panel — top half = Clue Market (v0.5), bottom half = game log
    this._buildClueMarket();
    this._buildClueFeed();

    // Big case file panel (shown during BETTING phase only)
    this._buildCaseFilePanel();

    // "← LOBBY" back-link, visible only during BETTING so the player can
    // re-pick suspect count before committing a bet.
    this._buildBackToLobbyButton();

    // Screen-edge vignette used to pulse a danger warning when the folder
    // burns past 60/40/25% integrity. Built once, alpha-tweened on demand.
    this._buildBurnVignette();

    // Generate first round
    this._startRound();

    // ── Event bus: listen for UIScene actions ──────────────
    this.events.on('ui:bet_confirmed',  (amt) => this._onBetConfirmed(amt));
    this.events.on('ui:suspect_select', (idx) => this._onSuspectSelect(idx));
    this.events.on('ui:accuse',         ()    => this._onAccuse());
    this.events.on('ui:action_card',    (id)  => this._onActionCard(id));

    // ESC → menu. Stop both running scenes explicitly so they don't leak
    // listeners or stale state into the next Menu → Lobby → GameScene cycle.
    this.input.keyboard.on('keydown-ESC', () => {
      this._stopTimer();
      this.scene.stop('UIScene');
      this.scene.start('MenuScene');
      this.scene.stop('GameScene');
    });

    // Destruction cleanup
    this.events.once('shutdown', () => this._stopTimer());
  }

  update(time) {
    // Animated wobbling flame at the folder-burn edge. Burn math itself
    // is still driven by the 250ms _burnTick — this is purely visual.
    this._drawFolderFlame(time);
  }

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
    this._burnStage      = 0;
    if (this._burnVignetteG) {
      this.tweens.killTweensOf(this._burnVignetteG);
      this._burnVignetteG.clear();
      this._burnVignetteG.setAlpha(0);
    }

    // Destroy every overlay/badge created during the previous round, so
    // the scoreboard, killer marker, etc. don't bleed into the new case.
    //
    // Belt + suspenders: BOTH the explicit array AND a Phaser Container
    // are walked. The Container is the authoritative cleanup path because
    // its destroy() cascades to ALL children regardless of whether they
    // were also pushed into the array.
    if (this._roundOverlayObjs) {
      this._roundOverlayObjs.forEach(o => { if (o && o.destroy && !o.destroyed) {
        try { o.destroy(); } catch (e) { /* swallow — keep cleanup going */ }
      }});
    }
    this._roundOverlayObjs = [];

    if (this._roundContainer && this._roundContainer.scene) {
      // Container.destroy() removes the container AND all children by default
      try { this._roundContainer.destroy(); } catch (e) { /* ignore */ }
    }
    this._roundContainer = this.add.container(0, 0);
    // Pin the round container to a high depth so scoreboard overlays
    // (and the KILLER badge) render on top of suspect tokens, regardless
    // of when the container was added relative to the rest of the scene.
    this._roundContainer.setDepth(1000);

    this._refreshCasePanel();
    this._refreshSuspects();
    this._refreshFolderBar();
    this._clearClueFeed();
    this._resetClueMarket();          // reset clue cards + no-clue bonus indicator

    // Swap the room background image to match this round's room. Crossfades
    // from the previous round's room art; falls back to vector-only if the
    // texture for this room isn't loaded.
    this._setRoomBackground(gs.round.roomId);

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
    this._setBackButtonVisible(true);   // re-pick suspects available only here
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
    this._setBackButtonVisible(false);  // bet is locked; can no longer abandon
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
    this._addClue('🎲 The cards are dealt. Buy clues, or stay clueless for +20%.', VI.HEX.CYAN);

    // Open the Clue Market (top half of right panel)
    this._setClueMarketVisible(true);
    this._refreshClueCard(0);
    this._refreshClueCard(1);
    this._updateNoClueBonusIndicator();

    // Folder burn timer — ticks every 250ms
    this._stopTimer();
    this._burnTimer = this.time.addEvent({
      delay: 250, loop: true,
      callback: this._burnTick, callbackScope: this,
    });

    // v0.5: clues no longer auto-reveal. They're purchase-on-demand via the
    // Clue Market. We just keep the Last Call alert as a soft timer warning.
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
      // Stop the idle breath yoyo before fading — otherwise the breath tween
      // will keep tweening this.g.alpha back to ~0.86 and fight the dim.
      if (wrongSpr.breathTween) { wrongSpr.breathTween.stop(); wrongSpr.breathTween = null; }
      this._clearSuspectSparkles(wrongSpr);

      // Vacuum-suck execution: silhouette shrinks + spins toward the floor,
      // hex + name slump down and dim. More dramatic than the old straight
      // alpha fade and tells the player "this one is OUT, not just dimmed."
      this.tweens.add({
        targets: wrongSpr.silG,
        scaleX: 0.25, scaleY: 0.25,
        rotation: 0.45,
        alpha: 0.10,
        duration: 520, ease: 'Cubic.easeIn',
      });
      this.tweens.add({
        targets: [wrongSpr.g, wrongSpr.nameText],
        alpha: 0.15,
        y: '+=22',
        duration: 520, ease: 'Cubic.easeIn',
      });
      // Magenta impact ring at the execution site — same helper used on
      // the reveal landings, recolored to "guilty/wrong" magenta.
      this._spawnHexImpact(wrongSpr.cx, wrongSpr.cy, wrongSpr.tokenR, VI.COLORS.MAGENTA);

      // Hide their quote bubble for good
      if (wrongSpr.bubbleG)    wrongSpr.bubbleG.setVisible(false);
      if (wrongSpr.bubbleText) wrongSpr.bubbleText.setVisible(false);
      wrongSpr.zone.disableInteractive();
    }

    // Survivors get a brief "still in the running" tension pulse —
    // a quick scale-up on the silhouette + impact ring in their own
    // brand color, so the player's eye refocuses on who's left.
    this._suspectSprites.forEach((s, i) => {
      if (i === wrongIdx) return;
      this.tweens.add({
        targets: s.silG,
        scaleX: { from: s.silG.scaleX * 1.18, to: s.silG.scaleX },
        scaleY: { from: s.silG.scaleY * 1.18, to: s.silG.scaleY },
        duration: 420, delay: 220 + i * 60,
        ease: 'Back.Out',
      });
      // Re-impact ring fires shortly after the wrong-suspect drop so the
      // "still alive" beat lands as the executed one is sinking.
      this.time.delayedCall(220 + i * 60, () => {
        if (this.gs.phase !== VI.PHASES.SECOND_CHANCE) return;  // bail if we already moved on
        this._spawnHexImpact(s.cx, s.cy, s.tokenR, s.sus.color);
      });
    });
    this._addClue(`❌ WRONG! ${gs.round.suspects[wrongIdx].name} is innocent.`, VI.HEX.MAGENTA);
    this._addClue('🎲 SECOND CHANCE — folder burns 3× faster, 15s left!', VI.HEX.VI_ORANGE);
    this._addClue('🔒 Clue Market closed. Trust your gut.', VI.HEX.CYAN);

    // v0.5: clue market freezes — no late buys, purchased clues stay visible
    this._freezeClueMarket();

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

    // Screen-edge warning pulses at each burn threshold crossed. _burnStage
    // tracks the highest stage we've already fired so each pulse plays once
    // per round (a clue-buy or PRESS card won't replay them).
    const pct = this._folderPct;
    const newStage =
      pct <= 0.25 ? 3 :
      pct <= 0.40 ? 2 :
      pct <= 0.60 ? 1 : 0;
    if (newStage > this._burnStage) {
      this._burnStage = newStage;
      this._pulseBurnVignette(newStage);
    }

    if (this._folderPct <= floor && !this._timerExpired) {
      this._timerExpired = true;
      this._addClue('⏰ TIME OUT — folder at minimum. Accuse now!', VI.HEX.VI_RED);
      this.events.emit('game:timeout');
    }
  }

  // ── Burn-warning screen vignette ───────────────────────────
  // Stacked stroked rects at the screen edges, painted on-demand in the
  // stage's danger color. Alpha-tweens 0 → 1 → 0 in ~720ms to give a
  // single "warning flash" feel without persistent visual noise.
  _buildBurnVignette() {
    this._burnVignetteG = this.add.graphics();
    this._burnVignetteG.setAlpha(0);
    this._burnVignetteG.setDepth(900);   // above gameplay, below modals
  }
  _pulseBurnVignette(stage) {
    if (!this._burnVignetteG) return;
    const color =
      stage === 1 ? VI.COLORS.VI_AMBER  :
      stage === 2 ? VI.COLORS.VI_ORANGE :
                    VI.COLORS.VI_RED;
    const W = this.scale.width;
    const H = this.scale.height;
    this._burnVignetteG.clear();
    // Outer-to-inner glow bands. Thicker outer = softer falloff.
    [
      { t: 60, a: 0.06 },
      { t: 40, a: 0.16 },
      { t: 22, a: 0.30 },
      { t: 8,  a: 0.55 },
    ].forEach(({ t, a }) => {
      this._burnVignetteG.lineStyle(t, color, a);
      this._burnVignetteG.strokeRect(t / 2, t / 2, W - t, H - t);
    });
    this.tweens.killTweensOf(this._burnVignetteG);
    this._burnVignetteG.setAlpha(0);
    this.tweens.add({
      targets: this._burnVignetteG,
      alpha: { from: 0, to: 1 },
      duration: 180, ease: 'Cubic.easeOut',
      yoyo: true, hold: 80,
      // After yoyo, also do a soft second beat for stages 2 and 3 to escalate the urgency.
      onComplete: () => {
        if (stage >= 2) {
          this.tweens.add({
            targets: this._burnVignetteG,
            alpha: { from: 0, to: 0.55 },
            duration: 220, ease: 'Sine.easeInOut',
            yoyo: true, delay: 80,
          });
        }
      },
    });
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

    // Track (dark base)
    const track = this.add.graphics();
    track.fillStyle(VI.COLORS.PANEL_SURFACE, 1);
    track.fillRect(0, by, width, bh);

    // Filled portion + sheen
    this._folderBarG  = this.add.graphics();

    // Vector flame at the burning edge — wobbles per frame
    this._folderFlame = this.add.graphics();
    this._folderFlame.setDepth(20);

    // Ember particle texture (generated once at scene start)
    if (!this.textures.exists('emberDot')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture('emberDot', 6, 6);
      g.destroy();
    }

    // Ember emitter at the burning edge. Phaser auto-cleans on scene shutdown.
    this._emberEmitter = this.add.particles(0, by + bh / 2, 'emberDot', {
      speed:    { min: 30, max: 80 },
      angle:    { min: -110, max: -70 },   // mostly upward, slight spread
      scale:    { start: 0.7, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: 700,
      frequency: -1,                       // dormant until ACCUSE starts
      tint:     [0xff5500, 0xff9900, 0xfde054],
      blendMode: 'ADD',
    });
    this._emberEmitter.setDepth(21);

    this._folderLabel = this.add.text(width / 2, by + bh / 2, 'FOLDER INTEGRITY  100%', {
      fontFamily: VI.FONTS.MONO, fontSize: '9px', color: VI.HEX.CYAN, alpha: 0.5,
    }).setOrigin(0.5);

    this._refreshFolderBar();
  }

  _refreshFolderBar() {
    const { width } = this.scale;
    const pct = this._folderPct != null ? this._folderPct : 1.0;
    const by  = 84, bh = 10;

    // Bar color shifts as integrity drains. 3 stages: healthy → warm → critical.
    const col  = pct > 0.6 ? VI.COLORS.CYAN : pct > 0.3 ? VI.COLORS.VI_ORANGE : VI.COLORS.VI_RED;
    const lcol = pct > 0.6 ? VI.HEX.CYAN    : pct > 0.3 ? VI.HEX.VI_ORANGE    : VI.HEX.VI_RED;

    // Filled portion + top sheen for "wet" highlight
    const filledW = Math.max(0, width * pct);
    this._folderBarG.clear();
    this._folderBarG.fillStyle(col, 0.85);
    this._folderBarG.fillRect(0, by, filledW, bh);
    this._folderBarG.fillStyle(0xffffff, 0.18);
    this._folderBarG.fillRect(0, by, filledW, 2);

    // Configure particle emitter intensity per stage. Disabled while at 100%
    // (folder hasn't ignited) and during SCOREBOARD.
    if (this._emberEmitter) {
      const burning = pct < 1.0 && this.gs && this.gs.phase !== VI.PHASES.SCOREBOARD;
      if (burning) {
        // More embers as the folder approaches the floor — casino-slot lively
        const freq = pct > 0.6 ? 140 : pct > 0.3 ? 80 : 40;
        this._emberEmitter.setFrequency(freq);
        this._emberEmitter.setPosition(filledW, by + bh / 2);
      } else {
        this._emberEmitter.setFrequency(-1);   // dormant
      }
    }

    this._folderLabel.setText(`FOLDER INTEGRITY  ${Math.round(pct * 100)}%`).setColor(lcol);
    this._updateTimerText();
  }

  // Animated wobbling flame at the burning edge. Called from update() at
  // ~30Hz so the flame always feels alive (independent of the 250ms burn tick).
  _drawFolderFlame(now) {
    if (!this._folderFlame) return;
    const { width } = this.scale;
    const pct = this._folderPct != null ? this._folderPct : 1.0;
    const by  = 84, bh = 10;
    this._folderFlame.clear();

    // Only render flame when folder is actively burning (ACCUSE / SECOND_CHANCE)
    const burning = pct < 1.0 && this.gs && this.gs.phase !== VI.PHASES.SCOREBOARD;
    if (!burning) return;

    const edgeX  = width * pct;
    const t      = now * 0.008;
    const stage  = pct > 0.6 ? 0.7 : pct > 0.3 ? 1.0 : 1.4;   // taller flames at low integrity
    const flameW = 16;
    const flameH = 18 * stage;

    // Outer flame — dark red, broadest base
    this._folderFlame.fillStyle(0xff2200, 0.75);
    this._folderFlame.fillTriangle(
      edgeX - flameW / 2,            by + bh,
      edgeX + flameW / 2,            by + bh,
      edgeX + Math.sin(t)     * 3,   by - flameH
    );
    // Middle flame — orange, swirls counter-phase
    this._folderFlame.fillStyle(0xff8800, 0.85);
    this._folderFlame.fillTriangle(
      edgeX - flameW / 3,            by + bh,
      edgeX + flameW / 3,            by + bh,
      edgeX + Math.sin(t + 1) * 2,   by - flameH * 0.7
    );
    // Core flame — yellow-gold, smallest + brightest
    this._folderFlame.fillStyle(VI.COLORS.GOLD, 1);
    this._folderFlame.fillTriangle(
      edgeX - flameW / 5,            by + bh,
      edgeX + flameW / 5,            by + bh,
      edgeX + Math.sin(t + 2) * 1.5, by - flameH * 0.4
    );

    // Bright dot at the very tip — the "ember crown"
    this._folderFlame.fillStyle(0xffffff, 0.85);
    this._folderFlame.fillCircle(
      edgeX + Math.sin(t + 2) * 1.5,
      by - flameH * 0.4 - 1,
      1.5
    );
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
      // Kill any in-flight tweens before destroying targets — Phaser will
      // null-deref a tween whose target was already destroyed.
      if (s.breathTween)  s.breathTween.stop();
      if (s.sparkleTween) s.sparkleTween.stop();
      if (s.sparkles) s.sparkles.forEach(sp => sp.destroy());
      [s.g, s.nameText, s.highlightG, s.zone, s.silG, s.bubbleG, s.bubbleText]
        .forEach(o => { if (o) o.destroy(); });
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

      // Character silhouette inside the hex (replaces the bare number).
      // Drawn at origin so we can position + scale the graphics cleanly.
      const silG = this.add.graphics();
      this._drawSuspectSilhouette(silG, sus);
      silG.setPosition(cx, cy);
      // Reference scale matches the Lobby seat hex (r≈46). Scale up/down
      // for the game-scene tokenR so silhouettes always fill their hex.
      silG.setScale(tokenR / 46);

      const nameText = this.add.text(cx, cy + tokenR + 14, sus.name.toUpperCase(), {
        fontFamily: VI.FONTS.HEADING, fontSize: '13px',
        color: VI.HEX.CREAM, stroke: '#000', strokeThickness: 3, letterSpacing: 2,
      }).setOrigin(0.5);

      // ── Hover quote bubble (built hidden) ──────────────────
      const bubbleW = Math.min(260, cellW - 12);
      const bubbleH = 92;
      const bubbleX = cx;
      const bubbleY = cy - tokenR - 64;
      const bubbleG = this.add.graphics();
      const drawBubble = () => {
        bubbleG.clear();
        bubbleG.fillStyle(VI.COLORS.PANEL_SURFACE, 0.97);
        bubbleG.fillRoundedRect(bubbleX - bubbleW/2, bubbleY - bubbleH/2, bubbleW, bubbleH, 10);
        bubbleG.lineStyle(8, sus.color, 0.10);
        bubbleG.strokeRoundedRect(bubbleX - bubbleW/2, bubbleY - bubbleH/2, bubbleW, bubbleH, 10);
        bubbleG.lineStyle(2, sus.color, 0.85);
        bubbleG.strokeRoundedRect(bubbleX - bubbleW/2, bubbleY - bubbleH/2, bubbleW, bubbleH, 10);
        // Tail pointing down to the token
        bubbleG.fillStyle(VI.COLORS.PANEL_SURFACE, 0.97);
        bubbleG.fillTriangle(
          bubbleX - 8, bubbleY + bubbleH/2,
          bubbleX + 8, bubbleY + bubbleH/2,
          bubbleX,     bubbleY + bubbleH/2 + 10
        );
        bubbleG.lineStyle(2, sus.color, 0.85);
        bubbleG.lineBetween(bubbleX - 8, bubbleY + bubbleH/2, bubbleX, bubbleY + bubbleH/2 + 10);
        bubbleG.lineBetween(bubbleX + 8, bubbleY + bubbleH/2, bubbleX, bubbleY + bubbleH/2 + 10);
      };
      drawBubble();

      const bubbleText = this.add.text(bubbleX, bubbleY, sus.alibi || '…', {
        fontFamily: VI.FONTS.BODY, fontSize: '13px',
        color: VI.HEX.CREAM, align: 'center', fontStyle: 'italic',
        wordWrap: { width: bubbleW - 24 }, lineSpacing: 3,
      }).setOrigin(0.5);

      bubbleG.setAlpha(0);
      bubbleText.setAlpha(0);

      // ── Hit zone (always interactive; handlers phase-gate themselves) ──
      const zone = this.add.zone(cx, cy, cellW - 8, cellH - 8).setInteractive({ cursor: 'pointer' });

      const showBubble = () => {
        this.tweens.killTweensOf([bubbleG, bubbleText]);
        this.tweens.add({ targets: [bubbleG, bubbleText], alpha: 1, duration: 140, ease: 'Cubic.easeOut' });
      };
      const hideBubble = () => {
        this.tweens.killTweensOf([bubbleG, bubbleText]);
        this.tweens.add({ targets: [bubbleG, bubbleText], alpha: 0, duration: 140, ease: 'Cubic.easeIn' });
      };

      zone.on('pointerover', () => {
        // Only respond once suspects are revealed.
        if (this.gs.phase !== VI.PHASES.ACCUSE && this.gs.phase !== VI.PHASES.SECOND_CHANCE) return;
        if (this.gs.selectedIdx !== idx) {
          highlightG.clear();
          highlightG.lineStyle(2, VI.COLORS.GOLD, 0.5);
          highlightG.strokeCircle(cx, cy, tokenR + 8);
        }
        showBubble();
      });
      zone.on('pointerout', () => {
        if (this.gs.selectedIdx !== idx) highlightG.clear();
        hideBubble();
      });
      zone.on('pointerup', () => {
        if (this.gs.phase !== VI.PHASES.ACCUSE && this.gs.phase !== VI.PHASES.SECOND_CHANCE) return;
        this.gs.selectedIdx = idx;
        this._refreshSuspectHighlights();
        this.events.emit('game:suspect_selected', { idx, suspect: sus });
      });

      // Suspects start hidden — they reveal when ACCUSE phase begins.
      [g, silG, nameText].forEach(o => o.setAlpha(0));

      // No clicks until the reveal animation finishes — prevents the player
      // from accidentally locking in a guess on a mid-air hex.
      zone.disableInteractive();

      // Track original landing positions so the casino-slot drop can shift
      // each visual UP by a fixed amount and tween cleanly back DOWN.
      // (Graphics drawn at world coords still respond to gameObject.y.)
      const baseG_Y        = g.y;
      const baseSilG_Y     = silG.y;
      const baseNameText_Y = nameText.y;

      this._suspectSprites.push({
        g, silG, nameText, highlightG, zone,
        bubbleG, bubbleText,
        cx, cy, tokenR, idx, sus,
        // visual state slots
        baseG_Y, baseSilG_Y, baseNameText_Y,
        sparkles:    [],      // orbiting gold dots when selected
        sparkleTween: null,
        breathTween: null,
        revealed:    false,
      });
    });
  }

  // Casino-slot reveal — each suspect drops from above with a bounce, fades
  // up, fires a brand-color impact ring on landing, then starts breathing.
  // Replaces the bare alpha fade so the ACCUSE moment hits like a slot pull.
  _revealSuspects() {
    const DROP        = 260;   // px above final position
    const DROP_MS     = 520;
    const STAGGER_MS  = 90;

    this._suspectSprites.forEach((s, i) => {
      // Shift up to start position. We move ALL three so the hex + silhouette
      // + name drop together as a unit.
      s.g.y        = s.baseG_Y        - DROP;
      s.silG.y     = s.baseSilG_Y     - DROP;
      s.nameText.y = s.baseNameText_Y - DROP;

      const delay = i * STAGGER_MS;

      // Position drop with bounce
      this.tweens.add({
        targets: [s.g, s.silG, s.nameText],
        y: `+=${DROP}`,
        duration: DROP_MS,
        delay,
        ease: 'Bounce.Out',
        onComplete: () => {
          // Land flash — bright brand-color ring expanding from the hex
          this._spawnHexImpact(s.cx, s.cy, s.tokenR, s.sus.color);
          // Re-arm interactivity
          s.zone.setInteractive({ cursor: 'pointer' });
          s.revealed = true;
          // Start idle breathing pulse on the hex outline
          s.breathTween = this.tweens.add({
            targets: s.g,
            alpha: { from: 1.0, to: 0.86 },
            duration: 1400 + (i * 90),   // detune per-suspect so they don't pulse in unison
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
          });
        },
      });

      // Alpha rise rides the first 60% of the drop — they emerge as they fall.
      this.tweens.add({
        targets: [s.g, s.silG, s.nameText],
        alpha: 1,
        duration: Math.floor(DROP_MS * 0.6),
        delay,
        ease: 'Cubic.easeOut',
      });
    });
  }

  // Brief radial pop at a hex landing site. Two stacked rings — a fat
  // brand-color halo + a thin bright outline — expand and fade in 380ms.
  _spawnHexImpact(cx, cy, r, color) {
    const ring = this.add.graphics();
    let scale = 1.0;
    let alpha = 0.95;
    const startR = r * 0.9;
    const draw = () => {
      ring.clear();
      ring.lineStyle(14, color, alpha * 0.35);
      ring.strokeCircle(cx, cy, startR * scale);
      ring.lineStyle(2, 0xffffff, alpha);
      ring.strokeCircle(cx, cy, startR * scale);
    };
    draw();
    this.tweens.add({
      targets: { s: 1.0, a: 0.95 },
      s: 2.2, a: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onUpdate: (tw, tgt) => { scale = tgt.s; alpha = tgt.a; draw(); },
      onComplete: () => ring.destroy(),
    });
  }

  // GDD-spec character silhouettes — drawn at origin so the caller can
  // setPosition(cx, cy) + setScale() to fit whatever hex size we end up
  // with for a given suspect count. Same visual language as the Lobby.
  _drawSuspectSilhouette(g, char) {
    const c = char.color;
    g.fillStyle(c, 0.9);
    switch (char.id) {
      case 'butler': {
        g.fillCircle(0, -13, 6);
        g.fillRect(-8, -5, 16, 22);
        g.fillTriangle(-8, -4, 0, 1, -8, 4);
        g.fillTriangle( 8, -4, 0, 1,  8, 4);
        break;
      }
      case 'chef': {
        g.fillEllipse(0, -22, 14, 8);
        g.fillRect(-6, -22, 12, 10);
        g.fillCircle(0, -10, 7);
        g.fillRect(-12, -3, 24, 20);
        break;
      }
      case 'mayor': {
        g.fillRect(-9, -24, 18, 4);
        g.fillRect(-6, -32, 12, 10);
        g.fillCircle(0, -14, 5);
        g.fillRect(-13, -7, 26, 22);
        break;
      }
      case 'janitor': {
        g.fillCircle(0, -12, 6);
        g.fillRect(-8, -5, 16, 22);
        g.lineStyle(2, c, 1);
        g.lineBetween(4, -4, 18, -22);
        g.fillStyle(c, 0.7); g.fillCircle(18, -22, 4); g.fillStyle(c, 0.9);
        break;
      }
      case 'count': {
        g.fillTriangle(-18, 18, 18, 18, 0, -10);
        g.fillStyle(0x000000, 0.35); g.fillCircle(0, -13, 7);
        g.fillStyle(c, 0.95);        g.fillCircle(0, -13, 6);
        g.fillRect(-7, -5, 14, 22);
        break;
      }
      case 'mime': {
        g.fillCircle(-2, -18, 7);
        g.fillCircle(0, -12, 6);
        g.fillRect(-5, -5, 10, 22);
        g.fillStyle(0x000000, 0.4);
        g.fillRect(-5, 2, 10, 2);
        g.fillRect(-5, 8, 10, 2);
        g.fillStyle(c, 0.9);
        break;
      }
      case 'duchess': {
        g.fillTriangle(-4, -22, 4, -22, 0, -30);
        g.fillRect(-5, -22, 10, 6);
        g.fillCircle(0, -14, 6);
        g.fillTriangle(-10, -5, 10, -5, 0, 5);
        g.fillTriangle(-11, 18, 11, 18, 0, 5);
        g.fillTriangle(11, 2, 18, -2, 16, 6);
        break;
      }
      case 'librarian': {
        g.fillCircle(0, -13, 6);
        g.fillRect(-8, -5, 16, 22);
        g.fillRect(8, -4, 10, 4);
        g.fillRect(8,  1, 10, 4);
        g.fillRect(8,  6, 10, 4);
        g.fillStyle(0x000000, 0.5);
        g.fillCircle(-2, -13, 2);
        g.fillCircle( 2, -13, 2);
        g.fillStyle(c, 0.9);
        break;
      }
      default:
        g.fillCircle(0, -12, 8);
        g.fillRect(-10, -4, 20, 22);
    }
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
    this._suspectSprites.forEach((s) => {
      const { highlightG, cx, cy, tokenR, idx } = s;
      highlightG.clear();
      // Always tear down old sparkles before deciding what to draw — selection
      // can jump from one suspect to another in a single click.
      this._clearSuspectSparkles(s);

      if (idx === sel) {
        highlightG.lineStyle(3, VI.COLORS.GOLD, 1);
        highlightG.strokeCircle(cx, cy, tokenR + 12);
        highlightG.lineStyle(10, VI.COLORS.GOLD, 0.18);
        highlightG.strokeCircle(cx, cy, tokenR + 16);
        this._spawnSuspectSparkles(s);
      }
    });
  }

  // 5 small gold dots orbiting the selected hex. Tweens a phase counter and
  // re-positions the dots each onUpdate so they slowly rotate clockwise.
  // Also gently pulses their alpha so they twinkle.
  _spawnSuspectSparkles(s) {
    const N = 5;
    const orbitR = s.tokenR + 24;
    const angleOffset = Math.PI * 2 / N;
    for (let i = 0; i < N; i++) {
      const dot = this.add.graphics();
      dot.fillStyle(VI.COLORS.GOLD, 1);
      dot.fillCircle(0, 0, 2.4);
      dot.fillStyle(VI.COLORS.GOLD, 0.30);
      dot.fillCircle(0, 0, 5.5);
      dot.x = s.cx;
      dot.y = s.cy;
      s.sparkles.push(dot);
    }

    // Single tween drives the orbit phase from 0 -> 2π; onUpdate positions
    // every dot, so we don't pay for 5 separate tweens.
    const tgt = { phase: 0 };
    s.sparkleTween = this.tweens.add({
      targets: tgt,
      phase: Math.PI * 2,
      duration: 5200,
      repeat: -1,
      ease: 'Linear',
      onUpdate: () => {
        s.sparkles.forEach((dot, i) => {
          const a = tgt.phase + angleOffset * i;
          dot.x = s.cx + Math.cos(a) * orbitR;
          dot.y = s.cy + Math.sin(a) * orbitR;
          // Twinkle alpha — peaks at the "front" of the orbit nearest the camera.
          dot.alpha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(a * 2 + tgt.phase * 3));
        });
      },
    });
  }

  _clearSuspectSparkles(s) {
    if (s.sparkleTween) { s.sparkleTween.stop(); s.sparkleTween = null; }
    if (s.sparkles) {
      s.sparkles.forEach(sp => sp.destroy());
      s.sparkles = [];
    }
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
    // Case number is randomized per round in _showCaseFile — start with a
    // placeholder so the panel renders correctly before the first round lands.
    this._cfCaseNum = this.add.text(cx + pw/2 - 28, cy - ph/2 + 26, '#000', {
      fontFamily: VI.FONTS.MONO, fontSize: '13px',
      color: VI.HEX.CYAN, alpha: 0.6,
    }).setOrigin(1, 0);
    const caseNum = this._cfCaseNum;

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
    // Stash the pulse tween so _hideCaseFile can kill it. Otherwise the
    // looping alpha tween fights the fade-out and the CTA never disappears.
    this._cfCTAPulse = this.tweens.add({
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
    // Fresh case number every round — 3-digit feels right for "case file" vibe,
    // skipping 000 so the panel never reads "#000". Padded to 3 digits.
    if (this._cfCaseNum) {
      const n = 1 + Math.floor(Math.random() * 999);
      this._cfCaseNum.setText('#' + String(n).padStart(3, '0'));
    }

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
    // Kill the CTA pulse — otherwise it loops alpha 0.6→1 and the fade fails.
    if (this._cfCTAPulse) { this._cfCTAPulse.stop(); this._cfCTAPulse = null; }
    this._caseFileElements.forEach(e => {
      this.tweens.killTweensOf(e);
      this.tweens.add({
        targets: e, alpha: 0,
        duration: 220, ease: 'Cubic.easeIn',
      });
    });
  }

  // ── Back-to-Lobby button (BETTING phase only) ──────────────
  // Lets the player abandon the current case and return to Lobby to
  // re-pick suspect count. Hidden the moment a bet is locked in
  // (ACCUSE onwards) since that decision is no longer reversible.
  _buildBackToLobbyButton() {
    const x = 24, y = 102;            // top-left, just below the case header bar
    const bw = 130, bh = 32;
    // Extra hit padding around the visual rect — the visible button sits
    // in the same vertical band where suspect zones eventually appear, and
    // those zones (default depth 0) used to swallow clicks. We give the
    // back button a high depth AND a slightly larger hit zone for forgiveness.
    const hitPadX = 10, hitPadY = 10;

    const g = this.add.graphics();
    const drawNormal = () => {
      g.clear();
      g.fillStyle(VI.COLORS.PANEL_SURFACE, 0.92);
      g.fillRoundedRect(x, y, bw, bh, 6);
      g.lineStyle(1, VI.COLORS.CYAN, 0.45);
      g.strokeRoundedRect(x, y, bw, bh, 6);
    };
    const drawHover = () => {
      g.clear();
      g.fillStyle(VI.COLORS.PANEL_SURFACE, 1);
      g.fillRoundedRect(x, y, bw, bh, 6);
      g.lineStyle(2, VI.COLORS.CYAN, 1);
      g.strokeRoundedRect(x, y, bw, bh, 6);
    };
    drawNormal();

    const lbl = this.add.text(x + bw / 2, y + bh / 2, '←  LOBBY', {
      fontFamily: VI.FONTS.HEADING, fontSize: '12px',
      color: VI.HEX.CYAN, letterSpacing: 4,
    }).setOrigin(0.5);

    const zone = this.add.zone(
      x + bw / 2, y + bh / 2,
      bw + hitPadX * 2, bh + hitPadY * 2,
    ).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover', () => { drawHover();  lbl.setColor(VI.HEX.GOLD); });
    zone.on('pointerout',  () => { drawNormal(); lbl.setColor(VI.HEX.CYAN); });
    zone.on('pointerup', () => {
      // Clean transition back to Lobby. Stop UIScene AND GameScene
      // explicitly — `scene.start('LobbyScene')` alone leaves GameScene
      // running in the background, which causes flow weirdness when the
      // player later returns and starts a fresh game.
      const balance = this.gs.balance;
      this._stopTimer();
      this.scene.stop('UIScene');
      this.scene.start('LobbyScene', { balance });
      this.scene.stop('GameScene');
    });

    // Render above suspect tokens (default depth 0) so clicks in the
    // overlap zone (y=110-134) actually land on the back button.
    g.setDepth(50);
    lbl.setDepth(51);
    zone.setDepth(52);

    this._backBtnRefs = [g, lbl, zone];
    this._setBackButtonVisible(false);  // hidden until BETTING enter
  }

  _setBackButtonVisible(visible) {
    if (!this._backBtnRefs) return;
    this._backBtnRefs.forEach(o => {
      if (o && typeof o.setVisible === 'function') o.setVisible(visible);
    });
  }

  // ── Game-log feed (bottom half of right panel, v0.5) ───────
  // The old "clue feed" is now just a running game-message log. The
  // top half of the right panel hosts the v0.5 Clue Market built by
  // _buildClueMarket below.

  _buildClueFeed() {
    const { width } = this.scale;
    const fx = Math.round(width * 0.64), fy = 370;       // moved down — top half is Clue Market
    const fw = width - fx - 16, fh = 260;

    const bg = this.add.graphics();
    bg.fillStyle(VI.COLORS.PANEL_SURFACE, 0.75);
    bg.fillRoundedRect(fx, fy, fw, fh, 8);
    bg.lineStyle(1, VI.COLORS.CYAN, 0.18);
    bg.strokeRoundedRect(fx, fy, fw, fh, 8);

    this.add.text(fx + fw / 2, fy + 16, 'GAME LOG', {
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

  // ── Clue Market (top half of right panel, v0.5) ────────────
  // Two purchaseable clue cards + a No-Clue Bonus indicator. Player
  // buys 0-2 clues during ACCUSE. Market freezes on SECOND_CHANCE
  // entry. State is driven by the RoundController.clues array and
  // RoundController.cluesPurchased counter.

  _buildClueMarket() {
    const { width } = this.scale;
    const fx = Math.round(width * 0.64), fy = 100;
    const fw = width - fx - 16, fh = 260;

    const bg = this.add.graphics();
    bg.fillStyle(VI.COLORS.PANEL_SURFACE, 0.75);
    bg.fillRoundedRect(fx, fy, fw, fh, 8);
    bg.lineStyle(1, VI.COLORS.GOLD, 0.30);
    bg.strokeRoundedRect(fx, fy, fw, fh, 8);

    const titleLbl = this.add.text(fx + fw / 2, fy + 16, 'CLUE MARKET', {
      fontFamily: VI.FONTS.HEADING, fontSize: '13px',
      color: VI.HEX.GOLD, letterSpacing: 6,
      shadow: { blur: 8, color: VI.HEX.GOLD, fill: true },
    }).setOrigin(0.5);

    // No-Clue Bonus indicator (pulses while active; greyed once any clue bought)
    this._noClueBonusLbl = this.add.text(fx + fw / 2, fy + 40, '✨  NO-CLUE BONUS  ×1.20', {
      fontFamily: VI.FONTS.HEADING, fontSize: '11px',
      color: VI.HEX.GOLD, letterSpacing: 4,
    }).setOrigin(0.5);
    this._noClueBonusPulse = this.tweens.add({
      targets: this._noClueBonusLbl,
      alpha: { from: 0.55, to: 1 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const sep = this.add.graphics();
    sep.lineStyle(1, VI.COLORS.GOLD, 0.20);
    sep.lineBetween(fx + 10, fy + 56, fx + fw - 10, fy + 56);

    // Two stacked cards
    this._clueCards = [
      this._buildClueCard(0, fx + 10, fy + 68,  fw - 20, 88),
      this._buildClueCard(1, fx + 10, fy + 162, fw - 20, 88),
    ];
    // Track every panel-chrome element so visibility toggles in lockstep
    this._clueMarketChrome = [bg, titleLbl, this._noClueBonusLbl, sep];
    this._clueMarketFrozen = false;
    this._marketVisible    = false;
    this._setClueMarketVisible(false);   // hidden until ACCUSE
  }

  _buildClueCard(idx, x, y, w, h) {
    const bg = this.add.graphics();
    bg.fillStyle(VI.COLORS.FLOOD_BLACK, 0.6);
    bg.fillRoundedRect(x, y, w, h, 6);
    bg.lineStyle(1, VI.COLORS.CYAN, 0.40);
    bg.strokeRoundedRect(x, y, w, h, 6);

    const headerLbl = this.add.text(x + 12, y + 10, `🔒 CLUE #${idx + 1}`, {
      fontFamily: VI.FONTS.HEADING, fontSize: '12px',
      color: VI.HEX.CYAN, letterSpacing: 4,
    });

    // BUY button (top-right of card)
    const btnW = 110, btnH = 30;
    const btnX = x + w - 14 - btnW;
    const btnY = y + 10;
    const btnG = this.add.graphics();
    const btnLbl = this.add.text(btnX + btnW/2, btnY + btnH/2, 'BUY  $—', {
      fontFamily: VI.FONTS.HEADING, fontSize: '12px',
      color: VI.HEX.GOLD, letterSpacing: 3,
    }).setOrigin(0.5);
    const drawBtn = (hover) => {
      btnG.clear();
      btnG.fillStyle(hover ? VI.COLORS.MAGENTA : VI.COLORS.VI_PURPLE, 1);
      btnG.fillRoundedRect(btnX, btnY, btnW, btnH, 5);
      btnG.lineStyle(1, VI.COLORS.GOLD, hover ? 1 : 0.7);
      btnG.strokeRoundedRect(btnX, btnY, btnW, btnH, 5);
    };
    drawBtn(false);

    const btnZone = this.add.zone(btnX + btnW/2, btnY + btnH/2, btnW, btnH).setInteractive({ cursor: 'pointer' });
    btnZone.on('pointerover', () => drawBtn(true));
    btnZone.on('pointerout',  () => drawBtn(false));
    btnZone.on('pointerup',   () => this._tryBuyClue(idx));

    // Clue text — hidden until card is bought
    const clueText = this.add.text(x + 12, y + 46, '', {
      fontFamily: VI.FONTS.BODY, fontSize: '12px',
      color: VI.HEX.CREAM, alpha: 0.92, fontStyle: 'italic',
      wordWrap: { width: w - 24 }, lineSpacing: 2,
    });

    return { idx, bg, headerLbl, btnG, btnLbl, btnZone, clueText };
  }

  _tryBuyClue(idx) {
    if (this.gs.phase !== VI.PHASES.ACCUSE) return;
    if (this._clueMarketFrozen) return;
    const r = this.gs.round;
    if (!r || !r.clues[idx] || r.clues[idx].bought) return;
    if (this.gs.bet <= 0) {
      this.events.emit('game:error', 'Place a bet before buying clues');
      return;
    }
    const cost = r.getClueCost(this.gs.bet);
    if (cost > this.gs.balance) {
      this.events.emit('game:error', `Need $${cost} to buy this clue`);
      return;
    }
    // Deduct from balance immediately
    this.gs.balance -= cost;
    this._balanceText.setText(`$${this.gs.balance.toLocaleString()}`);
    this.events.emit('game:balance_update', this.gs.balance);

    // Commit to round state
    r.buyClue(idx, this.gs.bet);

    // Refresh BOTH cards — the unbought one's cost just doubled
    this._refreshClueCard(0);
    this._refreshClueCard(1);
    this._updateNoClueBonusIndicator();

    this._addClue(`🛒 Bought CLUE #${idx + 1} for $${cost}.`, VI.HEX.GOLD);
  }

  _refreshClueCard(idx) {
    const card = this._clueCards && this._clueCards[idx];
    const r    = this.gs.round;
    if (!card || !r || !r.clues[idx]) return;

    // If the market panel is currently hidden (BETTING, INTRO, SCOREBOARD),
    // do not touch any element's visibility. Otherwise this method runs from
    // _resetClueMarket / first ACCUSE entry and would resurrect the BUY
    // buttons on the screen even while the panel is supposed to be hidden.
    if (!this._marketVisible) return;

    const clue = r.clues[idx];

    if (clue.bought) {
      card.headerLbl.setText(`🔍 CLUE #${idx + 1}`).setColor(VI.HEX.GOLD);
      card.btnG.setVisible(false);
      card.btnLbl.setVisible(false);
      card.btnZone.setVisible(false);
      card.btnZone.disableInteractive();
      card.clueText.setText(clue.text).setVisible(true);
      return;
    }
    if (this._clueMarketFrozen) {
      card.headerLbl.setText('🔒 INFORMATION CLOSED').setColor(VI.HEX.MAGENTA);
      card.btnG.setVisible(false);
      card.btnLbl.setVisible(false);
      card.btnZone.setVisible(false);
      card.btnZone.disableInteractive();
      card.clueText.setText('').setVisible(false);
      return;
    }
    // Available state — show cost
    const cost = r.getClueCost(this.gs.bet);
    card.headerLbl.setText(`🔒 CLUE #${idx + 1}`).setColor(VI.HEX.CYAN);
    card.btnG.setVisible(true);
    card.btnLbl.setText(`BUY  $${cost}`).setVisible(true);
    card.btnZone.setVisible(true);
    card.btnZone.setInteractive({ cursor: 'pointer' });
    card.clueText.setText('').setVisible(false);
  }

  _updateNoClueBonusIndicator() {
    if (!this._noClueBonusLbl) return;
    const active = this.gs.round && this.gs.round.isNoClueBonusActive();
    if (active) {
      this._noClueBonusLbl.setText('✨  NO-CLUE BONUS  ×1.20').setColor(VI.HEX.GOLD).setAlpha(1);
    } else {
      if (this._noClueBonusPulse) { this._noClueBonusPulse.stop(); }
      this._noClueBonusLbl.setText('— NO-CLUE BONUS FORFEITED —').setColor('#888888').setAlpha(0.55);
    }
  }

  _setClueMarketVisible(visible) {
    const wasVisible = this._marketVisible;
    this._marketVisible = visible;
    // Panel chrome (background, title, no-clue indicator, separator)
    if (this._clueMarketChrome) {
      this._clueMarketChrome.forEach(o => {
        if (o && typeof o.setVisible === 'function') o.setVisible(visible);
      });
    }
    // Card display elements
    if (this._clueCards) {
      this._clueCards.forEach(c => {
        [c.bg, c.headerLbl, c.btnG, c.btnLbl, c.btnZone, c.clueText].forEach(o => {
          if (o && typeof o.setVisible === 'function') o.setVisible(visible);
        });
        if (!visible && c.btnZone && c.btnZone.disableInteractive) c.btnZone.disableInteractive();
      });
    }
    // When transitioning to visible, sync card content with current state
    if (visible) {
      if (this._clueCards) this._clueCards.forEach((_, i) => this._refreshClueCard(i));
      this._updateNoClueBonusIndicator();
      // First-time-this-round entrance: drop the market in like the suspects.
      if (!wasVisible) this._dropInClueMarket();
    }
  }

  // Casino-slot drop for the Clue Market panel. Chrome lands first, then
  // each card bounces down with a small stagger. Mirrors _revealSuspects.
  _dropInClueMarket() {
    const DROP        = 280;
    const CHROME_MS   = 520;
    const CARD_MS     = 540;
    const CARD_DELAY  = 140;     // delay after chrome starts before first card drops

    // Chrome (bg, title, no-clue lbl, separator) drops as one unit
    if (this._clueMarketChrome && this._clueMarketChrome.length) {
      this._clueMarketChrome.forEach(o => { if (o) o.y -= DROP; });
      this.tweens.add({
        targets: this._clueMarketChrome,
        y: `+=${DROP}`,
        duration: CHROME_MS,
        ease: 'Bounce.Out',
      });
    }

    // Each card drops as a unit with a slight per-card stagger
    if (this._clueCards) {
      this._clueCards.forEach((c, i) => {
        const els = [c.bg, c.headerLbl, c.btnG, c.btnLbl, c.btnZone, c.clueText]
          .filter(Boolean);
        els.forEach(o => { o.y -= DROP; });
        this.tweens.add({
          targets: els,
          y: `+=${DROP}`,
          duration: CARD_MS,
          delay: CARD_DELAY + i * 110,
          ease: 'Bounce.Out',
        });
      });
    }
  }

  _resetClueMarket() {
    this._clueMarketFrozen = false;
    // Explicitly hide between rounds — _enter_ACCUSE will re-show it.
    this._setClueMarketVisible(false);
    if (this._noClueBonusPulse) {
      this._noClueBonusPulse.resume && this._noClueBonusPulse.resume();
      this._noClueBonusPulse.restart && this._noClueBonusPulse.restart();
    }
  }

  _freezeClueMarket() {
    this._clueMarketFrozen = true;
    if (this._clueCards) {
      this._clueCards.forEach((_, i) => this._refreshClueCard(i));
    }
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
      // Pass `amt` explicitly so the round controller owns its own snapshot
      // of the bet — clue cost reads it from there, not from scene state.
      this.gs.round.registerBetLock(this._folderPct, amt);
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
    // Track in BOTH the array and the round container — _startRound will
    // tear them all down regardless of which path catches them.
    if (!this._roundOverlayObjs) this._roundOverlayObjs = [];
    this._roundOverlayObjs.push(badge);
    if (this._roundContainer) this._roundContainer.add(badge);
  }

  _showResultOverlay(win, delta) {
    const { width, height } = this.scale;
    const cx = width / 2, cy = height / 2;
    const pw = 560, ph = 360;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.72);
    overlay.fillRect(0, 0, width, height);

    const panel = this.add.graphics();
    panel.fillStyle(VI.COLORS.PANEL_SURFACE, 0.97);
    panel.fillRoundedRect(cx - pw/2, cy - ph/2, pw, ph, 16);
    panel.lineStyle(3, win ? VI.COLORS.GOLD : VI.COLORS.VI_RED, 1);
    panel.strokeRoundedRect(cx - pw/2, cy - ph/2, pw, ph, 16);

    const headline = this.add.text(cx, cy - 130, win ? '🔍  CASE SOLVED!' : '❌  CASE COLD', {
      fontFamily: VI.FONTS.HEADING, fontSize: '36px',
      color: win ? VI.HEX.GOLD : VI.HEX.VI_RED, stroke: '#000', strokeThickness: 5,
      shadow: { blur: 18, color: win ? VI.HEX.GOLD : VI.HEX.VI_RED, fill: true },
    }).setOrigin(0.5);

    const killerName = this.gs.round.suspects[this.gs.round.killerIdx].name;
    const verdictLine = win
      ? `${killerName} has been arrested!`
      : `The killer was ${killerName}. They escape free.`;
    const verdictText = this.add.text(cx, cy - 84, verdictLine, {
      fontFamily: VI.FONTS.BODY, fontSize: '15px', color: VI.HEX.CREAM,
    }).setOrigin(0.5);

    // ── Multiplier breakdown (win only, v0.5) ─────────────────
    let multText = null, multSubText = null;
    if (win && this.gs.bet > 0) {
      const gross = delta + this.gs.bet;             // delta is net profit; gross = profit + stake
      const mult  = gross / this.gs.bet;
      const bd    = this.gs.round.getPayoutBreakdown
        ? this.gs.round.getPayoutBreakdown(this.gs.selectedIdx, this._folderPct)
        : null;

      multText = this.add.text(cx, cy - 48, `MULTIPLIER  ×${mult.toFixed(2)}`, {
        fontFamily: VI.FONTS.HEADING, fontSize: '18px', color: VI.HEX.CYAN, letterSpacing: 5,
      }).setOrigin(0.5);

      const parts = [];
      if (bd) {
        parts.push(`${bd.suspMult.toFixed(1)}× base`);
        parts.push(`${bd.foldMult.toFixed(2)}× folder`);
        parts.push(`${bd.weapMult.toFixed(1)}× weapon`);
        if (bd.earlyBird) parts.push('+15% early');
        if (bd.noClue)    parts.push('+20% no-clue');
      }
      if (this.gs.wrongCount === 1) parts.push('Acc#2 ×0.30');

      multSubText = this.add.text(cx, cy - 24, parts.join('  ·  '), {
        fontFamily: VI.FONTS.MONO, fontSize: '11px', color: VI.HEX.CREAM, alpha: 0.75,
      }).setOrigin(0.5);
    }

    // Net delta — big and centered
    const amtColor = delta >= 0 ? VI.HEX.GOLD : VI.HEX.MAGENTA;
    const deltaText = this.add.text(cx, cy + 20, `${delta >= 0 ? '+' : ''}$${Math.round(delta).toLocaleString()}`, {
      fontFamily: VI.FONTS.MONO, fontSize: '44px', color: amtColor,
      shadow: { blur: 12, color: amtColor, fill: true },
    }).setOrigin(0.5);

    const balanceText = this.add.text(cx, cy + 68, `Balance: $${this.gs.balance.toLocaleString()}`, {
      fontFamily: VI.FONTS.MONO, fontSize: '16px', color: VI.HEX.CREAM,
    }).setOrigin(0.5);

    // Next case button
    const bw = 230, bh = 50;
    const btnG = this.add.graphics();
    const _drawBtn = (hover) => {
      btnG.clear();
      btnG.fillStyle(hover ? VI.COLORS.MAGENTA : VI.COLORS.VI_PURPLE, 1);
      btnG.fillRoundedRect(cx - bw/2, cy + ph/2 - 60, bw, bh, 10);
      btnG.lineStyle(2, VI.COLORS.GOLD, hover ? 1 : 0.7);
      btnG.strokeRoundedRect(cx - bw/2, cy + ph/2 - 60, bw, bh, 10);
    };
    _drawBtn(false);
    const btnLbl = this.add.text(cx, cy + ph/2 - 35, 'NEXT CASE  →', {
      fontFamily: VI.FONTS.HEADING, fontSize: '18px', color: '#fff',
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, cy + ph/2 - 35, bw, bh).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover',  () => { _drawBtn(true);  btnLbl.setColor(VI.HEX.GOLD); });
    zone.on('pointerout',   () => { _drawBtn(false); btnLbl.setColor('#fff'); });
    zone.on('pointerup', () => {
      this.events.emit('game:next_round', this.gs.balance);
      this._startRound();          // cleans up everything via _roundOverlayObjs
    });

    // Track everything for cleanup at _startRound — array + container
    if (!this._roundOverlayObjs) this._roundOverlayObjs = [];
    const all = [overlay, panel, headline, verdictText, deltaText, balanceText, btnG, btnLbl, zone];
    if (multText)    all.push(multText);
    if (multSubText) all.push(multSubText);
    all.forEach(o => this._roundOverlayObjs.push(o));
    if (this._roundContainer) {
      this._roundContainer.add(all);
    }

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
    this.tweens.add({ targets: [s.g, s.nameText, s.silG], alpha: 0.22, duration: 300 });
    s.zone.disableInteractive();
  }

  // ── Background & decoration ────────────────────────────────
  _drawBackground() {
    const { width, height } = this.scale;

    // 1. Flood-black floor — always painted, hides whatever's behind.
    const floor = this.add.graphics();
    floor.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    floor.fillRect(0, 0, width, height);

    // 2. Per-room background image holder. Sits between the floor and the
    //    Glow-Fi atmosphere overlay so the dot matrix + ellipses + arc still
    //    paint ON TOP of the room art. Stays alpha=0 until _setRoomBackground
    //    runs for the first round, then crossfades per round.
    this._roomBg = this.add.image(width / 2, height / 2, '__DEFAULT');
    this._roomBg.setDisplaySize(width, height);
    this._roomBg.setAlpha(0);

    // 3. Glow-Fi atmosphere — ellipses, dot matrix, arc. These overlay the
    //    room art at low alpha to keep the brand's Neo-Vector signature.
    const bg = this.add.graphics();
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

  // ── Per-room background ────────────────────────────────────
  // Swap the bg image to match the round's room. Crossfades between rounds.
  // If the texture for this room hasn't been loaded (any of 12 PNGs missing
  // from disk), we silently fall back to the vector-only background — the
  // game stays playable regardless.
  _setRoomBackground(roomId) {
    if (!this._roomBg) return;          // _drawBackground hasn't run yet
    const key = `bg-${roomId}`;
    if (!roomId || !this.textures.exists(key)) {
      // Fade out any prior image, leaving the vector background alone.
      this.tweens.killTweensOf(this._roomBg);
      this.tweens.add({ targets: this._roomBg, alpha: 0, duration: 240 });
      return;
    }

    const TARGET_ALPHA = 0.78;          // dim enough for UI to read, bright enough to feel "in the room"
    const prev = this._roomBg.alpha;

    // Mid-round swap → crossfade. First scene entry (prev≈0) → straight fade-in.
    this.tweens.killTweensOf(this._roomBg);
    if (prev > 0.05) {
      this.tweens.add({
        targets: this._roomBg,
        alpha: 0,
        duration: 260, ease: 'Cubic.easeIn',
        onComplete: () => {
          this._roomBg.setTexture(key);
          this.tweens.add({
            targets: this._roomBg,
            alpha: TARGET_ALPHA,
            duration: 380, ease: 'Cubic.easeOut',
          });
        },
      });
    } else {
      this._roomBg.setTexture(key);
      this.tweens.add({
        targets: this._roomBg,
        alpha: TARGET_ALPHA,
        duration: 520, ease: 'Cubic.easeOut',
      });
    }
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
