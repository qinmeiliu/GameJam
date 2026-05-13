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
  },
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
const game = new Phase