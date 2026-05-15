# QUACKDUNNIT — Room Background Prompts (Neon Line Art)

> Final art direction: **thin neon line drawings on flood-black**. Minimal,
> graphic, UI-friendly. Like a blueprint lit by neon signs.
> Paste the **STYLE LOCK** into your Custom GPT once.
> Then send the **per-room prompt** as a regular message per generation.
> Suggested test order: **Ballroom → Wine Cellar → Hot Tub**.

---

## STYLE LOCK (paste into Custom GPT system prompt)

```
You are an image generator for a casino-noir whodunnit game called QUACKDUNNIT.
The art style is NEON LINE ART on a flood-black background — every image must
follow these rules exactly:

CORE STYLE:
- Pure flat black background (#05050a). No gradient, no texture, no fog.
- Subjects rendered as THIN GLOWING NEON OUTLINES only. No fills, no painted
  interiors, no shading, no gradients inside shapes.
- Think: neon sign architectural drawing, Tron-style wireframe, synthwave line
  illustration, art-deco neon signage.
- Lines have a soft outer glow halo in the line's color — no other lighting.
- Minimal detail. Only draw the SILHOUETTE / OUTLINE of the room's
  defining furniture and architecture. Skip ornament, skip texture.
- Clean, simple, graphic — readable at a glance from across a room.

PALETTE — strict brand colors only:
- Cyan #2afeff
- Magenta #fd009f
- Gold #fde054
- VI orange #fc6b23
- VI amber #f59f41
- VI red #f8050e
- VI purple #9500c6
Each prompt names ONE dominant line color. You may use ONE secondary accent
color for small detail (e.g., a single hot accent on a key prop). Never more.

IRON RULES:
- Cyan and magenta lines must NEVER touch. Separate with black or with
  a different accent color.
- Gold reserved for "wealth/luxury" rooms only (ballroom, trophy, dining,
  attic).
- NO characters, NO people, NO ducks, NO animals.
- NO text, NO numbers, NO signage with words.
- NO solid fills inside outlines — outlines only.
- NO photoreal rendering, NO painterly texture, NO 3D shading.

COMPOSITION:
- 16:9 aspect ratio (1792×1024).
- The room's focal subject sits LEFT-OF-CENTER.
- The right 40% of the frame stays mostly empty black — UI panels will
  sit on top of this area.
- Wide establishing-shot perspective with slight one-point perspective
  receding into the frame.
- Symmetric or rule-of-thirds composition is fine.

MOOD:
- Empty, abandoned, post-event. The murder is implied by the emptiness.
- Cinematic, minimalist, graphic.

DO NOT include UI elements, watermarks, frames, borders, or signatures.
```

---

## PER-ROOM PROMPTS

Each prompt is short on purpose. Less is more — DALL-E will add detail if not constrained.

---

### 1. The Grand Ballroom — GOLD line

```
A grand Victorian ballroom drawn as a neon line illustration. Pure flat black
background (#05050a). Thin glowing GOLD lines (#fde054) only — no fills, no
shading. Outline only these elements: a tall chandelier hanging from center-top
with crystal teardrop shapes, a grand staircase descending from the left, a
checkered floor receding into one-point perspective, two arched windows on the
back wall, one small side table on the lower left with three champagne flute
silhouettes. Soft gold glow halo around every line. Subject composed
LEFT-OF-CENTER; right 40% of frame is empty black. Minimal detail, blueprint
clarity. No characters, no text. 16:9.
```

---

### 2. The Library — CYAN line

```
A Victorian library drawn as a neon line illustration. Pure flat black
background (#05050a). Thin glowing CYAN lines (#2afeff) only — no fills.
Outline only: floor-to-ceiling bookshelves along the back wall (rows of book
spines indicated by short vertical lines, not detailed), a writing desk
LEFT-OF-CENTER with a banker's lamp on top (small dome shape with soft glow
halo as the brightest point), a leather wingback chair beside the desk, an
open book on the desk. Soft cyan glow halo around every line. Composed
LEFT-OF-CENTER; right 40% empty black. No characters, no text. 16:9.
```

---

### 3. The Master Bedroom — MAGENTA line

```
A Victorian master bedroom drawn as a neon line illustration. Pure flat black
background (#05050a). Thin glowing MAGENTA lines (#fd009f) only — no fills.
Outline only: a tall four-poster bed with canopy LEFT-OF-CENTER (covers
slightly disheveled, indicated with a few wavy lines), a bedside table with
a small lamp (brightest glow halo point), a vanity with mirror in the back
right corner, a window with curtains pulled back on the far left. Soft
magenta glow halo around every line. Composed LEFT-OF-CENTER; right 40%
empty black. No characters, no text. 16:9.
```

---

### 4. The Kitchen — VI ORANGE line

```
A Victorian manor kitchen drawn as a neon line illustration. Pure flat black
background (#05050a). Thin glowing ORANGE lines (#fc6b23) only — no fills.
Outline only: a butcher-block island LEFT-OF-CENTER with a hanging copper pot
rack above it (six pots of varied silhouettes), a cast-iron stove against the
back wall, a single pull-chain bulb above the island (brightest glow halo
point), a tipped jar on the counter. Soft orange glow halo around every line.
Composed LEFT-OF-CENTER; right 40% empty black. No characters, no text. 16:9.
```

---

### 5. The Garden — CYAN line

```
A Victorian estate garden at night drawn as a neon line illustration. Pure
flat black background (#05050a). Thin glowing CYAN lines (#2afeff) only — no
fills. Outline only: a stone gazebo arch LEFT-OF-CENTER, hedge-maze walls
receding into one-point perspective, two simple topiary cone shapes flanking
the gazebo, a wrought-iron lamppost in the mid-distance (brightest glow halo
point), a winding stone path. A full moon circle at the top of the frame
with a soft glow halo. Composed LEFT-OF-CENTER; right 40% empty black. No
characters, no text. 16:9.
```

---

### 6. The Billiard Room — CYAN line

```
A Victorian billiard room drawn as a neon line illustration. Pure flat black
background (#05050a). Thin glowing CYAN lines (#2afeff) only — no fills.
Outline only: a rectangular pool table LEFT-OF-CENTER in three-quarter
perspective (with the rectangle of the felt and six pocket circles
indicated), six pool balls scattered on it (small circles), a cue stick
lying across the table, a hanging pendant lamp directly above the table
(brightest glow halo point), wood paneling indicated by simple vertical
lines on the back wall, a leather sofa in the back right. Soft cyan glow
halo around every line. Composed LEFT-OF-CENTER; right 40% empty black.
No characters, no text. 16:9.
```

---

### 7. The Wine Cellar — VI RED line

```
A Victorian wine cellar drawn as a neon line illustration. Pure flat black
background (#05050a). Thin glowing RED lines (#f8050e) only — no fills.
Outline only: rows of diamond-lattice wine racks along both back walls
receding into one-point perspective (a few bottle silhouettes shown inside
the diamonds), a wooden barrel on its side LEFT-OF-CENTER with a candelabra
on top (three thin candle lines as the brightest glow halo points), an
arched stone ceiling indicated by curved lines, a cobblestone floor
indicated by a few scattered hexagonal/round shapes. Soft red glow halo
around every line. Composed LEFT-OF-CENTER; right 40% empty black. No
characters, no text. 16:9.
```

---

### 8. The Trophy Room — GOLD line

```
A Victorian gentleman's trophy room drawn as a neon line illustration.
Pure flat black background (#05050a). Thin glowing GOLD lines (#fde054)
only — no fills. Outline only: a mahogany desk LEFT-OF-CENTER with a
green-shaded banker's-style desk lamp on top (brightest glow halo point),
a globe on a stand beside the desk, three mounted trophy silhouettes on
the back wall (e.g., antlers, a simple loving-cup shape, a wall plaque
shape), a glass display cabinet on the right wall, wood paneling
indicated by simple vertical lines. Soft gold glow halo around every
line. Composed LEFT-OF-CENTER; right 40% empty black. No characters, no
text. 16:9.
```

---

### 9. The Secret Passage — VI ORANGE line

```
A narrow Victorian secret stone passage drawn as a neon line illustration.
Pure flat black background (#05050a). Thin glowing ORANGE lines (#fc6b23)
only — no fills. Outline only: rough stone-block walls on both sides
indicated by stacked rectangle shapes, receding into deep one-point
perspective toward the right (the passage disappears into pure black at
the far end), a wall-mounted iron sconce holding a torch LEFT-OF-CENTER
(the flame is the brightest glow halo point with a few flickering line
strokes), a flagstone floor indicated by scattered rectangles, a few
cobweb arcs in the upper corners. Soft orange glow halo around every
line. Composed LEFT-OF-CENTER; right 40% recedes to empty black. No
characters, no text. 16:9.
```

---

### 10. The Attic — GOLD line (dim)

```
A Victorian manor attic drawn as a neon line illustration. Pure flat
black background (#05050a). Thin glowing GOLD lines (#fde054) only — no
fills. The line weight is slightly thinner and the glow halo slightly
dimmer than other rooms (this is a "dusty moonlit" scene). Outline only:
a stack of three steamer trunks LEFT-OF-CENTER, a round porthole-style
attic window high on the back wall (brightest glow halo point, with a
visible cone-of-light line emanating from it down onto the trunks), a
rocking horse silhouette in the foreground left, a draped sheet over a
furniture shape in the back right, exposed wooden roof rafters indicated
by simple diagonal lines. Soft dim gold glow halo around every line.
Composed LEFT-OF-CENTER; right 40% empty black. No characters, no text.
16:9.
```

---

### 11. The Dining Room — GOLD line, CYAN window accent

```
A Victorian dining room drawn as a neon line illustration. Pure flat
black background (#05050a). Thin glowing GOLD lines (#fde054) as the
primary color — no fills. Outline only: a long rectangular dining table
running LEFT-OF-CENTER receding into one-point perspective with ten chairs
flanking it (some chairs pushed out at angles), a few simple plate
circles and goblet shapes on the table, an ornate crystal chandelier
hanging above the table (brightest gold glow halo point). On the back
wall: two tall arched windows drawn in CYAN line (#2afeff) only, with a
small cyan glow halo. The cyan windows and gold chandelier are kept far
apart with empty black between them — they must not touch. Composed
LEFT-OF-CENTER; right 40% empty black. No characters, no text. 16:9.
```

---

### 12. The Hot Tub — CYAN line

```
A Victorian-era private spa room drawn as a neon line illustration. Pure
flat black background (#05050a). Thin glowing CYAN lines (#2afeff) only
— no fills. Outline only: a sunken round hot tub LEFT-OF-CENTER drawn in
slight three-quarter perspective (a thick oval rim and the water surface
inside indicated by a few wavy ripple lines), faint steam wisps rising
from the surface (brightest glow halos), a tiled wall behind with simple
art-deco zigzag pattern lines, a folded robe and slippers on a bench to
the side, two brass fixtures on the wall above the tub. Soft cyan glow
halo around every line. Composed LEFT-OF-CENTER; right 40% empty black.
No characters, no text. 16:9.
```

---

## NOTES FOR DALL-E 3

If outputs come back too detailed / painterly, add these phrases to the front of the prompt:

- **"Minimalist vector neon line art, similar to a Tron grid or art-deco neon signage."**
- **"No painterly texture, no realistic rendering."**
- **"Lines are crisp single-pixel-width with a soft outer glow only."**

If DALL-E adds fills inside the shapes (it sometimes does), add:

- **"Outlines only — the interior of every shape is the same flat black as the background."**

---

## CALIBRATION WORKFLOW

1. Generate **Ballroom** — does the chandelier silhouette read cleanly? Is the right 40% empty?
2. Generate **Wine Cellar** — does the receding perspective work? Are the racks readable as diamonds?
3. Generate **Hot Tub** — do the steam wisps read as steam without being too much?

If all three land, batch the other nine. If one drifts, we tune the style lock first.

## SAVE FILENAMES

Drop the PNGs into `assets/images/backgrounds/` with these exact filenames so I can wire them up in PreloadScene:

```
bg-ballroom.png
bg-library.png
bg-bedroom.png
bg-kitchen.png
bg-garden.png
bg-billiard.png
bg-cellar.png
bg-trophy.png
bg-passage.png
bg-attic.png
bg-dining.png
bg-hottub.png
```

Once the first three are in, I'll wire the per-room background renderer (with vector dot-matrix fallback for any room not yet drawn).
