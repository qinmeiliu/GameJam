// ============================================================
// PreloadScene – loads all game assets with VI-styled progress bar
// Add your asset load calls here as you build the game
// ============================================================

class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    this._buildLoadingBar();

    // ── Ducky mascot ──────────────────────────────────────────
    // this.load.image('ducky',          'assets/images/ducky/ducky-idle.png');
    // this.load.image('ducky-win',      'assets/images/ducky/ducky-win.png');
    // this.load.image('ducky-lose',     'assets/images/ducky/ducky-lose.png');
    // this.load.spritesheet('ducky-anim', 'assets/images/ducky/ducky-sheet.png',
    //   { frameWidth: 256, frameHeight: 256 });

    // ── UI ───────────────────────────────────────────────────
    // this.load.image('logo',           'assets/images/ui/vi-logo.png');
    // this.load.image('btn-primary',    'assets/images/ui/btn-primary.png');
    // this.load.image('chip-1',         'assets/images/chips/chip-1.png');
    // this.load.image('chip-5',         'assets/images/chips/chip-5.png');
    // this.load.image('chip-25',        'assets/images/chips/chip-25.png');
    // this.load.image('chip-100',       'assets/images/chips/chip-100.png');

    // ── Backgrounds ──────────────────────────────────────────
    // this.load.image('bg-menu',        'assets/images/backgrounds/menu-bg.jpg');
    // this.load.image('bg-game',        'assets/images/backgrounds/game-bg.jpg');

    // ── Audio ────────────────────────────────────────────────
    // this.load.audio('bgm-menu',       'assets/audio/bgm-menu.mp3');
    // this.load.audio('sfx-win',        'assets/audio/sfx-win.mp3');
    // this.load.audio('sfx-chip',       'assets/audio/sfx-chip.mp3');
    // this.load.audio('sfx-click',      'assets/audio/sfx-click.mp3');

    // ── Fonts (if hosted locally) ─────────────────────────────
    // this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js');
  }

  create() {
    this.scene.start('MenuScene');
  }

  // ── Private helpers ─────────────────────────────────────────

  _buildLoadingBar() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Background panel
    const panel = this.add.graphics();
    panel.fillStyle(VI.COLORS.PANEL_SURFACE, 1);
    panel.fillRoundedRect(cx - 260, cy - 60, 520, 120, 12);

    // Bar track
    const track = this.add.graphics();
    track.fillStyle(VI.COLORS.VI_PURPLE, 0.4);
    track.fillRoundedRect(cx - 220, cy - 12, 440, 24, 12);

    // Bar fill (animated)
    const bar = this.add.graphics();

    // Label
    const label = this.add.text(cx, cy - 36, 'Loading Vegas Infinite…', {
      fontFamily: VI.FONTS.HEADING,
      fontSize: '18px',
      color: VI.HEX.GOLD,
    }).setOrigin(0.5);

    // Progress %
    const pct = this.add.text(cx, cy + 28, '0%', {
      fontFamily: VI.FONTS.BODY,
      fontSize: '14px',
      color: '#ffffff88',
    }).setOrigin(0.5);

    // Update on each file loaded
    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(VI.COLORS.GOLD, 1);
      bar.fillRoundedRect(cx - 220, cy - 12, 440 * value, 24, 12);
      pct.setText(`${Math.floor(value * 100)}%`);
    });
  }
}
