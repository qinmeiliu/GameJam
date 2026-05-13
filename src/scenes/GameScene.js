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
      round:         null,      // RoundController instance
      state:         'playing', // 'playing' | 'second_chance' | 'finished'
      selectedIdx:   -1,        // which suspect the player has highlighted
      bet:           0,
      wrongCount:    0,
    };
    this._folderPct    = 1.0;
    this._timerElapsed = 0;
    this._timerExpired = false;
    this._clueRevealed = [false, false];
    this._burnTimer    = null;
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

    this._folderPct    = 1.0;
    this._clueRevealed = [false, false];
    this._timerElapsed = 0;
    this._timerExpired = false;

    this._refreshCasePanel();
    this._refreshSuspects();
    this._refreshFolderBar();
    this._clearClueFeed();
    this._addClue('🦆 Ducky has a new case. Study the suspects…', VI.HEX.CYAN);

    // Emit round start to UIScene
    this.events.emit('game:round_start', {
      balance:      gs.balance,
      suspectCount: gs.suspectCount,
      suspects:     gs.round.suspects,
    });

    // Folder burn timer — ticks every 250ms
    this._stopTimer();
    this._burnTimer = this.time.addEvent({
      delay: 250,
      loop:  true,
      callback: this._burnTick,
      callbackScope: this,
    });

    // Schedule clue reveals
    this.time.delayedCall(12000, () => this._revealClue(0));
    this.time.delayedCall(24000, () => this._revealClue(1));
  }

  _stopTimer() {
    if (this._burnTimer) { this._burnTimer.remove(); this._burnTimer = null; }
  }

  _burnTick() {
    if (this.gs.state !== 'playing') return;

    const speed     = this.gs.wrongCount > 0 ? 3 : 1;
    const totalSecs = 45;
    const tickSecs  = 0.25 * speed;
    const floor     = 0.20;

    this._timerElapsed += tickSecs;
    const raw = 1.0 - (this._timerElapsed / totalSecs);
    this._folderPct = Math.max(floor, raw);

    this._refreshFolderBar();
    this.events.emit('game:folder_update', this._folderPct);

    if (this._folderPct <= floor && !this._timerExpired) {
      this._timerExpired = true;
      this._addClue('⏰ TIME OUT — folder at minimum. Accuse now!', VI.HEX.VI_RED);
      this.events.emit('game:timeout');
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
    const elapsed = this._timerElapsed || 0;
    const secs    = Math.max(0, Math.round(45 - elapsed));
    const col     = secs < 10 ? VI.HEX.VI_RED : secs < 20 ? VI.HEX.VI_ORANGE : VI.HEX.CREAM;
    this._timerText.setText(`${secs}s`).setColor(col);
  }

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

      this._suspectSprites.push({ g, numText, nameText, subtextText, highlightG, zone, cx, cy, tokenR, idx, sus });
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
    this.gs.bet = amt;
    this._addClue(`💰 Bet placed: $${amt}`, VI.HEX.VI_AMBER);
  }

  _onSuspectSelect(idx) {
    this.gs.selectedIdx = idx;
    this._refreshSuspectHighlights();
  }

  _onAccuse() {
    const gs = this.gs;
    if (gs.state !== 'playing') return;
    if (gs.selectedIdx < 0) { this.events.emit('game:error', 'Select a suspect first!'); return; }
    if (gs.bet <= 0)         { this.events.emit('game:error', 'Place a bet first!');     return; }

    this._stopTimer();
    const correct = (gs.selectedIdx === gs.round.killerIdx);

    if (correct) {
      this._resolveWin();
    } else {
      gs.wrongCount++;
      if (gs.wrongCount === 1) {
        this._showSecondChance();
      } else {
        this._resolveLoss();
      }
    }
  }

  _showSecondChance() {
    const gs = this.gs;
    const wrongIdx = gs.selectedIdx;
    const wrongSpr = this._suspectSprites[wrongIdx];
    if (wrongSpr) {
      this.tweens.add({ targets: [wrongSpr.g, wrongSpr.nameText, wrongSpr.subtextText, wrongSpr.numText], alpha: 0.15, duration: 400 });
      wrongSpr.zone.disableInteractive();
    }
    this._addClue(`❌ WRONG! ${gs.round.suspects[wrongIdx].name} is innocent.`, VI.HEX.MAGENTA);
    this._addClue('🎲 SECOND CHANCE — folder burns 3× faster!', VI.HEX.VI_ORANGE);

    gs.state       = 'playing';
    gs.selectedIdx = -1;
    this._refreshSuspectHighlights();

    this._burnTimer = this.time.addEvent({
      delay: 250, loop: true,
      callback: this._burnTick, callbackScope: this,
    });
    this.events.emit('game:second_chance');
  }

  _resolveWin() {
    const gs = this.gs;
    gs.state = 'finished';
    const payout   = gs.round.calculatePayout(gs.bet, gs.selectedIdx, this._folderPct);
    gs.balance     = Math.round(gs.balance + payout);
    this._balanceText.setText(`$${gs.balance.toLocaleString()}`);
    this._addClue(`✅ CORRECT! ${gs.round.suspects[gs.selectedIdx].name} is the killer!`, VI.HEX.GOLD);
    this._addClue(`💰 PAYOUT: +$${Math.round(payout).toLocaleString()}`, VI.HEX.GOLD);
    this._markGuiltySuspect(gs.selectedIdx);
    this._showResultOverlay(true, payout);
    this.events.emit('game:win', { payout, balance: gs.balance });
  }

  _resolveLoss() {
    const gs = this.gs;
    gs.state = 'finished';
    const lost    = gs.bet;
    gs.balance    = Math.max(0, Math.round(gs.balance - lost));
    this._balanceText.setText(`$${gs.balance.toLocaleString()}`);
    this._addClue(`❌ WRONG AGAIN! Killer was ${gs.round.suspects[gs.round.killerIdx].name}.`, VI.HEX.VI_RED);
    this._addClue(`💸 LOST: -$${lost.toLocaleString()}`, VI.HEX.MAGENTA);
    this._markGuiltySuspect(gs.round.killerIdx);
    this._showResultOverlay(false, -lost);
    this.events.emit('game:loss', { lost, balance: gs.balance });
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

  // ── Action cards ───────────────────────────────────────────

  _onActionCard(id) {
    if (this.gs.state !== 'playing') return;
    const result = this.gs.round.applyAction ? this.gs.round.applyAction(id) : null;
    const msgs = {
      'EXTRA_CLUE':   (r) => `🃏 EXTRA CLUE: ${r ? r.text : 'no new clue available'}`,
      'ELIMINATE':    (r) => `🃏 ELIMINATE: ${r && r.eliminated ? r.eliminated + ' ruled out' : 'no one eliminated'}`,
      'PRESS_LUCK':   (r) => `🃏 PRESS YOUR LUCK: ${r && r.text ? r.text : 'nothing revealed'}`,
      'LOCK_IN':      ()  => { this.gs.round._lockedFolder = this._folderPct; this._freezeFolder(10000); return '🃏 LOCK IN: multiplier locked + folder frozen 10s'; },
      'CHAOS_ROLL':   (r) => `🃏 CHAOS ROLL: ${r && r.text ? r.text : 'chaos ensues'}`,
      'DOUBLE_DOWN':  ()  => { this.gs.bet = this.gs.bet * 2; this.events.emit('game:bet_updated', this.gs.bet); return `🃏 DOUBLE DOWN: bet → $${this.gs.bet}`; },
      'SWAP':         ()  => '🃏 SWAP: suspect profile refreshed',
      'INSURANCE':    ()  => '🃏 INSURANCE: 50% refund on wrong accusation',
    };
    const msgFn = msgs[id];
    const msg   = msgFn ? msgFn(result) : `🃏 ${id}`;
    if (msg) this._addClue(msg, VI.HEX.VI_BLUE);
    if (result && result.idx != null) this._dimSuspect(result.idx);
    this.events.emit('game:action_used', id);
  }

  _dimSuspect(idx) {
    const s = this._suspectSprites[idx];
    if (!s) return;
    this.tweens.add({ targets: [s.g, s.nameText, s.numText], alpha: 0.22, duration: 300 });
    s.zone.disableInteractive();
  }

  _freezeFolder(ms) {
    this._stopTimer();
    this.time.delayedCall(ms, () => {
      if (this.gs.state === 'playing') {
        this._burnTimer = this.time.addEvent({
          delay: 250, loop: true,
          callback: this._burnTick, callbackScope: this,
        });
      }
    });
  }

  // ── Background & decoration ────────────────────────────────

  _drawBackground() {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillStyle(VI.COLORS.FLOOD_BLACK, 1);
    bg.fillRect(0, 0, width, height);

    // Splash blobs
    bg.fillStyle(VI.COLORS.CYAN, 0.03);
    bg.fillEllipse(width * 0.75, height * 0.3, 620, 420);
    bg.fillStyle(VI.COLORS.MAGENTA, 0.025);
    bg.fillEllipse(width * 0.2, height * 0.75, 500, 360);
    bg.fillStyle(VI.COLORS.VI_PURPLE, 0.04);
    bg.fillEllipse(width * 0.5, height * 0.55, 720, 520);

    // Dot matrix (Linear GFX)
    const dot = this.add.graphics();
    dot.fillStyle(VI.COLORS.CYAN, VI.GAME.DOT_OPACITY);
    for (let x = 0; x < width; x += VI.GAME.DOT_SPACING) {
      for (let y = 100; y < height; y += VI.GAME.DOT_SPACING) {
        dot.fillCircle(x, y, VI.GAME.DOT_RADIUS);
      }
    }

    // Accent arc
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
