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

    // ──────────────────────────────────────────────────────────
    //  ASSET PIPELINE — v0.5.3+ mixed art approach
    //  Sprites for hero elements (Ducky, suspect portraits, victims).
    //  Vector graphics for UI panels, HUD, decorative GFX.
    //
    //  CONVENTION: each scene checks `this.textures.exists(key)` before
    //  using a sprite. If absent, falls back to the vector graphics that
    //  ship today. This lets art land incrementally without breaking play.
    //
    //  Drop files into the matching folder under assets/images/ and
    //  un-comment the matching this.load.image() line below.
    // ──────────────────────────────────────────────────────────

    // ── Ducky mascot (hero sprite) ───────────────────────────
    // Expected sizes: idle ~256x256, expressions same size, transparent BG.
    // this.load.image('ducky-idle',          'assets/images/ducky/ducky-idle.png');
    // this.load.image('ducky-investigating', 'assets/images/ducky/ducky-investigating.png');
    // this.load.image('ducky-pointing',      'assets/images/ducky/ducky-pointing.png');
    // this.load.image('ducky-win',           'assets/images/ducky/ducky-win.png');
    // this.load.image('ducky-lose',          'assets/images/ducky/ducky-lose.png');

    // ── Suspect portraits (8 characters) ─────────────────────
    // Expected: ~160x180 each, transparent BG, hex-friendly framing.
    // this.load.image('suspect-butler',    'assets/images/suspects/butler.png');
    // this.load.image('suspect-chef',      'assets/images/suspects/chef.png');
    // this.load.image('suspect-mayor',     'assets/images/suspects/mayor.png');
    // this.load.image('suspect-janitor',   'assets/images/suspects/janitor.png');
    // this.load.image('suspect-count',     'assets/images/suspects/count.png');
    // this.load.image('suspect-mime',      'assets/images/suspects/mime.png');
    // this.load.image('suspect-duchess',   'assets/images/suspects/duchess.png');
    // this.load.image('suspect-librarian', 'assets/images/suspects/librarian.png');

    // ── Victim portraits (10 duck aristocrats) ──────────────
    // Used in BETTING case-file panel. Expected ~200x200, transparent BG.
    // this.load.image('victim-victor',     'assets/images/victims/victor.png');
    // this.load.image('victim-quackton',   'assets/images/victims/quackton.png');
    // ...etc.

    // ── Particle textures (procedural — generated at runtime) ─
    // No file needed. GameScene generates 'emberDot' for folder-burn embers.

    // ── Audio (future) ────────────────────────────────────────
    // this.load.audio('sfx-folder-burn', 'assets/audio/sfx-folder-burn.mp3');
    // this.load.audio('sfx-clue-buy',    'assets/audio/sfx-clue-buy.mp3');
    // this.load.audio('sfx-accuse',      'assets/audio/sfx-accuse.mp3');
    // this.load.audio('sfx-win-confetti','assets/audio/sfx-win-confetti.mp3');
    // this.load.audio('sfx-cold-case',   'assets/audio/sfx-cold-case.mp3');
  }

  create() {
    // Make sure Oswald is fully loaded before we hand off to MenuScene.
    // Otherwise the first-frame paint uses a fallback font and the on-hover
    // redraw flips to Oswald, making text "change" mid-screen. We force-load
    // both weights we use and wait for the promises before transitioning.
    const advance = () => this.scene.start('MenuScene');
    if (document.fonts && typeof document.fonts.load === 'function') {
      Promise.all([
        document.fonts.load('700 1em Oswald'),
        document.fonts.load('300 1em Oswald'),
      ]).then(advance).catch(advance);   // Fail-open: still start the menu
    } else {
      // Older browser without the CSS Font Loading API — small delay buffer
      // so a slow font request can finish before we render the first scene.
      this.time.delayedCall(200, advance);
    }
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
