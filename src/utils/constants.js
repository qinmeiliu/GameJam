// ============================================================
// Vegas Infinite – Brand Constants
// All values verified against VI Brand Bible 2025 (page 42 colours, page 40 typography)
// ============================================================

const VI = {

  // --- Colour Palette (Brand Bible verified) ---
  COLORS: {
    // Core working palette
    FLOOD_BLACK:    0x05050a,   // Absolute base — every scene, no exceptions
    PANEL_SURFACE:  0x0d0d1a,   // Slightly lifted dark for card/panel backgrounds
    CYAN:           0x2afeff,   // VI Cyan — primary UI, Linear GFX dots, betting borders
    MAGENTA:        0xfd009f,   // VI Magenta — danger, wrong accusation, guilty vibe
    GOLD:           0xfde054,   // Vegas Gold — win moments ONLY, Ducky accents, rare weapons
    CREAM:          0xfbf4db,   // Brand Cream — all body text, never pure white

    // Full brand spectrum (use sparingly, on dark backgrounds, in considered combinations)
    VI_ORANGE:      0xfc6b23,   // Bet confirmation, PRESS YOUR LUCK action card
    VI_AMBER:       0xf59f41,   // Uncommon weapon tier, folder 60-80% integrity
    VI_RED:         0xf8050e,   // Wrong accusation full-loss flash, death moment
    VI_BLUE:        0x1729ff,   // LOCK IN action card, multiplier lock indicator
    VI_PURPLE:      0x9500c6,   // CHAOS ROLL action card, mystery suspect reveal

    // Legacy / compatibility (prefer named constants above)
    WHITE:          0xffffff,   // ⚠ Never use for body text — use CREAM
    TEXT_MUTED:     0x8870aa,
  },

  // --- CSS-friendly hex strings (for DOM / Graphics stroke colours) ---
  HEX: {
    FLOOD_BLACK:   '#05050a',
    PANEL_SURFACE: '#0d0d1a',
    CYAN:          '#2afeff',
    MAGENTA:       '#fd009f',
    GOLD:          '#fde054',
    CREAM:         '#fbf4db',
    VI_ORANGE:     '#fc6b23',
    VI_AMBER:      '#f59f41',
    VI_RED:        '#f8050e',
    VI_BLUE:       '#1729ff',
    VI_PURPLE:     '#9500c6',
  },

  // --- Typography (Capitana font family — tracking from Brand Bible p.40) ---
  FONTS: {
    HEADING:  'Oswald',       // 700 weight — stands in for Capitana Extra Bold (tracking 53)
    BODY:     'Oswald',       // 300 weight — stands in for Capitana Light (tracking 2)
    MONO:     'Courier New',  // Balance amounts, multiplier numbers, round timer
  },

  // --- Typography tracking (letter-spacing, in em units for CSS / px for Phaser BitmapText) ---
  TRACKING: {
    HEADING: 53,   // Capitana Extra Bold spec from Brand Bible
    BODY:     2,   // Capitana Light spec from Brand Bible
  },

  // --- Round Phase State Machine ---
  // Single source of truth for the round flow. Each phase is a named
  // state in GameScene; transitions emit 'game:phase_change' for the UI.
  //
  // Flow:
  //   INTRO → BETTING → ACCUSE → ACCUSATION_1
  //                             → SECOND_CHANCE → ACCUSATION_2
  //                                                 → SCOREBOARD
  //
  // BETTING = open-ended; player reads the case file, places a bet.
  // ACCUSE  = 30-second timed window; suspects revealed with quotes,
  //           folder burns, player must accuse before time runs out.
  PHASES: {
    INTRO:         'INTRO',          // case file slams in (~1.5s)
    BETTING:       'BETTING',        // case file readable, place bet; no timer, no suspects yet
    ACCUSE:        'ACCUSE',         // suspects revealed, folder burns 30s, accuse window
    ACCUSATION_1:  'ACCUSATION_1',   // first accusation submitted, resolving
    SECOND_CHANCE: 'SECOND_CHANCE',  // wrong#1 → 15s reduced window
    ACCUSATION_2:  'ACCUSATION_2',   // second accusation submitted, resolving
    SCOREBOARD:    'SCOREBOARD',     // round-end overlay; awaiting NEXT CASE
  },

  // --- Phase Timings (ms) ─────────────────────────────────────
  PHASE_TIMINGS: {
    INTRO_MS:           1500,    // case-reveal hold before betting opens
    BETTING_TIMER_MS:  60000,    // BETTING-phase soft countdown (display only, no auto-advance)
    ACCUSE_TOTAL_MS:   30000,    // accuse-phase folder-burn duration (GDD: 30s)
    CLUE_1_AT_MS:       8000,    // first clue fires this many ms into ACCUSE
    CLUE_2_AT_MS:      18000,    // second clue fires
    LAST_CALL_AT_MS:   24000,    // soft warning, folder ~22%
    SECOND_CHANCE_MS:  15000,    // GDD: 15-second reduced window after wrong#1
  },

  // --- Game Config ---
  GAME: {
    WIDTH:  1280,
    HEIGHT: 720,
    CHIP_DENOMINATIONS: [1, 5, 25, 100, 500],
    DEFAULT_BALANCE: 1000,

    // ── v0.5 Casino math (see GDD v0.5 CHANGELOG) ─────────────
    // Non-linear suspect multipliers — index by suspectCount (3..6).
    // Slots 0–2 unused. Breaks v0.3's constant-RTP property on purpose:
    // higher suspect count = better RTP, lower win frequency.
    SUSPECT_MULTS: [0, 0, 0, 1.8, 2.5, 3.2, 4.0],
    // Acc#2 payout cap — was 0.40 in v0.4, tightened in v0.5.
    ACC2_PENALTY:           0.30,
    // No-clue bonus multiplier applied to gross iff cluesPurchased === 0.
    NO_CLUE_BONUS_MULT:     1.20,
    // Order-based clue cost fractions (of bet). First clue cheap; second expensive.
    CLUE_COST_FIRST_FRAC:   0.10,
    CLUE_COST_SECOND_FRAC:  0.20,
    EARLY_BIRD_BONUS:       0.15,    // applied when bet locks while folder > 60%

    // Dot matrix background settings (Linear GFX — Brand Bible toolkit)
    DOT_SPACING:  28,    // px between dots
    DOT_RADIUS:   1.5,   // px dot size
    DOT_OPACITY:  0.08,  // base opacity (increases as folder burns)
  },

};
