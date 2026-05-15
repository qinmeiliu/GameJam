# CLAUDE.md — Project Memory: The Ducky Detective Agency

> Persistent context for AI collaboration on this Vegas Infinite Game Jam build.
> **Role:** Senior Lead Game Programmer (AI-Driven Web Development).
> Update this file whenever architectural decisions change or major features land.

---

## PROJECT IDENTITY

- **Working title:** QUACKDUNNIT (formerly "The Ducky Detective Agency" — shortened, single-word on the title screen for impact)
- **Platform:** Vegas Infinite web library, deployed via GitHub Pages (100% static)
- **Engine:** Phaser 3.80.1 (CDN, no build step)
- **Genre:** Whodunnit casino game — 30% logic / 70% chaos
- **GDD version:** v0.5 (`GDD.md` is the source of truth — see v0.5 CHANGELOG at top)
- **Repo:** `qinmeiliu/GameJam` → https://qinmeiliu.github.io/GameJam/
- **Owner:** Meimei (qinmei@getluckyvr.com)

## CORE DESIGN PILLARS (v0.5)

1. **30/70 Chaos** — the murder is not solvable. Clues are misdirection. Trust scores are cosmetic. Killer is pure equal-weight RNG.
2. **Non-linear risk curve** — suspect counts have different RTPs (3→90%, 4→94%, 5→96%, 6→100% on no-clue plays). Players pick their volatility profile, not just their stakes.
3. **Clue Market** — clues are purchaseable, not auto-revealed. First clue = 10% of bet, second = 20%. Skipping all clues earns a ×1.20 No-Clue Bonus. Clues never name the killer. Trait-based clues narrow the field to **two** candidates (v0.5.1 8-cycle overlap), never to one.
4. **Two-sub-phase betting** — BETTING phase shows the case file (open-ended, no timer); player places bet → ACCUSE phase (30s timed): suspects revealed with quotes, folder burns, player must accuse. Action cards deferred post-MVP.
5. **Dual Accusation** — wrong Accusation #1 → innocent dramatically executed, second-chance window opens (15s, clue market frozen, no new clue buys). Acc#2 correct = ×0.30 of gross (down from v0.4's 0.40).
6. **Glow-Fi Neo-Vector art** — Flood Black base (`#05050a`), Cyan/Magenta/Gold accents, dot-matrix Linear GFX, Hex Holding Devices, every element glows.

## PAYOUT MATH (v0.5 canonical — must match `RoundController.js`)

```
GROSS = bet × suspect_multiplier              // 1.8 / 2.5 / 3.2 / 4.0 for 3/4/5/6 suspects
            × folder_multiplier               // lerp 0.2× → 1.5× over 20-100% integrity
            × weapon_multiplier               // 1.0 / 1.5 / 3.0 common / uncommon / rare
            × (1 + early_bird_bonus)          // +0.15 if bet locked while integrity > 60%
            × no_clue_bonus                   // ×1.20 if cluesPurchased === 0, else ×1.0
            × action_modifiers                // post-MVP — currently 1.0

Accusation #2 correct → GROSS × 0.30
NET = GROSS - bet
Clue costs deducted from balance at purchase time (NOT subtracted from gross):
  - First clue purchased: 10% of bet
  - Second clue purchased: 20% of bet
```

Starting balance: **10,000 chips** per session. Minimum bet: **10 chips**.

Chip denominations (v0.5.2): `[10, 25, 100, 500, 1000]`. Colors map to white / red / green / cyan / gold respectively.

## RTP TABLE (v0.5 — for designer reference, NOT shown to player)

|              | 0 clues | 1 clue  | 2 clues |
|--------------|---------|---------|---------|
| 3 suspects   | 90%     | 65%     | 45%     |
| 4 suspects   | 94%     | 68%     | 48%     |
| 5 suspects   | 96%     | 70%     | 50%     |
| 6 suspects   | 100%    | 73%     | 53%     |

Casino-optimal play: 6 suspects + 0 clues. Worst-RTP play: 3 suspects + 2 clues.

## FILE STRUCTURE

```
Ducky Detective/
├── index.html                  ← Entry point (loads Phaser CDN + scripts in order)
├── GDD.md                       ← Game Design Document v0.4 (source of truth)
├── SETUP.md                     ← GitHub Pages deploy notes
├── CLAUDE.md                    ← This file (project memory)
├── src/
│   ├── main.js                  ← Phaser game config, scene list
│   ├── utils/constants.js       ← VI brand colours, fonts, game config
│   ├── data/murders.js          ← All Mad-Lib content (victims, weapons, rooms, clues, motives)
│   ├── systems/RoundController.js  ← Round generator, payout math, action handlers
│   └── scenes/
│       ├── BootScene.js         ← Empty boot, sets fullscreen target
│       ├── PreloadScene.js      ← Loading bar (⚠ references non-existent VI colours)
│       ├── MenuScene.js         ← Title scene: QUACKDUNNIT hero, PLAY (SPACE/ENTER), HOW TO PLAY modal
│       ├── LobbyScene.js        ← Round table of guests: 3 mandatory + 3 toggleable seats, live payout plate in centre, Ducky aside
│       ├── GameScene.js         ← Round flow, suspect tokens, clue feed, accuse flow
│       └── UIScene.js           ← Persistent HUD: chips, bet, action cards, accuse button
└── assets/                       ← Image/audio/font folders (empty — placeholders for now)
```

## CURRENT BUILD STATUS

### ✅ Working
- Menu → Lobby → Game scene flow
- 3/4/5/6 suspect selector with payout preview
- Round generation (RoundController.js): victim, weapon, room, motive, suspects, clues
- 45s folder integrity burn timer (3× speed on wrong-accusation)
- Two clue reveals at 12s and 24s with feed panel
- Hex-shaped suspect tokens with selection highlight
- Chip-tray betting (1/5/25/100/500), CLEAR + CONFIRM BET buttons
- Action card strip in UI (6 cards)
- Dual accusation flow: wrong → second chance → win/loss overlay
- Win/loss result modal with NEXT CASE button
- ESC returns to menu

### ⚠ Known bugs (RESOLVED 2026-05-13)
- ~~`PreloadScene.js` references `VI.COLORS.BG_SURFACE` and `VI.COLORS.PURPLE_DARK`~~ → fixed: now uses `PANEL_SURFACE` and `VI_PURPLE`.
- ~~Two parallel action-card systems~~ → unified around `MURDER_DATA.actions` catalog (8 GDD-canonical actions). `UIScene` reads the catalog directly; `RoundController.applyAction` returns a descriptor that `GameScene._onActionCard` dispatches into bet/suspect/folder side-effects.
- ~~No Early Bird bonus~~ → wired: `RoundController.registerBetLock(folderPct)` is called from `_onBetConfirmed`, applies `1.15×` to gross when bet locked at folder > 60%.
- Action cards still trigger anytime during BETTING (not strictly clue-bound 8s windows per GDD). Accepted simplification for MVP.

### 🆕 Just landed (Sprint 1 — 2026-05-13)
- **Round phase state machine.** `VI.PHASES` + `VI.PHASE_TIMINGS` in `constants.js`. `GameScene._setPhase()` is the single transition entry. Each phase has `_enter_<NAME>()` / `_exit_<NAME>()` hooks and owns its delayedCalls via `_scheduleInPhase()` to prevent timer leaks. Transitions emit `game:phase_change` for the UI to react to.
- **GDD-canonical action set (8 actions).** `MURDER_DATA.actions` is the single source of truth for id/label/color/desc. `RoundController.applyAction()` returns descriptor objects (`multBet`, `cycleSuspect`, `burnMultiplier`, `lockFolder`, `cashOut`, etc.) that GameScene applies as scene-side side effects.
- **Folder multiplier corrected to GDD spec** — lerps 0.2× → 1.5× over 20→100% integrity (was 0.2× → 3.0×).
- **Accusation #2 penalty** — second-accusation correct now applies `gross × 0.40` per GDD.
- **INSURANCE refund + CASH_OUT short-circuit** — both round-end paths handled cleanly.
- **Phase-gated input** — bets/accusations/actions only fire during their allowed phases. Hard 15s timeout on SECOND_CHANCE auto-resolves as loss.

### 🚧 Not yet built (GDD v0.4 features)
- **Multiplayer / Firebase Realtime DB** — room codes, lobby, sync state machine
- **Side bets:** Ducky Bribe, Weapon Roulette, Chaos Roll, Burn Bracket, Clue Trail
- **DOUBLE DETECTIVE bonus path** (confirm-again for +50% after a correct Accusation #1)
- **Room atmosphere shifts** — per-room dot-matrix tint, splash GFX, prop silhouette
- **HYPE ROUND** treatment when a rare weapon spawns
- **Ducky character** — actual mascot sprite/vector + emotional state animations
- **Suspect silhouettes** — geometric per-character shapes from GDD spec
- **Evidence folder visual treatment** — flame stages, multiplier badge
- **Linear GFX / Accent GFX / Expressive GFX / Splash GFX** asset library
- **Sound design** — chip plops, folder ignition, accusation slam, Ducky quacks
- **3 missing rooms** — Garage, Conservatory, Grand Staircase
- **Capitana font** (Oswald is the prototype stand-in)

## TECH NOTES

- All scripts attached as `<script>` tags in `index.html` in dependency order (no ES modules).
- `RoundController` is plain JS class on the global scope, instantiated fresh per round.
- Scene communication via `this.events.emit / on` with `game:*` (from GameScene) and `ui:*` (from UIScene) prefixes.
- Firebase plan: Realtime DB free tier, security rules hide `actualKiller` until `state === 'reveal'`.
- Single player = 1-player room. No special-case code needed.
- **Cache busting:** every `<script>` in `index.html` has `?v=YYYYMMDD-N` query strings. **Bump this on every deploy** so browsers re-fetch fresh JS. Current version is in the script tags — when iterating, do a find-replace across `index.html` to bump (e.g. `20260513-4` → `20260513-5`). Without this, GitHub Pages CDN + browser caches will serve stale JS for hours and code changes look broken (this caused the Lobby randomization-not-working bug on 2026-05-13).

## VI BRAND CHEAT SHEET (from `constants.js`)

| Role | Hex | Use |
|---|---|---|
| FLOOD_BLACK | `#05050a` | Every base |
| PANEL_SURFACE | `#0d0d1a` | Cards, panels |
| CYAN | `#2afeff` | Primary UI |
| MAGENTA | `#fd009f` | Danger / wrong / guilty |
| GOLD | `#fde054` | Win moments only |
| CREAM | `#fbf4db` | Body text (never pure white) |
| VI_ORANGE | `#fc6b23` | Bet flash, PRESS card |
| VI_AMBER | `#f59f41` | Uncommon weapon |
| VI_RED | `#f8050e` | Full-loss flash |
| VI_BLUE | `#1729ff` | LOCK IN |
| VI_PURPLE | `#9500c6` | CHAOS ROLL |

Iron rule: Cyan and Magenta never touch — separate with min 8px Flood Black. Gold is reward-only.

## WORKING AGREEMENTS

- Update this file when a feature lands or a design decision changes.
- Match `RoundController.js` math to GDD payout formulas — if they drift, GDD wins and we fix code.
- Single-player playable first; Firebase multiplayer is a separable later layer.
- Keep the scene-event bus pattern (`game:*` / `ui:*`) — don't reach into other scenes directly.
- Every visual element follows Glow-Fi Neo-Vector — if it doesn't glow, it doesn't belong.

---

**Last updated:** 2026-05-14 (v0.5 design) — Casino redesign: clue market, non-linear suspect mults, no-clue bonus, Acc#2 0.40→0.30, RTP tightened to casino-like ranges. See GDD v0.5 CHANGELOG.

## NEXT SUGGESTED SPRINTS

1. **In-browser playtest pass.** Open `index.html` locally (or via GitHub Pages), run a full round at each suspect count (3/4/5/6), exercise every action card, trigger second chance, confirm payout numbers match GDD math by hand. The bash mount in this dev environment can't refresh — syntax was verified statically. Live testing is the next gate.
2. **Reveal-moment polish (GDD Scene C/D/E).** Add the cinematic Ducky-points moment: gold Linear GFX line from Ducky's wing to the killer hex, confetti emitter on win, COLD CASE stamp on loss, vacuum-suck pool-drop animation on wrong Acc#1. Lots of bang for buck.
3. **DOUBLE DETECTIVE bonus path.** After a correct Acc#1, offer "confirm again for +50%" (5s window).
4. **Per-room atmosphere.** Tint the dot-matrix per `MURDER_DATA.rooms[i].accent`; add Splash GFX blob behind playing field in the room's accent color.
5. **Side bets** (Ducky Bribe, Weapon Roulette, Burn Bracket, Clue Trail) — independent feature, fits into BETTING phase.
6. **Firebase multiplayer layer** — only after single-player feels right.
