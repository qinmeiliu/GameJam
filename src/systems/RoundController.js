// ============================================================
// RoundController.js – Self-contained round generator
// Instantiated fresh each round: new RoundController(suspectCount)
// All methods return data directly; no scene references / timers.
// Burn timer and game loop are driven by GameScene.
// ============================================================

class RoundController {

  constructor(suspectCount) {
    this.suspectCount = suspectCount || 4;

    // These are all set by _generate() and exposed directly:
    this.suspects  = [];     // Array of suspect objects (with .name, .color, .alibi, .quote)
    this.killerIdx = -1;     // Index into this.suspects
    this.victim    = null;   // { victimName, trait }
    this.weaponName = '';
    this.weaponTier = 'common';
    this.roomName   = '';
    this.motive     = '';
    this.clues      = [];    // [{ text }, { text }] — revealed at 12s and 24s

    // ── Action state (GDD v0.4 canonical 8 actions) ─────────
    this._actionUsed    = {};      // { id: true } — one-shot per action per round
    this._lockedFolder  = null;    // LOCK_IN: folder integrity frozen at lock time
    this._chaosRoll     = null;    // CHAOS_ROLL: random 0.5-3.0 factor rolled when activated
    this._earlyBird     = false;   // true if bet was locked while folder > 60%
    this._cashedOut     = false;   // CASH_OUT short-circuits the reveal
    this._lockedBet     = 0;       // bet amount snapshot at confirm time — drives clue costs
    this._deadEyeWager  = 0;       // DEAD-EYE side bet — paid only on Acc#1 correct

    this._generate();
  }

  // ── DEAD-EYE side bet ────────────────────────────────────
  // Opt-in pre-round wager. Pays out if and only if the player nails the
  // killer on FIRST accusation (Acc#1). Forfeited on Acc#2 win or any loss.
  // Wager is set by UIScene on bet confirm; main GameScene deducts it from
  // balance at confirm time and credits any payout via _resolveWin.
  setDeadEyeWager(wager) {
    this._deadEyeWager = Math.max(0, Math.round(wager || 0));
  }
  getDeadEyeWager() {
    return this._deadEyeWager;
  }
  // Returns the side-bet PAYOUT (gross including stake) on Acc#1 correct,
  // or 0 if not eligible. Uses suspectCount-based payout shift so the bet
  // scales with table size: N=3 pays 2.7×, N=4 pays 3.7×, ... N=6 pays 5.7×.
  calculateDeadEyePayout(secondAccusation) {
    if (this._deadEyeWager <= 0) return 0;
    if (secondAccusation)        return 0;        // Acc#2 forfeits the side bet
    const shift = (VI.GAME.DEAD_EYE_PAYOUT_SHIFT != null) ? VI.GAME.DEAD_EYE_PAYOUT_SHIFT : 0.30;
    return Math.round(this._deadEyeWager * (this.suspectCount - shift));
  }

  // ── Round Generation ──────────────────────────────────────

  _generate() {
    const d = MURDER_DATA;

    // VICTIM — from the dedicated victim roster (pompous duck aristocrats).
    // Carries narrative flavour (title, deathVerb) for the BETTING-phase case file.
    const v          = d.victimRoster[Math.floor(Math.random() * d.victimRoster.length)];

    // Room
    const room       = d.rooms[Math.floor(Math.random() * d.rooms.length)];

    // Weapon tier (weighted)
    const tierRoll   = Math.random();
    let weaponTier;
    if (tierRoll < d.weaponTierWeights.rare ||
        (room.rareBonus && Math.random() < room.rareBonus)) {
      weaponTier = 'rare';
    } else if (tierRoll < d.weaponTierWeights.rare + d.weaponTierWeights.uncommon) {
      weaponTier = 'uncommon';
    } else {
      weaponTier = 'common';
    }
    const weaponPool = d.weapons[weaponTier];
    const weaponName = weaponPool[Math.floor(Math.random() * weaponPool.length)];

    // Motive
    const motive     = d.motives[Math.floor(Math.random() * d.motives.length)];

    // SUSPECTS — from the suspect roster (kept as `victims` for legacy reasons).
    // Pool is independent of the victim now, so any character can be a suspect.
    const shuffled   = this._shuffle([...d.victims]).slice(0, this.suspectCount);
    this.killerIdx   = Math.floor(Math.random() * shuffled.length);

    // Pick a unique alibi quote for each suspect — no two suspects should
    // say the same thing in the same round. Track used quote *functions*
    // across all types so cross-type collisions also can't repeat.
    const usedQuotes = new Set();
    const pickUniqueQuote = (type) => {
      const pool = this._shuffle([...d.quoteTemplates[type]]);
      let fn = pool.find(q => !usedQuotes.has(q));
      if (!fn) {
        // Pool exhausted (more suspects of this type than quotes) — accept
        // a repeat from a different type rather than from the same pool.
        fn = pool[0];
      }
      usedQuotes.add(fn);
      return fn(weaponName, motive);
    };

    // v0.5: quote-type rolls no longer give away who the killer is.
    //   Killer  → 60% guilty / 40% sus     (sometimes acts shifty without confessing)
    //   Other   → 20% guilty / 40% sus / 40% clueless  (innocents can sound guilty too)
    // Result: a "guilty" quote is no longer a smoking gun — it could be any suspect.
    const rollQuoteType = (isKiller) => {
      const r = Math.random();
      if (isKiller) {
        return r < 0.60 ? 'guilty' : 'sus';
      }
      if (r < 0.20) return 'guilty';
      if (r < 0.60) return 'sus';
      return 'clueless';
    };

    this.suspects = shuffled.map((s, i) => {
      const isKiller  = (i === this.killerIdx);
      const quoteType = rollQuoteType(isKiller);
      return {
        id:      s.id,
        name:    s.name,
        color:   s.color,
        traits:  s.traits || [s.trait],   // v0.5.1: array (2 traits per character)
        trait:   (s.traits && s.traits[0]) || s.trait,  // legacy compat — first trait
        alibi:   pickUniqueQuote(quoteType),
        quoteType,
        trustScore: 35 + Math.floor(Math.random() * 40),
      };
    });

    this.victim      = {
      id:         v.id,
      victimName: v.name,
      title:      v.title,
      deathVerb:  v.deathVerb,
    };
    this.weaponName  = weaponName;
    this.weaponTier  = weaponTier;
    this.roomName    = room.name;
    this.roomId      = room.id;        // texture key for `bg-<roomId>` lookups in GameScene
    this.roomAccent  = room.accent;    // currently unused but plumbs the per-room accent color
    this.motive      = motive;

    // ── v0.5: CLUE MARKET ────────────────────────────────────
    // Pick two random clue templates from the 18-template pool. Bind the
    // {placeholder} variables with round data. Templates never name the
    // killer; they only hint at trait, weapon, motive, or pure flavor.
    const objectPool = this._shuffle([...d.clueEvents]);
    const templatePool = this._shuffle([...d.clueTemplates]).slice(0, 2);

    // v0.5.1: each suspect has TWO traits. Reliable clues pick ONE of the
    // killer's two traits at random. The trait will also be shared by one
    // other suspect (per the 8-cycle design), so the player narrows to 2.
    const killerTraitList = this.suspects[this.killerIdx].traits || [this.suspects[this.killerIdx].trait];
    const killerTrait = killerTraitList[Math.floor(Math.random() * killerTraitList.length)];

    // Misleading clues pick a random trait from a random non-killer. May
    // coincidentally land on a trait the killer also has (one of the killer's
    // two) — in which case the "misleading" clue is accidentally reliable.
    // The player can't tell signal from noise. Intentional chaos.
    const innocents = this.suspects.filter((_, i) => i !== this.killerIdx);
    const pickRandomTrait = () => {
      if (innocents.length === 0) return killerTrait;
      const inn = innocents[Math.floor(Math.random() * innocents.length)];
      const list = inn.traits || [inn.trait];
      return list[Math.floor(Math.random() * list.length)];
    };

    this.clues = templatePool.map((tpl, i) => {
      const obj = objectPool[i % objectPool.length];
      const text = tpl.text
        .replace(/\{object\}/g,      obj.object)
        .replace(/\{killerTrait\}/g, killerTrait)
        .replace(/\{randomTrait\}/g, pickRandomTrait())
        .replace(/\{weapon\}/g,      weaponName)
        .replace(/\{motive\}/g,      motive);
      return {
        text,
        tier:     tpl.tier,                  // 'reliable' | 'misleading' | 'flavor' (informational only)
        bought:   false,                     // becomes true on buyClue(i)
        cost:     0,                         // populated by getClueCost(i) on each call
      };
    });

    // Clue market state — purchases happen via buyClue()/skipped by leaving
    // the cards locked. cluesPurchased is consulted by calculatePayout for
    // the No-Clue Bonus.
    this.cluesPurchased = 0;
  }

  // ── Clue market (v0.5) ────────────────────────────────────

  /**
   * Cost of buying clue at index `idx` GIVEN the current cluesPurchased count.
   * Order-based pricing: FIRST clue purchased costs CLUE_COST_FIRST_FRAC × bet,
   * SECOND costs CLUE_COST_SECOND_FRAC × bet. Doesn't matter which card was
   * clicked first; what matters is how many are already bought.
   */
  getClueCost(bet) {
    const isFirst = this.cluesPurchased === 0;
    const frac = isFirst ? VI.GAME.CLUE_COST_FIRST_FRAC : VI.GAME.CLUE_COST_SECOND_FRAC;
    // Prefer the bet that was snapshotted at confirm time. The argument is
    // a fallback for callers that don't have access to the locked value
    // (or for early renders before bet is confirmed — those should still
    // show a reasonable number).
    const effectiveBet = (this._lockedBet > 0) ? this._lockedBet : (bet || 0);
    return Math.max(1, Math.round(effectiveBet * frac));
  }

  /**
   * Mark a clue as purchased. Returns the cost paid (caller deducts from balance).
   * Returns 0 if the clue was already bought (no double-charge).
   */
  buyClue(idx, bet) {
    if (idx < 0 || idx >= this.clues.length) return 0;
    if (this.clues[idx].bought) return 0;
    const cost = this.getClueCost(bet);
    this.clues[idx].bought = true;
    this.clues[idx].cost   = cost;
    this.cluesPurchased++;
    return cost;
  }

  /** True iff the No-Clue Bonus multiplier should apply at payout time. */
  isNoClueBonusActive() {
    return this.cluesPurchased === 0;
  }

  // ── Bet lock-in (drives Early Bird bonus) ─────────────────

  /**
   * Called by GameScene when the player confirms a bet. Records:
   *  - Early Bird eligibility (bet locked while folder > 60%)
   *  - The bet amount itself, used by getClueCost so the cost calc doesn't
   *    depend on the caller passing the bet correctly every time. Avoids
   *    bugs where stale scene state caused clue prices to always show $1.
   */
  registerBetLock(folderPct, bet) {
    this._earlyBird = folderPct > 0.60;
    if (typeof bet === 'number' && bet > 0) {
      this._lockedBet = bet;
    }
  }

  // ── Payout (GDD v0.4 canonical formula) ───────────────────
  //
  //   GROSS = bet × suspectMult × folderMult × weaponMult
  //               × (1 + earlyBird ? 0.15 : 0)
  //               × actionModifiers
  //
  //   Acc#2 (wrongCount=1, then correct) → GROSS × 0.40
  //
  // Returns 0 when the picked suspect isn't the killer (caller handles
  // INSURANCE refund separately via getInsuranceRefund()).

  calculatePayout(bet, suspectIdx, folderPct, opts) {
    opts = opts || {};
    const isSecondAccusation = !!opts.secondAccusation;

    if (suspectIdx !== this.killerIdx) return 0;

    const grossMult = this.getPayoutMultiplier(suspectIdx, folderPct);
    let payout      = bet * grossMult;

    // Action-driven modifiers (deferred post-MVP, kept for forward compat)
    if (this._actionUsed['DOUBLE_DOWN']) payout *= 2;
    if (this._actionUsed['SPLIT'])       payout *= 0.5;
    if (this._chaosRoll !== null)        payout *= this._chaosRoll;

    // Accusation #2 penalty (v0.6: gross × 0.55 — was 0.30 in v0.5, raised
    // so Acc#2 wins feel like wins instead of partial losses)
    if (isSecondAccusation) payout *= VI.GAME.ACC2_PENALTY;

    return Math.round(payout);
  }

  /**
   * CASH_OUT payout: locked at 0.65 × folder_multiplier × bet (GDD spec).
   * Round-ends immediately — no reveal, no risk, no other modifiers.
   */
  calculateCashOut(bet, folderPct) {
    const foldMult = this._folderMultiplier(this._lockedFolder !== null ? this._lockedFolder : folderPct);
    return Math.round(0.65 * foldMult * bet);
  }

  /**
   * INSURANCE: when the player loses but had Insurance active, they get
   * back 50% of their (insurance-uplifted) bet. The +20% bet uplift is
   * applied client-side at the moment INSURANCE is taken.
   */
  getInsuranceRefund(bet) {
    return this._actionUsed['INSURANCE'] ? Math.round(bet * 0.50) : 0;
  }

  /**
   * Returns the canonical gross multiplier so the UI can show "1.42×" in
   * real time without re-deriving it. v0.5: non-linear suspect mults,
   * plus the No-Clue Bonus stacks ×1.20 when cluesPurchased === 0.
   */
  getPayoutMultiplier(suspectIdx, folderPct) {
    const folderUsed = (this._lockedFolder !== null) ? this._lockedFolder : folderPct;
    const suspMult   = VI.GAME.SUSPECT_MULTS[this.suspectCount] || (this.suspectCount * 0.9);
    const foldMult   = this._folderMultiplier(folderUsed);
    const weapMult   = MURDER_DATA.weaponMultipliers[this.weaponTier] || 1.0;
    const earlyMult  = this._earlyBird ? (1 + VI.GAME.EARLY_BIRD_BONUS) : 1.0;
    const clueMult   = this.isNoClueBonusActive() ? VI.GAME.NO_CLUE_BONUS_MULT : 1.0;
    return suspMult * foldMult * weapMult * earlyMult * clueMult;
  }

  /**
   * Detailed multiplier breakdown for the scoreboard. Useful when the UI
   * wants to show "base 2.5× · folder 0.85× · weapon 1.05× · early +15% ·
   * no-clue +20%" instead of a single combined number.
   */
  getPayoutBreakdown(suspectIdx, folderPct) {
    const folderUsed = (this._lockedFolder !== null) ? this._lockedFolder : folderPct;
    return {
      suspMult:  VI.GAME.SUSPECT_MULTS[this.suspectCount] || (this.suspectCount * 0.9),
      foldMult:  this._folderMultiplier(folderUsed),
      weapMult:  MURDER_DATA.weaponMultipliers[this.weaponTier] || 1.0,
      earlyBird: !!this._earlyBird,
      noClue:    this.isNoClueBonusActive(),
      cluesPurchased: this.cluesPurchased,
    };
  }

  // Best-case-scenario preview used by UIScene during BETTING to display
  // "WIN UP TO $XXX" next to the bet counter. Assumes the player locks
  // their bet at full folder integrity (Early Bird ✓), buys zero clues
  // (No-Clue Bonus ✓), and accuses correctly on the first attempt.
  // Does NOT account for Accusation #2 (which caps payout at 30%).
  getMaxPotentialPayout(bet) {
    if (!bet || bet <= 0) return 0;
    const suspMult  = VI.GAME.SUSPECT_MULTS[this.suspectCount] || (this.suspectCount * 0.9);
    const foldMult  = this._folderMultiplier(1.0);                                    // 1.5× at full integrity
    const weapMult  = MURDER_DATA.weaponMultipliers[this.weaponTier] || 1.0;
    const earlyBird = 1 + (VI.GAME.EARLY_BIRD_BONUS != null ? VI.GAME.EARLY_BIRD_BONUS : 0.15);
    const noClue    = VI.GAME.NO_CLUE_BONUS_MULT || 1.25;
    return Math.round(bet * suspMult * foldMult * weapMult * earlyBird * noClue);
  }

  _folderMultiplier(pct) {
    // v0.6.1: lerp 0.55× (at 20% integrity floor) → 1.5× (at 100%).
    // Raised floor from 0.4 so a player who wins on Acc#2 (where folder is
    // at the 20% floor) gets a positive return at all suspect counts — the
    // v0.6 version still produced net losses on N=3 Acc#2 wins, which is
    // confusing for a "winning" outcome.
    const clamped = Math.max(0.2, Math.min(1.0, pct));
    return 0.55 + ((clamped - 0.2) / 0.8) * 0.95;   // 0.55 + 0.95 = 1.5 at full
  }

  // ── Action cards (GDD v0.4 canonical 8) ───────────────────
  //
  //  Each action returns an object describing the *side-effects* the
  //  GameScene/UIScene need to apply (bet changes, suspect cycles, burn
  //  speed boosts). RoundController owns the math state; scenes own the
  //  visual/audio/timer state.
  //
  //  Return shape (all keys optional):
  //    { text, betDelta, multBet, cycleSuspect, burnMultiplier,
  //      lockFolder, cashOut, chaosRoll }
  //
  //  betDelta:        amount to add to current bet
  //  multBet:         multiplier to apply to current bet (e.g. 2 for DD, 1.2 for INSURANCE)
  //  cycleSuspect:    +1 to advance selectedIdx to next suspect (SIDE_SWAP)
  //  burnMultiplier:  factor for folder burn speed (PRESS = 3)
  //  lockFolder:      true → freeze folder multiplier
  //  cashOut:         true → end round immediately at CASH_OUT payout
  //  chaosRoll:       the rolled random multiplier (so UI can display it)

  applyAction(id) {
    if (this._actionUsed[id]) return null;
    this._actionUsed[id] = true;

    switch (id) {
      case 'DOUBLE_DOWN':
        return { text: 'Bet doubled. Suspect locked.', multBet: 2, lockSuspect: true };

      case 'INSURANCE':
        return { text: '+20% bet. 50% refund on wrong accusation.', multBet: 1.2 };

      case 'SPLIT':
        return { text: 'Bet covers 2 suspects. Gross × 0.5.' };

      case 'CASH_OUT':
        this._cashedOut = true;
        return { text: 'Cashing out. Folder mult × 0.65 × bet.', cashOut: true };

      case 'PRESS':
        return { text: 'Folder burns 3× faster. Payout unchanged.', burnMultiplier: 3 };

      case 'CHAOS_ROLL': {
        const roll = 0.5 + Math.random() * 2.5;   // 0.5 → 3.0
        this._chaosRoll = roll;
        return { text: `Chaos roll: ×${roll.toFixed(2)} applied at reveal.`, chaosRoll: roll };
      }

      case 'LOCK_IN':
        return { text: 'Folder multiplier frozen at current value.', lockFolder: true };

      case 'SIDE_SWAP':
        return { text: 'Bet shifted to a different suspect.', cycleSuspect: 1 };

      default:
        // Unknown action id — silently no-op, no state change
        this._actionUsed[id] = false;
        return null;
    }
  }

  /**
   * Called by GameScene when LOCK_IN is resolved — stores the actual folder
   * pct value at the moment of activation. Kept separate from applyAction
   * so the scene controls *when* the snapshot is taken (after any visual delay).
   */
  lockFolderAt(folderPct) {
    this._lockedFolder = folderPct;
  }

  // ── Helpers ───────────────────────────────────────────────

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
