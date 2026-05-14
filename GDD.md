# 🦆 QUACKDUNNIT (formerly The Ducky Detective Agency)
## Game Design Document v0.5 — Vegas Infinite Game Jam
### Casino Redesign: Clue Market · Non-Linear Risk Curve · Tightened RTP · No-Clue Bonus

> *"Every crime has a culprit. Every clue is nonsense. Every bet is faith."*

---

## v0.5 CHANGELOG — Casino Redesign (2026-05-14)

The clue system and payout math were re-tuned to feel like a real casino game rather than a guess-the-killer puzzle. The big shifts:

1. **Clues no longer name the killer.** Old text had `"${killerName}" scrawled faintly underneath` — a hard spoiler. New text uses trait-based hints, misdirection, and pure flavor with no name reveals.
2. **Clues are a market, not auto-revealed.** Two locked clue cards appear in the right-side panel during ACCUSE. The player chooses to buy 0, 1, or 2 of them.
3. **Asymmetric clue costs.** First clue purchased = 10% of bet, second clue purchased = 20% of bet. Order-based, not slot-based.
4. **No-Clue Bonus.** If the player buys zero clues, gross payout is multiplied by ×1.20. This rewards the cool-headed pure-RNG player.
5. **Non-linear suspect multipliers** (intentionally breaks constant RTP). Higher suspect count = better RTP, lower win frequency — a real risk gradient.
6. **Accusation #2 penalty tightened** from ×0.40 to ×0.30.
7. **8-action card system deferred.** DOUBLE DOWN / INSURANCE / SPLIT / CASH OUT / PRESS / CHAOS ROLL / LOCK IN / SIDE SWAP are now post-MVP. The clue market replaces them as the primary "casino move" loop.

The full math, mechanics, and balance reasoning live in the sections below.

---

## CORE PHILOSOPHY (v0.2 SHIFT)

This is a **30/70 chaos casino game**. The murder is not solvable. The clues are hilarious misdirection. The Trust Score wiggles for entertainment, not strategy. Players are not detectives — they are gamblers dressed as detectives. The clue phase functions like **blackjack moves** (Double Down, Split, Insurance) — opportunities to adjust your betting position, not think harder. Think: Mines meets Blackjack meets a murder mystery dinner gone completely wrong.

---

## SUSPECT COUNT & RTP FRAMEWORK (v0.5)

### The Scaling System — Non-Linear Risk Curve
The number of suspects is now a **risk-reward dial**, not a constant-RTP one. Players choose a suspect count at the start of a round (like choosing slot machine volatility). Higher suspect count = lower win frequency, bigger payout, slightly better RTP.

| Suspects | suspMult | P(Acc#1 correct) | Win freq (Acc#1+Acc#2) | RTP no-clue | RTP 1 clue | RTP 2 clues |
|---|---|---|---|---|---|---|
| 3 | **1.8×** | 33.3% | 67% | 90% | 65% | 45% |
| 4 | **2.5×** | 25.0% | 50% | 94% | 68% | 48% |
| 5 | **3.2×** | 20.0% | 40% | 96% | 70% | 50% |
| 6 | **4.0×** | 16.7% | 33% | 100% | 73% | 53% |

**Design intent:**
- 3-suspect play is **comfort food** — frequent small wins, slightly worse RTP, lowest variance.
- 6-suspect play is the **high-roller chase** — rare wins, the biggest payouts, the best RTP (essentially fair at 100%).
- Constant RTP across suspect counts was the v0.3 design goal. v0.5 *intentionally breaks it* to give players a meaningful axis of choice.

### Confirmed Payout Formula (v0.5 — matches RoundController.js)

```
GROSS PAYOUT =
  bet_amount
  × suspect_multiplier      (1.8 / 2.5 / 3.2 / 4.0 for 3/4/5/6 suspects — see table above)
  × folder_multiplier       (lerp 0.2× → 1.5× over 20→100% integrity)
  × weapon_multiplier       (1.0 / 1.5 / 3.0 for common/uncommon/rare)
  × (1 + early_bird_bonus)  (+0.15 if bet placed while folder integrity > 60%)
  × no_clue_bonus           (×1.20 if cluesPurchased === 0, else ×1.00)
  × action_modifiers        (post-MVP: DD/CHAOS/etc. — currently 1.00)

ACCUSATION #2 PENALTY: gross payout × 0.30   (down from v0.4's 0.40)

NET GAIN = gross_payout − bet_amount − clue_costs_already_paid
```

**Clue costs** are deducted from the player's balance **at click time**, not subtracted from gross at payout. If the player loses, the clue cost is also gone (information has a price, win or lose).

### Clue Costs (v0.5)

| Clue order | Cost | Rationale |
|---|---|---|
| First clue purchased | 10% of bet | "Curiosity tax" — affordable peek |
| Second clue purchased | 20% of bet | "Commitment tax" — paying double for full info |

The cost is determined by **order of purchase, not slot**. Whichever clue button the player clicks first costs 10%; the other costs 20% if also bought. Total cost for both = 30% of bet.

### No-Clue Bonus

- Active iff `cluesPurchased === 0` at the moment of payout
- Applies ×1.20 to gross payout (visible as a `NO-CLUE BONUS  ×1.20` indicator during ACCUSE)
- Lost the instant any clue is purchased — even if that clue ends up being wrong/misleading
- **Survives both accusations.** If the player buys zero clues and wins on Acc#2, they still get the bonus (then the ×0.30 Acc#2 penalty stacks on top)

### Why this passes the casino-game sniff test

- **No-clue path** has RTPs from 90% (3 suspects) to 100% (6 suspects) — comparable to real-world slots (85–96%) and blackjack with basic strategy (~99%).
- **Clue-buying path** drops to 45–73% RTP — comparable to keno or casino war (i.e., a sucker bet).
- The mathematically optimal strategy (skip clues, play 6 suspects) is also the **least informed** play. This is intentional casino design: rewards pure faith, taxes paranoia.

### Deferred — Action Cards (post-MVP)

The original v0.4 8-action card system (DOUBLE DOWN, INSURANCE, SPLIT, CASH OUT, PRESS, CHAOS ROLL, LOCK IN, SIDE SWAP) is **temporarily removed from the UI** while the clue market becomes the primary "casino move" loop. The math hooks remain in `RoundController.applyAction()` for re-integration once we figure out how action cards co-exist with the clue market. Reference design preserved below:

| Action | Math Effect | Cost |
|---|---|---|
| DOUBLE DOWN | gross × 2 | Locks current bet, can't change suspect |
| INSURANCE | gross × 1 if win; +50% back if loss | Bet amount increases by 20% |
| SPLIT | gross × 0.5 (per suspect leg) | Bet divided across 2 suspects |
| CASH OUT | 0.65 × folder_multiplier × bet | Skips reveal entirely |
| PRESS YOUR LUCK | No change to payout | Folder burns 3× faster |
| CHAOS ROLL | gross × random(0.5–3.0) | No extra cost |
| LOCK IN | Freezes folder_multiplier at current value | No extra cost |
| SIDE SWAP | Moves 50% of bet to a different suspect | No extra cost |

### The Dual Accusation System (v0.5)
Inspired by *Who's the Murderer* (芒果TV). Players get **two chances** to accuse per round. The system maps directly to blackjack logic:

```
ACCUSATION #1 (open betting window, ends on bet confirm):
  ├── CORRECT → Full payout × current multiplier
  │              + Perfect Detective Bonus: +15% if folder >60% integrity at bet lock
  └── WRONG  → "WRONG SUSPECT EXECUTED" 💀
               Innocent is dramatically killed (physics ragdoll, comedic)
               Wrong suspect dimmed + de-interacted
               Second accusation window opens (15s hard cap, no clue purchases)

ACCUSATION #2 (available only after Accusation #1 fails):
  ├── CORRECT → 30% of full gross payout  (v0.5: reduced from 40% to tighten RTP)
  │              No-clue bonus still stacks if clues were skipped
  └── WRONG  → Full loss. Ducky shakes head slowly. Case closed.

BOTH CORRECT (special bonus path, post-MVP):
  → Accusation #1 correct + player voluntarily confirms again = 
    "DOUBLE DETECTIVE" bonus: 1.5× on top of base payout
  → Deferred — not in v0.5 build
```

### Clue Market × Dual Accusation Interaction

- The Clue Market is **ACCUSE-phase only**. Locks the moment the player submits Acc#1.
- **Already-purchased clues remain visible** through SECOND_CHANCE and into the scoreboard.
- **Unpurchased clue cards** during SECOND_CHANCE show `🔒 INFORMATION CLOSED` — no late buys.
- **The No-Clue Bonus survives both accusations.** If the player skipped clues and wins on Acc#2: gross × 1.20 × 0.30.
- **Clue cost is non-refundable.** Even if Acc#2 fails completely, the clue purchase price is gone — that was the price of seeing the information.

### Why the Pool Drop Works Better Than Surrender
In blackjack, surrender is invisible — you just lose 50% and leave. Here, the pool drop is **theatrical**:
- The wrong suspect gets a cartoon gavel to the head, stumbles off screen
- The Evidence Folder instantly loses half its remaining integrity (visible burn acceleration)
- The prize pool number physically shrinks on screen with a vacuum-suck sound
- Remaining suspects look nervous — their tokens shuffle/fidget

The player feels the consequence *emotionally* before they feel it financially. That's better casino design than a silent deduction.

---

## THE MANSION — ROOM SCENES

The game is set in **Rubberduck Manor**, a ludicrously overdecorated Victorian mansion owned by Count Rubberduck. Each round takes place in a different room. Rooms rotate sequentially or randomly.

### Full Room Roster (15 Rooms)

| # | Room | Palette | Ducky Physics Interaction | Weapon Bias |
|---|---|---|---|---|
| 1 | **The Grand Ballroom** | Gold, black, chandelier glow | Ducky slides across waxed floor, knocks over candelabra | Uncommon: silver candlestick, formal invitation |
| 2 | **The Library** | Dark wood, green lamplight | Ducky headbutts bookshelf — books cascade | Common: encyclopedia, bookend, quill |
| 3 | **The Master Bedroom** | Deep purple, velvet curtains | Ducky bounces on bed, pillows explode | Common: pillow, slipper; Rare: golden alarm clock |
| 4 | **The Kitchen** | White tile, copper pots | Ducky knocks over pot rack — pots rain down | Common: rolling pin, fish; Uncommon: entire wedding cake |
| 5 | **The Garden / Hedge Maze** | Lush green, fountain mist | Ducky chases a butterfly, crashes into hedge | Common: garden shears, watering can, rake |
| 6 | **The Billiard Room** | Green felt, mahogany | Ducky accidentally pots a ball — it ricochets everywhere | Uncommon: billiard cue, 8-ball |
| 7 | **The Wine Cellar** | Stone walls, red candlelight | Ducky trips on cobblestones, barrel rolls across floor | Common: wine bottle; Rare: the Last Bottle of 1847 Champagne |
| 8 | **The Trophy Room** | Oak panels, taxidermy eyes | Ducky looks up at moose head — moose head falls | Uncommon: hunting trophy, mounted fish |
| 9 | **The Garage** | Industrial, oil stains | Ducky honks an old car horn, bonnet flies open | Common: wrench, oil can; Uncommon: vintage tire |
| 10 | **The Secret Passage** | Pure black, single torch | Ducky's torch goes out — flickering reveals a shadow | Any weapon, total darkness = mystery multiplier +0.3× |
| 11 | **The Conservatory** | Glass ceiling, jungle plants | Ducky sneezes at a fern — plant dominoes chain reaction | Common: trowel, flowerpot; Uncommon: carnivorous plant |
| 12 | **The Attic** | Dusty, cobwebs, single window | Ducky disturbs a pile of boxes — avalanche | Rare: anything antique (rare weapon chance +15% here) |
| 13 | **The Grand Staircase** | Marble, red carpet | Ducky tries to slide down banister, falls into a suit of armour | Uncommon: knight's gauntlet, helmet |
| 14 | **The Dining Room** | Long silver table, candles | Ducky pulls tablecloth trick — everything slides | Common: silver spoon, bread roll; Uncommon: entire turkey |
| 15 | **The Hot Tub / Pool Area** | Neon pool lights, night sky | Ducky cannonballs in — water splashes everything on table | Common: pool noodle; Rare: inflatable flamingo of doom |

### Room Roster — Implementation Status
12 rooms are implemented in `src/data/murders.js`. The full 15-room vision adds Garage, Conservatory, and Grand Staircase in a later pass.

**Implemented rooms:** Grand Ballroom, Library, Master Bedroom, Kitchen, Garden, Billiard Room, Wine Cellar, Trophy Room, Secret Passage, Attic, Dining Room, Hot Tub.

### Room Special Rules (confirmed)
- **Secret Passage**: Trust Score bars hidden. Clues shown as silhouettes. Mystery bonus +0.3× added to folder multiplier.
- **Attic**: Rare weapon spawn chance boosted by +15%. Higher HYPE ROUND frequency.
- **Hot Tub**: Evidence Folder replaced visually by a soggy envelope dissolving in pool water. Mechanically identical.

---

## THE CLUE MARKET — v0.5 REDESIGN

### Conceptual Shift
v0.4's clues had two problems: they spoiled the killer by name, and they auto-revealed (no player agency). v0.5 reframes clues as a **casino market** — pure theatre, optional purchase, mathematically a tax on certainty.

- Clues never name the killer.
- Players choose to buy 0, 1, or 2 clues during ACCUSE.
- Buying clues costs upfront chips; skipping them earns a +20% gross bonus.
- The casino-optimal play is to **skip all clues**. Buying them is a "fun tax" the gambler pays for the illusion of investigation.

### Clue Text Templates (12 total, no killer-name spoilers)

Each round, RoundController picks 2 templates randomly. The pool is intentionally split between **reliable, misleading, and pure flavor** so the player has no way to know in advance whether a clue is signal or noise.

**Reliable (4 templates) — hint at the killer's actual trait:**
- "Ducky found {object}. The killer reeks of {killerTrait}."
- "Ducky discovered {object} near the {weapon}. Whoever swung it was {killerTrait}."
- "The body's posture suggests someone {killerTrait}. Ducky takes notes."
- "Ducky inspects {object}. The killer left a fingerprint of {killerTrait} energy."

**Misleading (4 templates) — hint at a random NON-killer trait:**
- "Ducky pegs the killer as someone {randomTrait}, possibly."
- "Whoever did this had {randomTrait} vibes. Or so the napkins say."
- "Ducky overheard a whisper: '{randomTrait} types are the worst.'"
- "The crime scene smells faintly of {randomTrait} ambition."

**Pure flavor (4 templates) — zero info value, pure chaos:**
- "Ducky found {object}. Quack."
- "Ducky discovered {object}. The motive — {motive} — feels personal."
- "Ducky noticed the {weapon} was held clumsily — typical for murderers."
- "A second {object} appeared, identical to the first. Ducky is unsettled."

**Variables:**
- `{killerTrait}` — the actual killer's `trait` field (e.g., 'pompous', 'chaotic', 'cowardly', 'cryptic', 'eccentric', 'silent', 'dramatic', 'pedantic')
- `{randomTrait}` — a trait picked from a random non-killer suspect
- `{object}` — funny flavor object from the existing `clueEvents` pool
- `{weapon}` / `{motive}` — pulled from the round

### Clue Market Mechanics

```
At ACCUSE phase start:
  ├── 2 locked clue cards appear on the right-side panel
  ├── Each shows: "🔒 CLUE #N · BUY • $cost"
  ├── A "NO-CLUE BONUS  ×1.20" indicator pulses above them
  └── Clue feed (game messages) sits below the market

On click of a clue card:
  ├── If first purchase: cost = 10% of bet
  │   Deduct from balance immediately
  │   Card unlocks, clue text fades in
  │   No-clue bonus indicator turns gray with strikethrough
  ├── If second purchase: cost = 20% of bet
  │   Deduct from balance immediately
  │   Card unlocks
  └── Both clues now visible

On SECOND_CHANCE phase entry:
  └── Market locked
      Bought clues stay visible
      Unbought show "🔒 INFORMATION CLOSED"

On SCOREBOARD:
  └── Multiplier breakdown shows: no-clue bonus (if applied), clue costs (if paid)
```

### Why This Design

The casino-savvy player **skips clues, plays max suspects (6), accepts that 67% of rounds end as a loss, lives for the 33% wins that pay 4× minimum**. Highest RTP.

The investigator **buys both clues every round, pays 30% of bet for misleading information**. Lowest RTP — pays a 30% "anxiety tax" on top of the lost no-clue bonus.

The hedger **buys one clue to "check their gut" if they're unsure**. Splits the difference.

All three player archetypes are valid. The clue market is the *expression* of player psychology — paranoia vs faith.

---

## TRUST SCORE — v0.3 (COSMETIC ONLY, CONFIRMED)

Trust Scores are **pure theatre**. Zero mathematical relationship to outcome. All suspects have equal kill probability.

```javascript
// Confirmed implementation (RoundController.js — tickTrustScores):
// Each suspect starts at random 35–75. On every tick, drifts ±3.
// Clue reveals trigger a larger ±12 lurch for drama.
// Killer is chosen by: suspects[Math.floor(Math.random() * suspects.length)]
// Trust score has NO influence on killer selection whatsoever.
```

The bars animate when clues are revealed — dramatic lurches in any direction — purely for the vibe. Players may *believe* they correlate. That's intentional slot-machine near-miss psychology applied to a detective game.

### Burn Timer (confirmed — matches RoundController.js)

```
Start:        100% integrity
Floor:        20% (never reaches zero — payout never zeroes)
Duration:     ~45 seconds from folder ignition to floor
Normal rate:  1.78% per second
Fast rate:    3× — triggered by wrong Accusation #1 OR player takes PRESS action
Folder multiplier = lerp(0.2×, 1.5×, (integrity − 20) / 80)
Early Bird:   +15% bonus if bet locked in before folder drops below 60%
```

---

## MULTIPLAYER ARCHITECTURE (GitHub Pages Compatible)

### The Core Constraint
GitHub Pages is **100% static hosting** — no server, no WebSockets natively. The solution: use **Firebase Realtime Database** (free tier, zero backend code, pure JavaScript SDK).

Firebase free tier covers: 100 simultaneous connections, 1GB storage, 10GB/month transfer — more than enough for a Game Jam.

### Why Firebase (not others)
| Option | Verdict |
|---|---|
| **Firebase Realtime DB** ✅ | Free, JS SDK, pure static-compatible, real-time, easy auth |
| Supabase | Good but more setup, Postgres overhead unnecessary |
| Partykit | Better for large scale, overkill here |
| PeerJS (WebRTC) | P2P works but breaks when host disconnects |
| Socket.io | Requires a Node server — GitHub Pages incompatible |

### Room State Schema (Firebase)
```
/rooms/{roomCode}/
  ├── state: "lobby" | "betting" | "accusation1" | "accusation2" | "reveal" | "scoreboard"
  ├── hostId: "player_abc"
  ├── suspectCount: 4
  ├── round: {
  │     caseId: 312,
  │     victim: "The Mime",
  │     weapon: { name: "Strongly-Worded Letter", tier: "uncommon" },
  │     location: "The Ballroom",
  │     motive: "Stolen pudding cup",
  │     suspects: [ { id, name, quoteType, quote } ],
  │     actualKiller: "suspect_2",        ← determined at round start, hidden
  │     clueActions: [ "DOUBLE_DOWN", "INSURANCE" ]
  │   }
  ├── pot: { base: 1000, integrity: 87, multiplier: 1.38 }
  ├── bets: {
  │     player_abc: { suspect: "suspect_1", amount: 100, action: "DOUBLE_DOWN", locked: true },
  │     player_xyz: { suspect: "suspect_3", amount: 200, action: null,          locked: false }
  │   }
  └── players: {
        player_abc: { name: "Qinmei", balance: 2400, connected: true, avatar: 2 },
        player_xyz: { name: "Duck_Fan", balance: 1800, connected: true, avatar: 5 }
      }
```

### Multiplayer Game Flow
```
HOST creates room → 4-digit room code generated → share code
GUESTS join via code → see lobby, pick avatar
HOST presses START → round state machine begins, synced for all players

During betting:
  - All players see the same case, same clues, same burning folder
  - Each player's bet is PRIVATE until betting closes (no copying)
  - Bets are revealed simultaneously at close → Ducky points → payouts

Individual payouts (casino model):
  - Each player has their own balance
  - Each player's bet resolves independently
  - No shared pool between players (this is a casino, not a poker game)
  - House always wins its edge on every bet regardless of others
```

### Single Player (Same Code, Zero Changes)
```javascript
// Single player = multiplayer room with 1 player
// No special mode needed — just create a room and start immediately
// Game detects playerCount === 1 and skips the lobby wait timer
if (Object.keys(room.players).length === 1) {
  startRoundImmediately(); // no waiting
} else {
  waitForHostToStart(); // multiplayer lobby
}
```

### Casino Fairness in Multiplayer
The game is **fair by design** because:
1. The killer is determined by RNG at round start — no player can know early
2. Bets are hidden until close — no information advantage
3. Payouts are individual — one player winning doesn't hurt others
4. The clue actions (Double Down etc.) have fixed house edge regardless of how many players use them
5. Firebase Security Rules enforce no one can read `actualKiller` before reveal state

---

## THE DUAL ACCUSATION ROUND — FULL FLOW (v0.2)

```
0:00  Case drops. Mansion room revealed. Mad-Lib murder generated.
0:05  Suspects slide in. Trust Scores animate (cosmetic).
0:08  Ducky Clue #1 → Absurd object found → Betting Action Card A appears (8s)
0:15  Evidence Folder ignites. Accusation #1 betting window fully open.
0:30  Ducky Clue #2 → Absurd object found → Betting Action Card B appears (8s)
0:45  Last Call alarm. Folder at ~50% integrity.
0:55  Accusation #1 window closes. Multiplier locks.

1:00  ACCUSATION #1 REVEAL ──────────────────────────────────────────
      Ducky points. Lightning bolt.

      ✅ CORRECT:
         Full payout fires. Confetti. 
         "DOUBLE DETECTIVE" prompt: "Confirm again for +50% bonus?" (5 seconds)
         → Yes: declare confidence, await reveal confirmation (same result, bonus applied)
         → No: collect winnings, done

      ❌ WRONG:
         INNOCENT EXECUTED 💀 
         Suspect ragdolls off screen.
         "WRONG SUSPECT!" slams on screen.
         Prize pool visually shrinks to 40%.
         Folder burns 3× faster.
         Accusation #2 window opens (15 seconds).

1:15  ACCUSATION #2 (if triggered) ──────────────────────────────────
      Remaining suspects shown. 15-second fast window. No clue actions.
      
      ✅ CORRECT: 40% of original potential payout. "Competent, at least."
      ❌ WRONG:   Full loss. Ducky does the slow head-shake.
                  "Case Unsolved." File stamped COLD CASE.

1:20  SCOREBOARD
      Winner list. Balance changes animate. 
      Ducky does victory dance (winner) or formal bow (house wins).
      Next round teaser: room name flashes.

TOTAL ROUND: ~2:00
```

---

## REVISED SIDE BETS (Calibrated to 30/70 Chaos)

| Bet | Cost | What It Does | True Odds | Payout | House Edge |
|---|---|---|---|---|---|
| 🦆 Ducky Bribe | 15% of main bet | Eliminate 1 innocent (visual only — doesn't affect RNG) | Cosmetic | 0× (it's flavour) | 100% — it's a fun tax |
| 🌟 Weapon Roulette | Fixed 50 chips | Bet on weapon rarity tier | 60/30/10% | 1.4× / 3× / 8× | ~16% |
| 🎲 Chaos Roll | 25% of main bet | Ducky spins a wheel — random 0.5×–3× applied to your bet | Avg 1.15× | varies | ~15% |
| 🔥 Burn Bracket | Fixed 25 chips | Bet on how fast the folder burns (Early/Mid/Late crowd) | ~33% each | 2.4× | ~20% |
| ⚡ Clue Trail | Fixed 25 chips | Bet on 1, 2 or 3 clue reveals | 30/60/10% | 2× / 1.5× / 8× | ~15% |

**Note on Ducky Bribe:** It now costs a "fun tax" (15% of main bet) and does nothing mechanically (killer is pure RNG). But Ducky goes offscreen, makes suspicious noises, comes back, stamps an innocent with a big ✅. Players feel like they got info. They didn't. This is intentional casino theatre.

---

## TECH INTEGRATION NOTES

### Adding Firebase to the Static Game
```html
<!-- Add to index.html, before your game scripts -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
  import { getDatabase, ref, set, onValue }
    from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

  const firebaseConfig = { /* your config from Firebase Console */ };
  const app = initializeApp(firebaseConfig);
  window.db = getDatabase(app); // expose to game scenes
</script>
```

### Phaser Scene Integration
- `LobbyScene` — create/join room, show connected players
- `GameScene` — reads from Firebase, writes bets; single player skips lobby
- `UIScene` — watches Firebase pot integrity in real time, animates for all players

### Keeping Multiplayer Fair
Firebase Security Rules prevent reading `actualKiller` before state = "reveal":
```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        "round": {
          "actualKiller": {
            ".read": "data.parent().parent().child('state').val() === 'reveal'"
          }
        }
      }
    }
  }
}
```

---

## ✅ CONFIRMED DECISIONS (v0.5)

| Decision | Choice | Notes |
|---|---|---|
| Multiplayer payout model | **Individual payouts** | Standard casino model. Each player bets own chips, wins/loses independently. No shared pot. |
| Logic vs RNG split | **30/70 chaos** | Clues are nonsensical misdirection. Killer is pure equal-weight RNG. Trust Scores are cosmetic noise. |
| Accusation system | **Dual accusation** | Inspired by 芒果TV *Who's the Murderer*. Wrong Acc. #1 → innocent executed → 30% payout cap on Acc. #2 (v0.5 — was 40%). |
| Clue phase design | **Clue Market** (v0.5) | Player buys clues during ACCUSE: 10% bet for first, 20% for second. No-clue play earns ×1.20 bonus. Clue text never names the killer. |
| Suspect scaling | **3–6 suspects, non-linear** (v0.5) | Multipliers: 1.8 / 2.5 / 3.2 / 4.0. Higher suspect count = better RTP, lower win frequency. Variance dial. |
| RTP range (no-clue play) | **90% (3 suspects) → 100% (6 suspects)** | Comparable to slots / blackjack. With clue purchases, RTP drops to 45–73%. |
| Bet deduction timing | **Immediate, on confirm** | Chips leave the bankroll the moment CONFIRM BET fires. Clue purchases also deduct immediately. |
| Action cards | **Deferred** (post-MVP) | The 8 original action cards (DOUBLE DOWN etc.) are removed from the UI in v0.5 while the clue market becomes the primary "casino move" loop. Math hooks remain in code. |
| Multiplayer backend | **Firebase Realtime DB** | Free tier, static-compatible, no server needed. Single player = 1-player room, no lobby wait. |
| Starting balance | **1,000 chips** | Per player, per session. |

---

## CURRENT FILE STRUCTURE

```
GameJam/
├── src/
│   ├── data/
│   │   └── murders.js          ← All Mad-Lib content pools (12 rooms, victims, weapons, clues)
│   ├── systems/
│   │   └── RoundController.js  ← State machine, payout math, burn timer, bet management
│   └── scenes/
│       ├── BootScene.js
│       ├── PreloadScene.js
│       ├── MenuScene.js        ← Needs: suspect count selector before starting
│       ├── GameScene.js        ← Needs: full rewrite (round flow, suspects, accusation UI)
│       └── UIScene.js          ← Needs: action cards, dual accusation prompts, payout display
```

---

---

# 🎨 ART DIRECTION — GLOW-FI NEO-VECTOR
## Visual Presentation & Brand Specification
### Art Lead: Vegas Infinite Brand Guardian

> *"Captivating, Authentic, and Better than Life. Reject tired casino aesthetics. Build something Iconic, Unified, and Fresh."*

---

## VISUAL NORTH STAR

**Style:** Glow-Fi Neo-Vector. Clean geometric silhouettes elevated by Expressive GFX light trails and Splash GFX blooms. Every element feels pulsing, luxury-grade, and alive.

**The Rule:** If it doesn't glow, it doesn't belong on screen.

---

## COLOR SYSTEM

> **Brand Bible Verified ✓** — All hex values confirmed against Vegas Infinite Brand Bible 2025, page 42.

### Primary Working Palette (in-game priorities)

| Role | Name | Hex | Usage |
|---|---|---|---|
| Energy 1 | **VI Cyan** | `#2afeff` | Primary UI, Linear GFX dot lines, betting borders, clue reveals |
| Energy 2 | **VI Magenta** | `#fd009f` | Danger states, wrong accusation flash, suspect "guilty" vibe, HYPE round accents |
| Reward | **Vegas Gold** | `#fde054` | Win moments ONLY. Ducky accents. Rare weapon reveals. Never on passive UI. |
| Background | **Flood Black** | `#05050a` | Absolute base. Every scene. No exceptions. |
| Body Copy | **Brand Cream** | `#fbf4db` | All readable text. Never pure white (`#ffffff`). |

### Full Brand Spectrum (all 9 official VI colours)

The brand bible defines a 9-colour spectrum used across the VI visual identity. Use sparingly on dark backgrounds, in considered combinations — never allow them to become muddied.

| # | Name | Hex (approx) | RGB | In-game role |
|---|---|---|---|---|
| 1 | VI Orange | `#fc6b23` | 252, 107, 35 | Bet confirmation flash, PRESS YOUR LUCK action card |
| 2 | VI Amber | `#f59f41` | 245, 159, 65 | Uncommon weapon tier, folder 60–80% integrity |
| 3 | VI Cyan | `#2afeff` | 42, 254, 255 | **Primary UI** (confirmed exact) |
| 4 | VI Red | `#f8050e` | 248, 5, 14 | Wrong accusation full-loss flash, death moment |
| 5 | Vegas Gold | `#fde054` | 253, 225, 84 | **Win & reward** (confirmed exact) |
| 6 | VI Blue | `#1729ff` | 23, 41, 255 | LOCK IN action card, multiplier lock indicator |
| 7 | VI Magenta | `#fd009f` | 253, 0, 159 | **Danger / hype** (confirmed, prior GDD had #fb009f — corrected) |
| 8 | Brand Cream | `#fbf4db` | ~231, 244, 219 | **Body text** — never white |
| 9 | VI Purple | `#9500c6` | 149, 0, 198 | CHAOS ROLL action card, mystery suspect reveal |

### Secondary / Support

| Role | Hex | Usage |
|---|---|---|
| Cyan Bloom | `#2afeff` at 60% opacity, blur 12px | Glow layer behind all Cyan elements |
| Magenta Bloom | `#fd009f` at 50% opacity, blur 16px | Glow layer behind danger/wrong states |
| Gold Bloom | `#fde054` at 70% opacity, blur 20px | Win burst, rare weapon shimmer |
| Dot Matrix | `#2afeff` at 8% opacity | Background texture (dots, not hex lines — see GFX Toolkit) |
| Panel Surface | `#0d0d1a` | Slightly lifted dark for card/panel backgrounds |
| Muted Cream | `#fbf4db` at 40% | Secondary labels, timestamps, version text |

### The Iron Rule on Color Separation
Colours are **vibrant with strong energy** — use sparingly and set them off in dark backgrounds. Use considered combinations; take care to never allow them to become muddied. Cyan and Magenta must **never touch directly** — always separate with a Flood Black gap of minimum 8px or a dark panel layer. Gold is the **reward color** — if it appears on passive UI, it loses its signal value entirely. Guard it.

---

## TYPOGRAPHY SYSTEM

> **Brand Bible Verified ✓** — Font spec confirmed: Capitana Extra Bold (tracking 53), Capitana Light (tracking 2). Brand Bible page 40.

| Role | Font | Weight | Case | Tracking | Usage |
|---|---|---|---|---|---|
| Headings | Capitana | Extra Bold | ALL CAPS | **53** | Case titles, room names, ACCUSATION!, WIN, COLD CASE |
| Subheadings | Capitana | Regular | ALL CAPS | **53** | Suspect names, weapon names, action card labels |
| Body | Capitana | Light | Sentence case | **2** | Suspect quotes, alibi text, tooltip descriptions |
| Mono/Data | Fallback: Courier New | Regular | ALL CAPS | 0 | Balance amounts, multiplier numbers, round timer |

### Implementation Note
Capitana is a licensed typeface. For the Game Jam prototype, use **Oswald Extra Bold** (Google Fonts, free) as a stand-in — same compressed extra-bold profile. Replace with Capitana before final submission.

```html
<!-- Add to index.html <head> -->
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;700&display=swap" rel="stylesheet">
```

Then update `src/utils/constants.js`:
```javascript
VI.FONTS.HEADING = 'Oswald';   // 700 weight → replaces Capitana Extra Bold
VI.FONTS.BODY    = 'Oswald';   // 300 weight → replaces Capitana Light
```

---

## HOLDING DEVICES

Every suspect portrait, weapon clue, and key UI element must live inside an official **Hexagonal** or **Circular** Holding Device with a neon-glow border. No raw floating sprites.

### Hexagonal Device — Suspect Portraits
```
Shape:        Regular hexagon, flat-top orientation
Size:         140px wide × 162px tall (standard), 180×208 (selected/active)
Fill:         #0d0d1a (panel dark)
Border:       2px stroke — Cyan (#2afeff) at rest; Gold (#fde054) when selected
Glow:         Cyan bloom, blur 10px, spread 0, at 70% opacity
Inner shadow: #2afeff at 15%, blur 6px inset — gives depth
On hover:     Border scales to 3px, glow intensity +40%, subtle scale(1.05) tween
On guilty:    Border flashes Magenta → Gold sequence (0.3s each)
```

### Circular Device — Weapons, Chips, Clue Objects
```
Shape:        Circle
Size:         80px diameter (chips), 100px (weapon clue), 60px (side-bet icons)
Fill:         #0d0d1a
Border:       2px — Gold for weapons, Cyan for chips, Magenta for danger bets
Glow:         Matching color bloom at blur 8px, 60% opacity
```

### Linear GFX Connectors
Thin glowing lines connect suspects to their quote bubbles and the case file to the room title.
```
Stroke:       1px, Cyan #2afeff at 50% opacity
Glow:         Duplicate stroke at 4px, #2afeff at 20%, blur 4px
Animation:    Dash-offset animation (marching ants) at 40px/s during betting window
End caps:     Small circle (4px radius) with Cyan bloom
```

---

## VI GFX TOOLKIT — ASSET CATEGORIES

> **Brand Bible Verified ✓** — The VI visual language is built from five named GFX libraries. These are NOT drawn freehand — they are reusable prefab graphic elements placed intentionally. Source: Brand Bible pages 43–80.

### 1. Linear GFX (dot matrices)
Arrays of coloured dots in geometric formations — lines, grids, half-circles, fans. These are the **background texture** of the VI brand. They replace the hex-grid concept.
- Use at 6–10% opacity as room atmosphere layers
- Colour-tinted per room's accent colour
- Variants: Linear (straight), Radial (circle), Fan (spread), Diagonal (angled cross)
- Phaser implementation: draw as `fillCircle` calls in a generated texture, not hex outlines

### 2. Accent GFX (cascading dot arcs)
Curved, U-shaped formations of dots that cascade downward — like waterfalls of light. Used to frame scene transitions, round-start reveals, and accusation moments.
- Place in corners or off-screen edges, partially cropped
- Colour: full-spectrum gradient (cyan→blue at top, magenta→gold at bottom typical)
- Scale: large (>300px tall) for dramatic moments; small for ambient decoration

### 3. Expressive GFX (neon light-trail streaks)
Long-exposure-style flowing neon curves — the brand's signature "speed of light" motif. These are the HERO elements for cinematic moments.
- Win reveals: an Expressive GFX streak fires across the table
- Wrong accusation: a harsh orange-red streak slashes the screen
- Clue reveal: a shorter cyan arc pulses from the evidence folder
- These sweep from off-screen, linger briefly, then fade (opacity 1.0→0, 0.8s)

### 4. Splash GFX (gradient blob blooms)
Soft luminous blobs of gradient colour — like coloured light projected onto a dark surface. Used for atmospheric room backgrounds and win-celebration bursts.
- Room backgrounds: place 1–2 Splash GFX behind the playing field at 25–40% opacity
- Win celebration: Splash GFX burst (scale 0→1.5, 0.3s, then fade)
- Colour per mood: warm orange-red for tension; cyan-magenta for mystery; gold for win

### 5. Holding Devices (hex & circle frames)
> Already documented in the Holding Devices section above. Style confirmed: neon-glow stroke, 2–3px border, matching bloom layer, black interior. Both hexagonal and circular variants are official VI assets.

---

## DUCKY — MASCOT ART DIRECTION

Ducky is the star. He is rendered as a **high-gloss Neo-Vector toy** — not a cartoon, not a photo, not a VR avatar. A collectible luxury figurine brought to life.

### Ducky Visual Spec
```
Body:         Smooth vector egg shape, base color #FFD700 (warm yellow)
Gloss:        White highlight overlay (ellipse, 30% opacity) on upper-left body
              = the "toy shine" that makes him feel plastic and premium
Beak:         #FF8C00, slightly rounded rectangle, 2px dark outline
Eyes:         Solid black circles with a tiny white specular dot (top-right)
Accessories:  Deerstalker hat — dark Flood Black with Gold (#fde054) band
              Trench coat — #1a1a2e dark navy, Cyan lapel trim
              Magnifying glass — Gold frame, Cyan lens bloom
Gold Accents: Hat band, magnifying glass frame, button details — all #fde054
              Each gold element has a Gold Bloom (blur 8px, 50% opacity)
Outline:      2px stroke, #05050a — separates him from glowing backgrounds
Scale:        Ducky is always slightly larger than the suspects — he's the HOST
```

### Ducky Emotional State Treatments

| State | Visual Change |
|---|---|
| **Idle** | Gentle bob tween (y ±4px, 2s loop). Hat tilted 5°. |
| **Investigating** | Leans forward 8°. Magnifying glass raised. Cyan glow from lens. |
| **Clue Found** | Body scale pulse (1.0 → 1.15 → 1.0, 0.3s). Gold particle burst from beak area. |
| **Pointing (Reveal)** | Wing extends. Gold Linear GFX line draws from wing tip to suspect hex. |
| **Player Wins** | Full body spin (360°, 0.5s). Hat flies off (separate physics object). Confetti emitter from body. |
| **Player Loses** | Slow 15° head-shake (left-right-left, 1.2s). Eyes droop (scale y 0.7). |
| **HYPE ROUND** | Sparkler appears in wing. Magenta and Cyan trails from body. Scale 1.1× persistent. |

---

## THE GAME TABLE — SCENE COMPOSITION

### Layer Stack (back to front)
```
Layer 1 — Flood Black base (#05050a), fills entire canvas
Layer 2 — Hex grid texture: SVG hex pattern, Cyan at 8% opacity, perspective-skewed
Layer 3 — Room identity panel: top-center banner, room name in Capitana Extra Bold
Layer 4 — Linear GFX atmosphere: 3–4 faint diagonal glow lines crossing the field
Layer 5 — Suspect hex portraits arc (center stage, shallow curve)
Layer 6 — Trust score bars beneath each suspect hex (cosmetic, animated)
Layer 7 — Case file zone: top-left, dark panel with Cyan border
Layer 8 — Evidence Folder: center-right, physical prop with burn state
Layer 9 — Ducky: stage-left, always above suspects in z-order
Layer 10 — Betting tray: bottom strip, dark panel, chip row
Layer 11 — Action card slot: bottom-center, slides up from below canvas edge
Layer 12 — Toast/FX layer: win bursts, wrong-suspect flash, confetti — always on top
```

### The Living Table
The **dot matrix** in Layer 2 pulses in sync with the folder burn:
- At 100% integrity: dots at 8% opacity, static
- At 60% integrity: dots brighten to 14%, subtle ripple outward from folder position
- At 20% integrity (floor): dots at 22% opacity, rapid flicker (simulates electrical tension)

This makes the entire play surface feel pressurised as time runs out — no extra assets needed.

---

## SUSPECT HEX PORTRAITS — COMPOSITION

Each suspect is a self-contained Hex Holding Device. Inside the hex:

```
Background:   Radial gradient from #1a1a30 (center) to #05050a (edge)
Character:    Simple geometric silhouette — unique shape per suspect (see below)
Name:         Capitana Extra Bold, ALL CAPS, Brand Cream, tracking 50
              Centered below hex, outside the holding device
Quote bubble: Dark panel (#0d0d1a), Cyan 1px border, Brand Cream Capitana Light text
              Connected to hex by Linear GFX line
Trust bar:    Thin rectangle below name, color lerps Magenta→Cyan→Gold based on value
              Animates with spring tween on each tick
```

### Suspect Silhouette Language (asset-light, geometric)
Each suspect is a distinct **geometric silhouette** — built from 3–5 basic shapes only. No detailed illustration required.

| Suspect | Silhouette | Primary Color |
|---|---|---|
| The Butler | Tall rectangle body, small circle head, bowtie triangle | `#8866aa` |
| The Chef | Stocky rectangle, tall chef hat cylinder above | `#ff6644` |
| The Mayor | Wide rectangle, top hat, tiny circle head | `#4488ff` |
| The Janitor | Medium rectangle, mop handle diagonal line | `#44cc88` |
| Count Rubberduck | Cape triangle sweeping behind rectangle body | `#fde054` |
| The Mime | Slim rectangle, beret circle, vertical stripe accents | `#fbf4db` |
| The Duchess | Hourglass silhouette, tall hair up, fan shape hand | `#ff44aa` |
| The Librarian | Rectangle with stack of rectangles (books) balanced on arm | `#44ffcc` |

All silhouettes render inside the Hex Holding Device. The silhouette color is used as the **hex border color** for that suspect — giving instant visual identity across all UI states.

---

## EVIDENCE FOLDER — VISUAL TREATMENT

The Evidence Folder is a **physical prop** at center-right of the table. It is the most important visual element — players watch it constantly.

### Folder States

| Integrity | Visual |
|---|---|
| 100–80% | Dark panel (`#0d0d1a`), thin Gold border, label "CASE FILE" in Capitana, faint Gold glow |
| 80–60% | Edge pixels shift orange (`#ff6600`). Tiny Magenta particle emitter at corners (2 particles/s) |
| 60–40% | Corner flames — Magenta/Gold gradient sprite, smoke particles rising (Gray, additive blend) |
| 40–20% | Half the folder shape is gone (clip mask). Active flame emitter, ash flake particles fall |
| 20% floor | Folder is an ash silhouette with a single glowing coal — Cyan glow, pulsing 1s cycle |

### Multiplier Badge
Floating above the folder at all times:
```
Shape:        Circular Holding Device, 56px diameter
Fill:         #0d0d1a
Border:       Gold (#fde054), 2px, Gold bloom
Text:         Current multiplier value — Capitana Extra Bold, Vegas Gold, e.g. "1.42×"
Animation:    On each integrity drop tick — brief scale pulse (1.0→1.08→1.0, 0.15s)
```

---

## BETTING TRAY — UI COMPOSITION

### Layout
Bottom 80px strip of the canvas. Dark panel `#0d0d1a`, top border 1px Cyan.

### Chips (Circular Holding Devices)
Each chip denomination sits in a 64px circle:

| Value | Border Color | Label Color |
|---|---|---|
| 1 | `#fbf4db` (Cream) | `#05050a` |
| 5 | `#fd009f` (Magenta) | `#fbf4db` |
| 25 | `#2afeff` (Cyan) | `#05050a` |
| 100 | `#fde054` (Gold) | `#05050a` |
| 500 | Magenta + Gold alternating ring | `#fde054` |

Chip glow: border color bloom at blur 6px, 50% opacity. On hover: scale 1.12, glow +30%.

### Balance Display
```
Label:   "BALANCE" — Capitana Regular ALL CAPS, Brand Cream, tracking 50, 12px
Value:   Capitana Extra Bold ALL CAPS, Vegas Gold, 24px
         On decrease: brief Magenta flash (0.2s)
         On increase: brief Gold bloom burst (0.3s)
Position: Bottom-left of screen, clear of chips
```

---

## BETTING ACTION CARDS

Action cards are the **drama moment** of the clue phase. They must feel like a physical card being dealt onto the table — not a popup.

### Card Design
```
Shape:        Rounded rectangle, 280×160px, corner radius 12px
Fill:         #0d0d1a
Border:       3px — Cyan for beneficial actions, Magenta for risky actions
Glow:         Border color bloom at blur 14px, 70% opacity
Header:       Action label — Capitana Extra Bold ALL CAPS, tracking 50
              Color: Cyan for safe, Magenta for risky, Gold for CHAOS ROLL
Description:  Capitana Light, Brand Cream, sentence case
Countdown:    Thin arc progress ring around card perimeter, Cyan, drains over 8 seconds
Ducky gag:    Small text line — italic, Brand Cream 40%, e.g. "Ducky ate the evidence."
```

### Card Entry Animation
```
1. Card starts below canvas (y = height + 200)
2. Slides up with cubic-ease-out over 0.35s
3. On arrival: Cyan bloom burst (scale 1.0→1.4→1.0 on glow layer, 0.2s)
4. Countdown arc begins immediately
5. On expiry: card drops back down, no fanfare
6. On activation: Gold burst, card scale 1.0→1.2→0 (pop and vanish, 0.25s)
```

---

## KEY SCENE COMPOSITIONS

### Scene A: CASE REVEAL (0:00–0:05)
```
1. Screen is Flood Black
2. A Cyan Linear GFX line draws horizontally across center (0.3s)
3. Case file panel slams down from above (physics bounce, settles)
   — Panel: dark #0d0d1a, Cyan hex-corner brackets (not a full border — just corner marks)
   — "CASE #247" in Capitana Extra Bold, Vegas Gold, tracking 50
   — Room name: Capitana Regular ALL CAPS, Cyan
4. Mad-Lib words type in one by one:
   — Victim name: Magenta
   — Weapon name: Tier color (Cream / Cyan / Gold)
   — Location: Brand Cream
5. If RARE weapon: Gold bloom explosion fills screen for 0.4s, "HYPE ROUND" stamps in
```

### Scene B: WRONG ACCUSATION (Accusation #1 fail)
```
1. Screen edge flash: Magenta, 2px border, 0.3s pulse × 3
2. Wrong suspect hex: border switches Magenta, scale bounces (1.0→1.3→0.8→1.0)
3. "WRONG SUSPECT" text slams in: Capitana Extra Bold, Magenta, tracking 50
   — Text has Magenta bloom, blur 20px
4. Suspect hex cracks: a Magenta fracture line Linear GFX draws across the hex
5. Hex shrinks to 0 with a vacuum-suck ease-in (0.4s)
6. Folder multiplier badge: Magenta flash, number drops to new value
7. Remaining suspects: brief white pulse on their hexes — they're nervous
```

### Scene C: THE REVEAL (Ducky Points)
```
1. All audio/animation pauses for 1.2s — the "dead air" beat
2. Ducky's wing extends toward the killer's hex
3. A Vegas Gold Linear GFX line draws from Ducky's wing tip to the hex border
   — Line trails Gold particles as it draws (particle trail, additive blend)
4. Killer hex: border pulses Gold → Magenta → Gold (rapid, 3 cycles)
5. "GUILTY" stamps across the hex in Capitana Extra Bold, Magenta, with Magenta bloom
6. Win path: Gold bloom fills the screen from the hex outward, confetti emitter activates
7. Loss path: Cyan drains from all elements simultaneously (desaturation tween, 0.8s)
```

### Scene D: WIN STATE
```
1. Gold bloom: radial gradient from winner's suspect hex, fills 60% of screen then fades
2. Confetti: Cyan, Magenta, Gold particles — emitter at top-center, physics fall
3. Payout badge: Gold Circular Holding Device, large (120px), slams in center
   — "+1,240 CHIPS" in Capitana Extra Bold Vegas Gold
4. Ducky: full 360° spin, hat physics-launches upward, Magenta+Cyan trails from body
5. Balance counter: ticks up with each chip particle landing (satisfying counter animation)
```

### Scene E: COLD CASE (full loss)
```
1. A red evidence stamp — but in Magenta, not red — slams diagonally across the case file
   — "COLD CASE" in Capitana Extra Bold
2. All suspect hexes: borders fade from Cyan to Muted Cream (40%), glow off
3. Ducky: slow head shake, eyes droop, shuffles off-screen left
4. Screen: brief desaturation vignette (the Flood Black "closes in" from edges)
5. Loss amount: Capitana Light, Brand Cream at 60%, bottom-center, quiet
```

---

## ROOM ATMOSPHERE — GLOW-FI TREATMENTS

Rooms are not illustrated backgrounds. They are **colour atmosphere shifts** on the dot-matrix layer and Splash GFX system. The room identity comes from:

1. **Accent colour** tinting the Linear GFX dot matrix (defined per room's `accent` field in `murders.js`)
2. **A Splash GFX bloom** behind the playing field — colour matched to the room accent, 25–35% opacity
3. **A single iconic prop silhouette** in the top-right corner (geometric, 15% opacity)
4. **Case file header** naming the room

| Room | Dot Matrix Tint | Splash GFX Colour | Iconic Prop Silhouette | Atmosphere |
|---|---|---|---|---|
| Grand Ballroom | Gold `#fde054` at 8% | Warm gold bloom | Chandelier (circle + radiating lines) | Glamour |
| Library | Green `#44cc44` at 8% | Soft green splash | Bookshelf (stacked rectangles) | Intellectual |
| Master Bedroom | Purple `#bb44ff` at 8% | Purple-magenta bloom | Four-poster bed frame | Intimate |
| Kitchen | Orange `#fc6b23` at 8% | Orange-red splash | Pot rack (horizontal bar + hanging circles) | Chaotic |
| Secret Passage | No dots — pure 