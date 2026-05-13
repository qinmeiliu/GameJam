# Vegas Infinite Game Jam – GitHub Setup Guide

## 1. ✅ Repository already created!

`qinmeiliu/GameJam` is live at: **https://github.com/qinmeiliu/GameJam**
GitHub Pages source set to: **GitHub Actions** ✅

---

## 2. Push this project to GitHub

Open a terminal in the `GameJam` folder (this folder) and run:

```bash
git init
git add .
git commit -m "Initial scaffold – Phaser.js + VI branding"
git branch -M main
git remote add origin https://github.com/qinmeiliu/GameJam.git
git push -u origin main
```

---

## 3. ✅ GitHub Pages already configured!

Source is set to **GitHub Actions** — no further action needed.
The `deploy.yml` workflow will trigger automatically on every push to `main`.

---

## 4. Verify your live URL

After the first push, wait ~60 seconds, then visit:

**https://qinmeiliu.github.io/GameJam/**

You can watch the deploy progress under the **Actions** tab in your repo.

---

## 5. Day-to-day workflow

```bash
# Make your changes in src/scenes/GameScene.js (or wherever)
git add .
git commit -m "Add [feature]"
git push
# GitHub Actions auto-deploys within ~30 seconds
```

---

## Project structure

```
GameJam/
├── index.html                  ← Entry point (served by GitHub Pages)
├── src/
│   ├── main.js                 ← Phaser config & scene list
│   ├── utils/
│   │   └── constants.js        ← VI brand colours, fonts, game config
│   └── scenes/
│       ├── BootScene.js        ← First scene (setup only)
│       ├── PreloadScene.js     ← Asset loading + progress bar
│       ├── MenuScene.js        ← VI-styled main menu with Ducky
│       ├── GameScene.js        ← ★ Your game logic goes here ★
│       └── UIScene.js          ← Persistent HUD (balance, chips, toasts)
├── assets/
│   ├── images/                 ← Drop Ducky PNGs, UI sprites, backgrounds here
│   ├── audio/                  ← BGM, SFX
│   └── fonts/                  ← Custom VI fonts (if hosting locally)
├── .github/workflows/
│   └── deploy.yml              ← Auto-deploy to GitHub Pages
└── .gitignore
```

## Adding brand assets

Once you have the VI asset pack:

1. Drop images into `assets/images/`
2. Uncomment the corresponding `this.load.image(...)` lines in `PreloadScene.js`
3. Replace `🦆` emoji placeholders in `MenuScene.js` and `GameScene.js` with:
   ```js
   this.add.image(x, y, 'ducky').setOrigin(0.5);
   ```

## Updating brand colours / fonts

All colours and typography live in one place: **`src/utils/constants.js`**  
Update the `VI.COLORS` and `VI.FONTS` objects and every scene picks up the changes automatically.
