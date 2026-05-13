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
      this._addClue('⏰ TIME OUT — folder at mini