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
  PHASES: {
    INTRO:         'INTRO',          // case file slams in, room reveals (~1.5s)
    BETTING:       'BETTING',        // bets open, clue events fire on timers, actions usable
    ACCUSATION_1:  'ACCUSATION_1',   // first accusation submitted, resolving
    SECOND_CHANCE: 'SECOND_CHANCE',  // wrong#1 → 15s reduced window, no actions
    ACCUSATION_2:  'ACCUSATION_2',   // second accusation submitted, resolving
    SCOREBOARD:    'SCOREBOARD',     // round-end overlay; awaiting NEXT CASE
  },

  // --- Phase Timings (ms) — calibrated to GDD v0.4 round flow ---
  PHASE_TIMINGS: {
    INTRO_MS:           1500,    // case-reveal hold before betting opens
    BETTING_TOTAL_MS:  45000,    // matches folder burn duration
    CLUE_1_AT_MS:      12000,    // first clue fires from BETTING start
    CLUE_2_AT_MS:      24000,    // second clue fires
    LAST_CALL_AT_MS:   35000,    // folder ~22% — soft warning
    SECOND_CHANCE_MS:  15000,    // GDD: 15-second reduced window
  },

  // --- Game Config ---
  GAME: {
    WIDTH:  1280,
    HEIGHT: 720,
    CHIP_DENOMINATIONS: [1, 5, 25, 100, 500],
    DEFAULT_BALANCE: 1000,

    // Dot matrix background settings (Linear GFX — Brand Bible toolkit)
    DOT_SPACING:  28,    // px between dots
    DOT_RADIUS:   1.5,   // px dot size
    DOT_OPACITY:  0.08,  // base opacity (increases as folder burns)
  },

};
