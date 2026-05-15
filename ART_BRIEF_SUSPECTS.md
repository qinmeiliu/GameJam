# QUACKDUNNIT — Suspect Portrait Prompts (Flat Mascot)

> Suspects are rubber ducky mascots in costume. Style: **chunky flat-vector
> illustration** with thick clean outlines, saturated brand-color fills, and a
> soft glow rim around the silhouette. Contrasts solidly against the
> neon-line-art backgrounds — solids on top of lines, never lines on lines.
> Paste the **STYLE LOCK** into your Custom GPT once.
> Then send the **per-character prompt** as a regular message per generation.

---

## STYLE LOCK (paste into Custom GPT system prompt for this session)

```
You are an image generator for QUACKDUNNIT, a Vegas Infinite casino-noir
whodunnit game. You are drawing SUSPECT MASCOT PORTRAITS — rubber ducks in
costume, each one a different murder suspect.

CORE STYLE:
- Chunky flat-vector mascot illustration. Think Pop! figure, modern logo
  mascot, premium sticker pack, vinyl toy character art.
- SOLID FLAT FILL COLORS inside every shape — NO painterly shading, NO
  airbrush gradients, NO photoreal rendering, NO 3D, NO line art, NO
  pixel art.
- Thick clean outlines around every shape (about 4-6px equivalent),
  either black or in a darker shade of the fill color.
- Limited cel-shading is OK: one secondary shadow tone + one highlight
  tone per major shape, kept as flat solid shapes (no soft gradients).
- One soft GLOW RIM HALO around the entire silhouette in the character's
  signature brand color. The glow is subtle — like a thin neon outline
  haze, not a flood.

CHARACTER FORMULA:
- Every suspect is a CLASSIC RUBBER DUCK: a chunky oval body, round head,
  round black dot eyes, and a flat orange beak. Recognizable as the
  iconic bath-toy duck silhouette, not a realistic mallard.
- Each duck wears a costume that immediately identifies their role
  (butler, chef, mayor, etc.) — specified per prompt.
- The body base is rubber-duck yellow (#f5d147), but tinted slightly
  toward the character's signature brand color (e.g., the Duchess body
  has a faint pink wash, the Count has a faint gold wash).

PALETTE — strict brand colors only:
- Cyan #2afeff
- Magenta #fd009f
- Gold #fde054
- VI orange #fc6b23
- VI amber #f59f41
- VI red #f8050e
- VI purple #9500c6
- Rubber-duck yellow #f5d147 (body base)
- Beak orange #ff8a3c (beak only)
- Flood black #05050a (background + outlines)
- Cream #fbf4db (white-equivalents like teeth, eyes-highlights, cuffs)

Each character has ONE signature brand color (specified per prompt) that
dominates their costume + their glow rim halo.

COMPOSITION:
- Square frame, 1:1 (1024×1024).
- Single character, centered, front-facing or three-quarter view.
- Vertical framing fits a hex token in the game — head and upper body
  visible, full body shown if it fits, but the silhouette should read
  cleanly even when cropped to a hex.
- Pure flat black background (#05050a) — this image will be cut out and
  framed by a hex token in the UI, so the background must be solid black
  (NOT transparent — we want a clean black field around the duck).
- Empty space around the silhouette so the glow rim has room to breathe.

IRON RULES:
- NO text, NO numbers, NO labels.
- NO multiple characters per image — ONE duck only.
- NO realistic feathers, NO realistic ducks — pure iconic rubber-duck
  bath toy proportions.
- NO weapons or murder implications in the portrait — they're poker
  faces, not action shots.
- Cyan and magenta must not touch directly.
- Gold is reserved for the wealthy characters (Count, Duchess if a
  secondary).

DO NOT include UI elements, watermarks, frames, or borders.
```

---

## CHARACTER PALETTE ASSIGNMENTS

For your reference — these are the signature glow-rim color for each suspect:

| Suspect | Signature | Hex | Costume vibe |
|---|---|---|---|
| Butler | VI PURPLE | `#9500c6` | Tuxedo, monocle, white gloves |
| Chef | VI RED | `#f8050e` | Toque, double-breasted chef coat, mustache |
| Mayor | CYAN | `#2afeff` | Sash, top hat, smug grin |
| Janitor | VI AMBER | `#f59f41` | Coveralls, broom, nervous brow |
| Count | GOLD | `#fde054` | Vampire cape, monocle, tiny fangs |
| Mime | CREAM | `#fbf4db` | Striped shirt, beret, white face paint |
| Duchess | MAGENTA | `#fd009f` | Pink gown, tiara, pearls, snooty pose |
| Librarian | VI ORANGE | `#fc6b23` | Cardigan, glasses, hair bun, holding book |

---

## PER-CHARACTER PROMPTS

---

### 1. The Butler — VI PURPLE

```
A rubber-duck mascot portrait of THE BUTLER. Chunky flat-vector
illustration style. The duck has a classic rubber-duck body shape (oval
body, round head, flat orange beak, round black dot eyes), body color
rubber-duck yellow (#f5d147) with a faint cool purple tint. He is dressed
in a sharp black butler's tuxedo with crisp white shirt and bow tie. He
wears a single gold monocle over one eye and a small white serving cloth
draped over one wing. His expression is haughty and composed, beak
slightly upturned. Thick black outlines around every shape. Flat solid
fills with one cel-shadow tone and one highlight per shape — no
gradients. A soft VI PURPLE (#9500c6) glow rim halo around the entire
silhouette. Pure flat black background (#05050a). Centered, front-facing,
upper body visible. 1:1 square. No text.
```

---

### 2. The Chef — VI RED

```
A rubber-duck mascot portrait of THE CHEF. Chunky flat-vector illustration
style. The duck has a classic rubber-duck body shape (oval body, round
head, flat orange beak, round black dot eyes), body color rubber-duck
yellow (#f5d147) with a faint warm red tint. He wears a tall white chef's
toque hat, a double-breasted white chef coat with the cuffs slightly
splattered red (sauce), a red neckerchief, and a thick black handlebar
mustache curling over his beak. One wing holds a small wooden spoon. His
expression is passionate and a little intense. Thick black outlines
around every shape. Flat solid fills with one cel-shadow tone and one
highlight per shape — no gradients. A soft VI RED (#f8050e) glow rim halo
around the entire silhouette. Pure flat black background (#05050a).
Centered, front-facing, upper body visible. 1:1 square. No text.
```

---

### 3. The Mayor — CYAN

```
A rubber-duck mascot portrait of THE MAYOR. Chunky flat-vector
illustration style. The duck has a classic rubber-duck body shape (oval
body, round head, flat orange beak, round black dot eyes), body color
rubber-duck yellow (#f5d147) with a faint cool cyan tint. He wears a tall
black top hat, a crisp dark suit jacket, and a wide cyan sash across his
chest with a single gold mayoral medal pinned to it. His expression is
smug and politically slick, with a wide closed-beak grin. Thick black
outlines around every shape. Flat solid fills with one cel-shadow tone
and one highlight per shape — no gradients. A soft CYAN (#2afeff) glow
rim halo around the entire silhouette. Pure flat black background
(#05050a). Centered, front-facing, upper body visible. 1:1 square. No
text.
```

---

### 4. The Janitor — VI AMBER

```
A rubber-duck mascot portrait of THE JANITOR. Chunky flat-vector
illustration style. The duck has a classic rubber-duck body shape (oval
body, round head, flat orange beak, round black dot eyes), body color
rubber-duck yellow (#f5d147) with a faint warm amber tint. He wears
amber-tan canvas coveralls with a small embroidered name patch (no
readable text — just a small cream rectangle), a backwards cap, and
holds the handle of an old broom. His expression is shifty, eyes glancing
sideways, beak slightly pursed. Thick black outlines around every shape.
Flat solid fills with one cel-shadow tone and one highlight per shape —
no gradients. A soft VI AMBER (#f59f41) glow rim halo around the entire
silhouette. Pure flat black background (#05050a). Centered, front-facing,
upper body visible. 1:1 square. No text.
```

---

### 5. Count Rubberduck — GOLD

```
A rubber-duck mascot portrait of COUNT RUBBERDUCK, an eccentric duck
aristocrat with vampire styling. Chunky flat-vector illustration style.
The duck has a classic rubber-duck body shape (oval body, round head,
flat orange beak, round black dot eyes), body color rubber-duck yellow
(#f5d147) with a faint warm gold wash. He wears a tall black collar
cape with a blood-red satin inner lining flared dramatically behind
him, a gold monocle, and two tiny white fangs visible at the corners
of his beak. His expression is cryptic and theatrical, head tilted at
a sly angle. Thick black outlines around every shape. Flat solid fills
with one cel-shadow tone and one highlight per shape — no gradients. A
soft GOLD (#fde054) glow rim halo around the entire silhouette. Pure
flat black background (#05050a). Centered, three-quarter view, upper
body visible. 1:1 square. No text.
```

---

### 6. The Mime — CREAM

```
A rubber-duck mascot portrait of THE MIME. Chunky flat-vector illustration
style. The duck has a classic rubber-duck body shape (oval body, round
head, flat orange beak, round black dot eyes), body color rubber-duck
yellow (#f5d147) but the FACE is painted entirely cream-white (#fbf4db)
with two small black eyebrow marks above the eyes and a single black
painted teardrop on one cheek. He wears a black-and-cream horizontal-
striped shirt, red suspenders, and a small black beret tilted on his
head. Both wings are held up in a classic "trapped in an invisible box"
mime pose, palms outward. His expression is theatrical and silent.
Thick black outlines around every shape. Flat solid fills with one
cel-shadow tone and one highlight per shape — no gradients. A soft
CREAM (#fbf4db) glow rim halo around the entire silhouette. Pure flat
black background (#05050a). Centered, front-facing, upper body visible.
1:1 square. No text.
```

---

### 7. The Duchess — MAGENTA

```
A rubber-duck mascot portrait of THE DUCHESS. Chunky flat-vector
illustration style. The duck has a classic rubber-duck body shape (oval
body, round head, flat orange beak, round black dot eyes), body color
rubber-duck yellow (#f5d147) with a faint warm pink tint. She wears a
luxurious magenta-pink ball gown with puffed shoulders, a triple strand
of large cream pearls around her neck, and a small gold tiara perched on
her head. One wing is held delicately to her chest as if clutching the
pearls. Her expression is snobby and theatrical, beak slightly upturned,
eyelids half-closed in disdain. Thick black outlines around every shape.
Flat solid fills with one cel-shadow tone and one highlight per shape —
no gradients. A soft MAGENTA (#fd009f) glow rim halo around the entire
silhouette. Pure flat black background (#05050a). Centered, three-quarter
view, upper body visible. 1:1 square. No text.
```

---

### 8. The Librarian — VI ORANGE

```
A rubber-duck mascot portrait of THE LIBRARIAN. Chunky flat-vector
illustration style. The duck has a classic rubber-duck body shape (oval
body, round head, flat orange beak, round black dot eyes), body color
rubber-duck yellow (#f5d147) with a faint warm orange tint. She wears a
warm VI-orange knitted cardigan over a cream blouse with a small black
ribbon at the collar, and a pair of half-moon reading glasses perched
on the end of her beak. The feathers on top of her head are gathered
into a tight grey-cream hair bun (stylized). Both wings hold a small
closed brown book to her chest. Her expression is pedantic and snobby,
eyebrows slightly raised in judgment. Thick black outlines around every
shape. Flat solid fills with one cel-shadow tone and one highlight per
shape — no gradients. A soft VI ORANGE (#fc6b23) glow rim halo around
the entire silhouette. Pure flat black background (#05050a). Centered,
front-facing, upper body visible. 1:1 square. No text.
```

---

## NOTES FOR DALL-E 3

DALL-E sometimes drifts toward "realistic duck illustration" — if you see actual mallard feathers, painterly textures, or 3D shading, add these phrases:

- **"Vinyl toy aesthetic, like a Funko Pop figure or sticker design."**
- **"Flat 2D vector illustration with thick clean outlines. No realism, no painterly shading."**
- **"Iconic rubber bath-toy duck silhouette, not a real bird."**

If the cel-shading drifts into soft gradient airbrush:

- **"Cel-shading only — every shadow and highlight is a flat solid shape, not a gradient."**

If the duck comes out looking sad or cute when you want haughty/snobby:

- **"Adult expression, smug and confident, not a baby duck."**

---

## CALIBRATION WORKFLOW

Recommended test order:

1. **Butler** — establishes the basic mascot proportions + glow rim treatment. Easy costume.
2. **Count Rubberduck** — tests the more theatrical/expressive end (cape, fangs). If this lands the dramatic ones will all work.
3. **Mime** — tests the off-palette case (cream face paint, no brand color saturation). If this still reads as a mime without feeling washed-out, the style is locked.

If those three are consistent in body proportions, line weight, and glow-rim treatment, batch the other five.

## SAVE FILENAMES

Drop the PNGs into `assets/images/suspects/` with these exact filenames so I can wire them up in PreloadScene (file paths already scaffolded there):

```
butler.png
chef.png
mayor.png
janitor.png
count.png
mime.png
duchess.png
librarian.png
```

Recommended: keep the generated 1024×1024 originals in a separate folder and resize each to **300×300** before saving as `<id>.png`. That's the resolution the hex tokens render at — anything bigger is wasted bandwidth. (Or save as-is and I'll scale them in code.)

Once any of them land, I'll wire `this.load.image('suspect-butler', ...)` etc. in PreloadScene and the hex tokens in GameScene will automatically prefer the sprite over the existing vector geometry.

---

## BONUS: DUCKY THE DETECTIVE

Don't forget — you'll also need **Ducky himself**, the player's detective mascot. Same style, but he's the hero of the game. Suggested separate brief — we can write that next, but quick notes for now:

- Body: classic rubber-duck yellow #f5d147 (no tint — he's the canonical mascot)
- Outfit: tiny tan trench coat, deerstalker hat, magnifying glass in one wing
- Signature glow: GOLD #fde054 (he's the hero — gold-tier)
- Multiple emotional states: idle, investigating, pointing (accuse moment), win, lose

Save those into `assets/images/ducky/` as `ducky-idle.png`, `ducky-investigating.png`, `ducky-pointing.png`, `ducky-win.png`, `ducky-lose.png`.

Ping me when you want the Ducky brief written out in full.
