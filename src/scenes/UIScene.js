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

    // Action card strip
    this._buildActionStrip(width, height);

    // ACCUSE button
    this._buildAccuseButton(width, height);

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

    this._chipObjs = {};
    chips.forEach((value, i) => {
      const x = startX + i * spacing;
      this._chipObjs[value] = this._drawChip(x, cy, value);
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

    const label = value >= 100 ? `$