// ============================================================
// RoundController.js – Round generation + state machine + payout math
// All game logic lives here. GameScene just renders what RC tells it.
// ============================================================

class RoundController {

  constructor(scene) {
    this.scene      = scene;
    this.state      = 'idle';
    this.round      = null;      // current generated case
    this.suspectCount = 4;       // set from lobby

    // Bet state (individual payout model)
    this.bet = {
      amount:       0,
      suspectId:    null,        // main accusation target
      splitId:      null,        // second suspect if SPLIT used
      actions:      [],          // clue actions applied: ['DOUBLE_DOWN', etc.]
      insurancePaid: false,
      lockedMultiplier: null,    // set if LOCK_IN used
      cashedOut:    false,
      cashedOutValue: 0,
    };

    // Folder / burn state
    this.folderIntegrity = 100;  // 100 → 20 over 45s
    this.burnInterval    = null;
    this.BURN_RATE       = (80 / 45) * (1000 / 60); // % per frame at 60fps
    this.MIN_INTEGRITY   = 20;
    this.BURN_FAST_RATE  = 3;    // multiplier for post-wrong-accusation burn

    this.caseNumber = Math.floor(Math.random() * 900) + 100;
  }

  // ── Round Generation ──────────────────────────────────────────

  generateRound() {
    const d = MURDER_DATA;

    // Pick room
    const room = d.rooms[Math.floor(Math.random() * d.rooms.length)];

    // Pick victim
    const victim = d.victims[Math.floor(Math.random() * d.victims.length)];

    // Pick weapon tier (weighted)
    const tierRoll = Math.random();
    let weaponTier, weaponPool;
    if (tierRoll < d.weaponTierWeights.rare) {
      weaponTier = 'rare';
    } else if (tierRoll < d.weaponTierWeights.rare + d.weaponTierWeights.uncommon) {
      weaponTier = 'uncommon';
    } else {
      weaponTier = 'common';
    }
    // Attic room boosts rare chance
    if (room.rareBonus && Math.random() < room.rareBonus) weaponTier = 'rare';
    weaponPool = d.weapons[weaponTier];
    const weapon = { name: weaponPool[Math.floor(Math.random() * weaponPool.length)], tier: weaponTier };

    // Pick motive
    const motive = d.motives[Math.floor(Math.random() * d.motives.length)];

    // Build suspect roster (exclude victim)
    const availableSuspects = d.victims.filter(v => v.id !== victim.id);
    const shuffled = this._shuffle([...availableSuspects]).slice(0, this.suspectCount);

    // Pick actual killer (PURE RNG — equal weight, no logic)
    const killerIndex = Math.floor(Math.random() * shuffled.length);
    const killerId    = shuffled[killerIndex].id;

    // Assign vibe quotes
    const suspects = shuffled.map((s, i) => {
      let quoteType, quoteFn;
      if (i === killerIndex) {
        quoteType = 'guilty';
        quoteFn   = d.quoteTemplates.guilty[Math.floor(Math.random() * d.quoteTemplates.guilty.length)];
      } else {
        quoteType = Math.random() < 0.5 ? 'sus' : 'clueless';
        const pool = d.quoteTemplates[quoteType];
        quoteFn    = pool[Math.floor(Math.random() * pool.length)];
      }
      return {
        ...s,
        quoteType,
        quote: quoteFn(weapon.name, motive),
        // Cosmetic trust score — pure random walk, no logic
        trustScore: 35 + Math.floor(Math.random() * 40),
      };
    });

    // Pick two clue events
    const cluePool    = this._shuffle([...MURDER_DATA.clueEvents]);
    const clueEvents  = cluePool.slice(0, 2);

    this.caseNumber++;
    this.round = { room, victim, weapon, motive, suspects, killerId, clueEvents };
    return this.round;
  }

  // ── Payout Math ───────────────────────────────────────────────

  getSuspectMultiplier() {
    // payout = suspectCount × 0.8 (house edge ~20%)
    return this.suspectCount * 0.8;
  }

  getFolderMultiplier() {
    if (this.bet.lockedMultiplier !== null) return this.bet.lockedMultiplier;
    const integrity = Math.max(this.MIN_INTEGRITY, this.folderIntegrity);
    // lerp from 0.2× at min integrity to 1.5× at full integrity
    const t = (integrity - this.MIN_INTEGRITY) / (100 - this.MIN_INTEGRITY);
    return 0.2 + t * 1.3;
  }

  getWeaponMultiplier() {
    return MURDER_DATA.weaponMultipliers[this.round.weapon.tier] || 1;
  }

  getEarlyBirdBonus() {
    // +15% if bet locked in while folder > 60%
    return (this.bet.amount > 0 && this.bet.suspectId && this.folderIntegrity > 60) ? 0.15 : 0;
  }

  calculatePayout(accusationNumber = 1) {
    if (this.bet.cashedOut)  return { net: this.bet.cashedOutValue, type: 'cashout' };
    if (this.bet.amount <= 0) return { net: 0, type: 'none' };

    const base      = this.bet.amount;
    const suspMult  = this.getSuspectMultiplier();
    const foldMult  = this.getFolderMultiplier();
    const weapMult  = this.getWeaponMultiplier();
    const earlyBird = this.getEarlyBirdBonus();

    let payout = base * suspMult * foldMult * weapMult * (1 + earlyBird);

    // Clue action modifiers
    if (this.bet.actions.includes('DOUBLE_DOWN')) payout *= 2;
    if (this.bet.actions.includes('CHAOS_ROLL'))  payout *= (0.5 + Math.random() * 2.5);
    if (accusationNumber === 2)                   payout *= 0.40; // second-chance penalty

    // SPLIT: split across two suspects; second accusation not available after split
    if (this.bet.actions.includes('SPLIT'))       payout *= 0.5;

    const net = Math.floor(payout) - base; // net gain (positive = profit)
    return { net, gross: Math.floor(payout), base, type: 'win' };
  }

  calculateLoss() {
    const base   = this.bet.amount;
    let refund   = 0;
    if (this.bet.insurancePaid) refund = Math.floor(base * 0.5);
    return { net: -(base - refund), gross: refund, base, type: 'loss' };
  }

  // ── Burn Timer ────────────────────────────────────────────────

  startBurn(speedMultiplier = 1) {
    this.stopBurn();
    this.burnInterval = setInterval(() => {
      const rate = (80 / 45 / 60) * speedMultiplier;
      this.folderIntegrity = Math.max(this.MIN_INTEGRITY, this.folderIntegrity - rate);
      this.scene.events.emit('folderUpdate', this.folderIntegrity);
      if (this.folderIntegrity <= this.MIN_INTEGRITY) this.stopBurn();
    }, 16); // ~60fps
  }

  accelerateBurn() {
    this.startBurn(this.BURN_FAST_RATE);
  }

  stopBurn() {
    if (this.burnInterval) { clearInterval(this.burnInterval); this.burnInterval = null; }
  }

  resetBurn() {
    this.stopBurn();
    this.folderIntegrity = 100;
  }

  lockMultiplier() {
    this.bet.lockedMultiplier = this.getFolderMultiplier();
    return this.bet.lockedMultiplier;
  }

  // ── Bet Management ────────────────────────────────────────────

  resetBet() {
    this.bet = {
      amount: 0, suspectId: null, splitId: null,
      actions: [], insurancePaid: false,
      lockedMultiplier: null, cashedOut: false, cashedOutValue: 0,
    };
  }

  placeBet(amount, suspectId) {
    this.bet.amount    = amount;
    this.bet.suspectId = suspectId;
  }

  applyAction(action) {
    if (this.bet.actions.includes(action)) return false; // already used
    switch (action) {
      case 'DOUBLE_DOWN':
        this.bet.actions.push('DOUBLE_DOWN');
        break;
      case 'INSURANCE':
        this.bet.insurancePaid = true;
        this.bet.amount = Math.floor(this.bet.amount * 1.2); // costs 20% more
        this.bet.actions.push('INSURANCE');
        break;
      case 'SPLIT':
        this.bet.actions.push('SPLIT');
        break;
      case 'CASH_OUT':
        this.bet.cashedOut      = true;
        this.bet.cashedOutValue = Math.floor(this.bet.amount * 0.65 * this.getFolderMultiplier());
        break;
      case 'PRESS':
        this.accelerateBurn();
        this.bet.actions.push('PRESS');
        break;
      case 'CHAOS_ROLL':
        this.bet.actions.push('CHAOS_ROLL');
        break;
      case 'LOCK_IN':
        this.lockMultiplier();
        this.bet.actions.push('LOCK_IN');
        break;
      case 'SIDE_SWAP':
        this.bet.actions.push('SIDE_SWAP');
        break;
    }
    return true;
  }

  // ── Helpers ───────────────────────────────────────────────────

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Cosmetic-only trust score animation tick
  tickTrustScores() {
    this.round.suspects.forEach(s => {
      s.trustScore += (Math.random() - 0.5) * 6;
      s.trustScore  = Math.max(5, Math.min(95, s.trustScore));
    });
    this.scene.events.emit('trustScoresUpdate', this.round.suspects);
  }
}
