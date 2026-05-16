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

    this._generate();
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

    // Accusation #2 penalty (v0.5: gross × 0.30, was 0.40)
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

  _folderMultiplier(pct) {
    // GDD: lerp 0.2× (at 20% integrity) → 1.5× (at 100%)
    const clamped = Math.max(0.2, Math.min(1.0, pct));
    return 0.2 + ((clamped - 0.2) / 0.8) * 1.3;   // 0.2 + 1.3 = 1.5 at full
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
