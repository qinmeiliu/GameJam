// ============================================================
// murders.js – All Mad-Lib content pools
// ============================================================

const MURDER_DATA = {

  // ── SUSPECT ROSTER (pool the lobby picks from to fill chairs) ─
  // Kept on the field `victims` for legacy compatibility — every existing
  // reference is actually consuming this as the suspect pool.
  victims: [
    { id: 'butler',    name: 'The Butler',        trait: 'pompous',   color: 0x8866aa },
    { id: 'chef',      name: 'The Chef',           trait: 'chaotic',   color: 0xff6644 },
    { id: 'mayor',     name: 'The Mayor',          trait: 'cowardly',  color: 0x4488ff },
    { id: 'janitor',   name: 'The Janitor',        trait: 'cryptic',   color: 0x44cc88 },
    { id: 'count',     name: 'Count Rubberduck',   trait: 'eccentric', color: 0xffcc00 },
    { id: 'mime',      name: 'The Mime',           trait: 'silent',    color: 0xffffff },
    { id: 'duchess',   name: 'The Duchess',        trait: 'dramatic',  color: 0xff44aa },
    { id: 'librarian', name: 'The Librarian',      trait: 'pedantic',  color: 0x44ffcc },
  ],

  // ── VICTIM ROSTER (dead bodies — pompous duck aristocrats) ──
  // Each round picks one. Drives the BETTING-phase case file narrative.
  victimRoster: [
    { id: 'victor',     name: 'Ducky Victor',         title: 'a notorious rubber tycoon',                       deathVerb: 'mysteriously deflated' },
    { id: 'quackton',   name: 'Sir Quackton III',     title: 'a knighted opera singer',                         deathVerb: 'spectacularly silenced mid-aria' },
    { id: 'plumage',    name: 'Madame Plumage',       title: 'the duchess of feathers',                         deathVerb: 'tragically de-fluffed' },
    { id: 'mallard',    name: 'Captain Mallard',      title: 'a retired pond admiral',                          deathVerb: 'unceremoniously plucked' },
    { id: 'dabbler',    name: 'Lord Dabbler',         title: 'an eccentric collector of bath toys',             deathVerb: 'permanently un-bathed' },
    { id: 'webster',    name: 'Webster Pondworth',    title: 'heir to the Pondworth waterway fortune',          deathVerb: 'completely drained' },
    { id: 'fowler',     name: 'Mrs. Fowler',          title: 'a champion swan impersonator',                    deathVerb: 'tragically unswanned' },
    { id: 'quackbert',  name: 'Quackbert the Bold',   title: 'the village town crier',                          deathVerb: 'silenced mid-quack' },
    { id: 'featherly',  name: 'Dame Featherlight',    title: 'prima ballerina of the Royal Webbed Theatre',     deathVerb: 'permanently grounded' },
    { id: 'bobsworth',  name: 'Baron von Bobsworth',  title: 'a self-made bath-soap industrialist',             deathVerb: 'tragically scrambled' },
  ],

  weapons: {
    common: [
      'a Soggy Newspaper', 'a Banana Peel', 'a Rubber Fish',
      'a Broken Umbrella', 'a Stale Muffin', 'a Wet Sock',
      'a Wobbly Chair Leg', 'a Furious Napkin',
    ],
    uncommon: [
      'a Defective Whoopee Cushion', 'Overcooked Spaghetti',
      'a Weaponised Kazoo', 'a Rogue Croissant',
      "the Mayor's Missing Trophy", 'a Strongly-Worded Letter',
    ],
    rare: [
      'the Golden Rubber Chicken 🐔',
      "the World's Smallest Violin 🎻",
      'a Single Perfectly-Placed Lego 🧱',
      'an Inflatable Flamingo of Doom 🦩',
      'the Last Bottle of 1847 Champagne 🍾',
      'a Weaponised Jazz Flute 🎵',
    ],
  },

  weaponTierWeights: { common: 0.60, uncommon: 0.30, rare: 0.10 },

  weaponMultipliers: { common: 1.0, uncommon: 1.5, rare: 3.0 },

  rooms: [
    { id: 'ballroom',  name: 'The Grand Ballroom',  bg: 0x0d0520, accent: 0xf0c040, duckyGag: 'slides across the waxed floor and knocks over a candelabra' },
    { id: 'library',   name: 'The Library',          bg: 0x050d05, accent: 0x66cc44, duckyGag: 'headbutts a bookshelf — books cascade like dominoes' },
    { id: 'bedroom',   name: 'The Master Bedroom',   bg: 0x100018, accent: 0xbb44ff, duckyGag: 'bounces on the four-poster bed — pillows EXPLODE' },
    { id: 'kitchen',   name: 'The Kitchen',          bg: 0x100d00, accent: 0xff8844, duckyGag: 'knocks over the pot rack — saucepans rain from above' },
    { id: 'garden',    name: 'The Garden',           bg: 0x030d02, accent: 0x66ff44, duckyGag: 'chases a butterfly directly into the hedge maze' },
    { id: 'billiard',  name: 'The Billiard Room',    bg: 0x030d05, accent: 0x00ffaa, duckyGag: 'accidentally pots the 8-ball — it ricochets off four walls' },
    { id: 'cellar',    name: 'The Wine Cellar',      bg: 0x100303, accent: 0xff5544, duckyGag: 'trips on cobblestones and sends a barrel rolling' },
    { id: 'trophy',    name: 'The Trophy Room',      bg: 0x100800, accent: 0xff9900, duckyGag: 'stares up at the moose head until it falls off the wall' },
    { id: 'passage',   name: 'The Secret Passage',   bg: 0x020202, accent: 0xff6600, duckyGag: "waves torch around — it goes out. Complete darkness.",  special: 'mystery' },
    { id: 'attic',     name: 'The Attic',            bg: 0x0a0a03, accent: 0xccaa44, duckyGag: 'disturbs a teetering stack of boxes — AVALANCHE', rareBonus: 0.15 },
    { id: 'dining',    name: 'The Dining Room',      bg: 0x100303, accent: 0xffffff, duckyGag: 'grabs the tablecloth for balance — everything slides off' },
    { id: 'hottub',    name: 'The Hot Tub',          bg: 0x020210, accent: 0x00d4ff, duckyGag: 'cannonballs into the hot tub — water goes EVERYWHERE', folderVariant: 'envelope' },
  ],

  motives: [
    'a stolen pudding cup',
    'an unresolved noise complaint from 1987',
    'being called "medium-sized"',
    'jealousy over a participation trophy',
    'a soufflé that collapsed (the victim was blamed)',
    'a goldfish naming rights dispute',
    'a library book 17 years overdue',
    'the victim ate the last biscuit',
    'a deeply personal opinion about jazz',
    'the victim clapped during a film',
    'a bet over whether a hotdog is a sandwich',
    'someone reorganised their spice rack wrong',
  ],

  // Quote templates — fn(weapon, motive) or fn()
  quoteTemplates: {
    guilty: [
      (w) => `"${w} was self-defence, I swear! They started it!"`,
      (w) => `"Okay yes, ${w} was in my hand — but I was using it for COOKING."`,
      (w) => `"${w}? Never seen it. Definitely not mine. Stop looking at me."`,
      (w) => `"I tripped and ${w} flew out of my pocket. Total coincidence."`,
    ],
    sus: [
      ()  => `"I wasn't there. I was teaching my goldfish to yodel."`,
      ()  => `"You can't prove anything. Also I want a lawyer. What is a lawyer."`,
      ()  => `"I was home alone. With seventeen witnesses. Who've left the country."`,
      ()  => `"I was refolding my napkin collection. Very time-consuming. Ask anyone."`,
    ],
    clueless: [
      ()  => `"Wait, who died? Is there free cake? Someone mentioned cake."`,
      ()  => `"I just got here. What's happening. Is this about THE thing?"`,
      ()  => `"Murder? On a Tuesday? That seems rude."`,
      ()  => `"I didn't even know they were dead. I thought they were just quiet."`,
    ],
  },

  // ──────────────────────────────────────────────────────────
  //  ACTION CATALOG — GDD v0.4 canonical 8 blackjack-style actions
  //  Single source of truth: id, display, colour, math semantics
  // ──────────────────────────────────────────────────────────
  actions: [
    { id: 'DOUBLE_DOWN', label: 'DBL\nDOWN',  short: 'DOUBLE DOWN', icon: '⬆',  color: 0xfc6b23, /* VI_ORANGE */
      desc: 'gross × 2. Locks current bet.',                          riskTier: 'reward'  },
    { id: 'INSURANCE',   label: 'INSUR-\nANCE',short: 'INSURANCE',  icon: '🛡', color: 0x2afeff, /* CYAN */
      desc: '+20% to bet. If wrong, 50% refund.',                     riskTier: 'safe'    },
    { id: 'SPLIT',       label: 'SPLIT',       short: 'SPLIT',       icon: '✂', color: 0xfde054, /* GOLD */
      desc: 'gross × 0.5. Bet covers 2 suspects.',                    riskTier: 'safe'    },
    { id: 'CASH_OUT',    label: 'CASH\nOUT',   short: 'CASH OUT',    icon: '💸', color: 0xfde054, /* GOLD */
      desc: 'End round now: bet × 0.65 × folder mult.',               riskTier: 'safe'    },
    { id: 'PRESS',       label: 'PRESS\nLUCK', short: 'PRESS YOUR LUCK', icon: '🔥', color: 0xfc6b23, /* VI_ORANGE */
      desc: 'Folder burns 3× faster. Payout unchanged.',              riskTier: 'risky'   },
    { id: 'CHAOS_ROLL',  label: 'CHAOS\nROLL', short: 'CHAOS ROLL',  icon: '🎲', color: 0x9500c6, /* VI_PURPLE */
      desc: 'gross × random(0.5×–3.0×).',                              riskTier: 'chaos'   },
    { id: 'LOCK_IN',     label: 'LOCK\nIN',    short: 'LOCK IN',     icon: '🔒', color: 0x1729ff, /* VI_BLUE */
      desc: 'Freeze folder multiplier at current value.',             riskTier: 'safe'    },
    { id: 'SIDE_SWAP',   label: 'SIDE\nSWAP',  short: 'SIDE SWAP',   icon: '🔄', color: 0xfd009f, /* MAGENTA */
      desc: 'Cycle your suspect to the next one in line.',            riskTier: 'risky'   },
  ],

  // Clue reveals: funny object + betting action unlocked
  clueEvents: [
    { object: 'a half-eaten crumpet',       duckyDoes: 'eats the evidence immediately',       action: 'DOUBLE_DOWN',  label: '⬆ DOUBLE DOWN',     desc: 'Double your bet. Locked odds.' },
    { object: 'a goldfish in a top hat',    duckyDoes: 'salutes it formally',                 action: 'INSURANCE',    label: '🛡 INSURANCE',       desc: 'Pay +20%. Get 50% back on a loss.' },
    { object: 'a sticky note: "NOT ME"',    duckyDoes: 'squints at the camera',               action: 'SPLIT',        label: '✂ SPLIT',            desc: 'Split bet across 2 suspects.' },
    { object: 'a smaller rubber duck',      duckyDoes: 'is deeply unsettled',                 action: 'CASH_OUT',     label: '💸 CASH OUT',        desc: 'Take 0.65× now. No risk.' },
    { object: "someone's shopping list",    duckyDoes: 'reads it and weeps softly',           action: 'PRESS',        label: '🔥 PRESS YOUR LUCK', desc: 'Folder burns faster. Payout stays.' },
    { object: 'a live pigeon',              duckyDoes: 'CHAOS. Just chaos.',                  action: 'CHAOS_ROLL',   label: '🎲 CHAOS ROLL',      desc: 'Random 0.5×–3× on your bet.' },
    { object: 'a single Lego brick',        duckyDoes: 'steps on it. Full reaction.',         action: 'LOCK_IN',      label: '🔒 LOCK IN',         desc: 'Freeze multiplier now.' },
    { object: 'a trombone',                 duckyDoes: 'attempts to play it, fails horribly', action: 'SIDE_SWAP',    label: '🔄 SIDE SWAP',       desc: 'Move 50% of bet to another suspect.' },
    { object: 'a tiny cowboy hat',          duckyDoes: 'immediately puts it on',              action: 'DOUBLE_DOWN',  label: '⬆ DOUBLE DOWN',     desc: 'Double your bet. Locked odds.' },
    { object: 'a signed photograph of nobody', duckyDoes: 'looks confused, keeps it',        action: 'INSURANCE',    label: '🛡 INSURANCE',       desc: 'Pay +20%. Get 50% back on a loss.' },
  ],

  // ──────────────────────────────────────────────────────────
  //  CLUE TEMPLATES (v0.5) — no killer-name spoilers
  //
  //  Round-time substitution variables (RoundController binds them):
  //    {object}      — flavor object pulled from clueEvents pool
  //    {killerTrait} — the actual killer's `trait` field (8 traits in pool)
  //    {randomTrait} — a trait pulled from a random non-killer suspect
  //    {weapon}      — current round's weapon
  //    {motive}      — current round's motive
  //
  //  Tier mix (4/4/4): reliable hints, misleading hints, pure flavor.
  //  Round picks 2 templates at random — player has no way to tell signal
  //  from noise before buying.
  // ──────────────────────────────────────────────────────────
  clueTemplates: [
    // ── Reliable (4): hint at killer's actual trait ────────
    { tier: 'reliable',   text: 'Ducky found {object}. The killer reeks of {killerTrait} energy.' },
    { tier: 'reliable',   text: 'Ducky discovered {object} near the {weapon}. Whoever swung it was unmistakably {killerTrait}.' },
    { tier: 'reliable',   text: "The body's posture screams {killerTrait}. Ducky takes notes, suspiciously." },
    { tier: 'reliable',   text: 'Ducky inspects {object}. The killer left a fingerprint of {killerTrait} energy on it.' },

    // ── Misleading (4): hint at a random NON-killer trait ──
    { tier: 'misleading', text: 'Ducky pegs the killer as someone {randomTrait}, possibly. Or maybe not.' },
    { tier: 'misleading', text: 'Whoever did this had {randomTrait} vibes — or so the napkins say.' },
    { tier: 'misleading', text: "Ducky overheard a whisper: '{randomTrait} types are always the worst.'" },
    { tier: 'misleading', text: 'The crime scene smells faintly of {randomTrait} ambition. Or gravy. Hard to tell.' },

    // ── Flavor (4): no info value, pure chaos ──────────────
    { tier: 'flavor',     text: 'Ducky found {object}. Quack. That is the entire clue.' },
    { tier: 'flavor',     text: 'Ducky discovered {object}. The motive — {motive} — feels personal.' },
    { tier: 'flavor',     text: 'Ducky noticed the {weapon} was held clumsily. Typical for murderers.' },
    { tier: 'flavor',     text: 'A second {object} appeared, identical to the first. Ducky is unsettled.' },
  ],

};
