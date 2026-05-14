// ============================================================
// Vegas Infinite – Game Jam  |  main.js
// Phaser 3 game config & bootstrapper
// ============================================================

const config = {
  type: Phaser.AUTO,             // WebGL → Canvas fallback
  width:  VI.GAME.WIDTH,
  height: VI.GAME.HEIGHT,
  backgroundColor: '#0a0010',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Render at the display's actual pixel density so text stays crisp on
    // HiDPI screens (4K / retina / scaled-up windows). Fallback to 1 on
    // older browsers that don't report devicePixelRatio.
    zoom: 1,
  },
  // Render hints — we're a text-heavy UI game, not pixel art.
  render: {
    antialias:    true,
    antialiasGL:  true,
    pixelArt:     false,
    roundPixels:  false,   // don't snap text origins to integer pixels
  },
  // Render at devicePixelRatio so text glyphs are rasterised at the native
  // pixel grid and the browser only scales the WHOLE canvas, not the text.
  resolution: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    LobbyScene,
    GameScene,
    UIScene,
  ],
  audio: {
    disableWebAudio: false,
  },
};

// Boot the game
const game = new Phaser.Game(config);
