// ============================================================
// BootScene – runs first, no assets needed
// Sets up any global game settings before PreloadScene loads
// ============================================================

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load only the assets needed to show a loading bar
    // (a tiny progress background graphic if you have one)
    // this.load.image('loading-bg', 'assets/images/ui/loading-bg.png');
  }

  create() {
    // Global settings
    this.scale.fullscreenTarget = document.getElementById('game-container');

    // Hand off to the preloader
    this.scene.start('PreloadScene');
  }
}
