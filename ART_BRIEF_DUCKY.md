# QUACKDUNNIT — Ducky the Detective (Hero Asset)

> Ducky is the player's mascot — the detective duck who guides them through
> every round. He needs **his own art brief** because he's the only character
> who appears in multiple emotional states, and because he's the **hero**
> (gets the gold win-tier glow), not just one of eight suspects.
>
> Same flat-mascot family as the suspects in `ART_BRIEF_SUSPECTS.md`, so the
> roster reads as one cohesive cast. The differences are intentional and
> listed below.

---

## TECHNICAL FORMAT

| Spec | Value |
|---|---|
| Tool | DALL-E 3 (ChatGPT Pro) |
| Resolution | **1024 × 1024** (square) |
| Aspect ratio | 1:1 |
| File type | **PNG** |
| Background | **Solid flat black `#05050a`** (NOT transparent — paint the same flood-black the game uses) |
| File location | `assets/images/ducky/<state>.png` |
| Filenames | `ducky-idle.png` · `ducky-investigating.png` · `ducky-pointing.png` · `ducky-win.png` · `ducky-lose.png` |
| Priority order | `ducky-investigating` first (BETTING phase needs him now), then the others as you have time |

The game already has the load slots scaffolded in `PreloadScene.js` for all five
states — drop in the file, I'll uncomment the load line and wire it up.

---

## STYLE LOCK (paste this into your Custom GPT system prompt for this session)

```
You are an image generator drawing DUCKY THE DETECTIVE — the player's
hero mascot in QUACKDUNNIT, a Vegas Infinite casino-noir whodunnit game.
Every Ducky portrait must follow these rules.

CORE STYLE — VEGAS INFINITE "GLOW-FI NEO-VECTOR":
- Chunky flat-vector mascot illustration. Think Pop! figure, modern logo
  mascot, premium sticker, vinyl toy character art.
- Solid flat-fill color shapes inside every outline — NO painterly
  shading, NO airbrush gradients, NO photoreal rendering, NO 3D, NO
  line-art-only style.
- Thick clean outlines around every shape (~4–6px equivalent), either
  black or in a darker shade of the fill color.
- Cel-shading allowed: one secondary shadow tone + one highlight tone
  per major shape, kept as flat solid shapes (no soft gradients).
- One soft GOLD (#fde054) glow rim halo around the entire silhouette.
  Ducky is the HERO of the game so he gets the win-tier color — this
  is the single most important visual difference from the suspects,
  who each get their own brand-color rim.

DUCKY'S CANONICAL FORM (locked across all five states):
- A classic iconic RUBBER DUCK silhouette — chunky oval body, round
  head, flat orange beak (#ff8a3c), small round black dot eyes. Reads
  as the iconic bath-toy duck, not a realistic mallard.
- Body color: PURE canonical rubber-duck yellow (#f5d147). NO tint
  toward any other brand color — Ducky is THE mascot, he stays yellow.
  (This is different from suspects, who each carry a faint tint.)
- Outfit (worn in every state): tan trench coat with the collar popped
  up, and a brown plaid deerstalker hat (Sherlock-style, with the ear
  flaps pinned up). The trench is consistent enough that you instantly
  recognize him across the five emotional states.
- Magnifying glass: a small brass-rimmed magnifying glass is his
  signature prop. In some states he holds it; in others it's tucked
  under a wing or absent.

PALETTE — strict brand colors only:
- Cyan #2afeff
- Magenta #fd009f
- Gold #fde054   ← Ducky's signature glow rim
- VI orange #fc6b23
- VI amber #f59f41
- VI red #f8050e
- Rubber-duck yellow #f5d147 (body base)
- Beak orange #ff8a3c (beak only)
- Tan/sand #c8a980 (trench coat)
- Plaid brown #6b4a2a (deerstalker hat)
- Cream #fbf4db (collar, gloves, magnifying-glass lens shine)
- Flood black #05050a (background + outlines)

COMPOSITION:
- 1:1 square, 1024×1024.
- Single character, centered, head and upper body visible.
- Pure flat black background (#05050a) — solid, no gradient, no texture.
- Empty space around the silhouette so the gold rim halo has room to glow.

IRON RULES:
- NO text, NO labels, NO signage.
- NO additional characters (suspects, victims, etc.) — Ducky alone.
- NO weapons, blood, or gore — he's a friendly cartoon detective.
- NO realistic feathers or anatomical mallard details.
- Cyan and magenta must not appear adjacent in the same shape.
- Ducky's BODY stays pure yellow #f5d147 — never tinted.

DO NOT include UI elements, watermarks, frames, or borders.
```

---

## PER-STATE PROMPTS

The five states the game expects. Use the same style lock above for all of them.

### 1. ducky-investigating  (URGENT — BETTING phase)

```
Ducky the Detective in his INVESTIGATING pose, examining evidence.
Chunky flat-vector mascot illustration. Pure canonical rubber-duck
yellow body (#f5d147), tan trench coat with popped collar, brown plaid
deerstalker hat. He holds a small brass-rimmed magnifying glass up at
chin level in one wing, the lens catching a faint cream-cream gleam
(#fbf4db). His head is tilted slightly DOWNWARD as if reading a case
file in front of him, eyes squinted in sharp focus — confident and
sharp, NOT goofy. The other wing rests at his side or hooks his trench
lapel. Three-quarter view from slightly above. Thick black outlines.
Flat solid fills with one cel-shadow + one highlight per shape, no
gradients. Soft GOLD (#fde054) glow rim halo around the entire
silhouette. Pure flat black background (#05050a). Centered, upper body
visible. 1:1 square. No text.
```

### 2. ducky-idle  (default standing pose)

```
Ducky the Detective in his IDLE pose, waiting at the casino table.
Chunky flat-vector mascot illustration. Pure canonical rubber-duck
yellow body (#f5d147), tan trench coat with popped collar, brown plaid
deerstalker hat. He stands facing the viewer, head tilted just slightly
to one side in a relaxed alert stance. Both wings rest at his sides;
the magnifying glass is tucked under one wing, barely visible. His
expression is calm, curious, eyebrows slightly raised — "ready when you
are." Front-facing view. Thick black outlines. Flat solid fills with
one cel-shadow + one highlight per shape, no gradients. Soft GOLD
(#fde054) glow rim halo around the entire silhouette. Pure flat black
background (#05050a). Centered, upper body visible. 1:1 square. No
text.
```

### 3. ducky-pointing  (the ACCUSE moment)

```
Ducky the Detective in his POINTING pose — the dramatic moment of
accusation. Chunky flat-vector mascot illustration. Pure canonical
rubber-duck yellow body (#f5d147), tan trench coat with popped collar,
brown plaid deerstalker hat with the brim casting a slight shadow over
his eyes. ONE wing is extended out toward the right edge of the frame,
finger-feather extended in a sharp ACCUSING POINT — wing fully horizontal,
direct, no curl. The other wing holds the magnifying glass to his chest.
His expression is intense, eyes narrowed, beak slightly open mid-quack as
if shouting "J'ACCUSE!" Three-quarter view, body angled toward the
pointing wing. Thick black outlines. Flat solid fills, no gradients.
Soft GOLD (#fde054) glow rim halo around the entire silhouette, with
the rim brighter along the pointing-wing edge. Pure flat black
background (#05050a). Centered, upper body visible. 1:1 square. No
text.
```

### 4. ducky-win  (the celebration)

```
Ducky the Detective in his WIN pose — triumphant celebration after
solving the case. Chunky flat-vector mascot illustration. Pure canonical
rubber-duck yellow body (#f5d147), tan trench coat with popped collar,
brown plaid deerstalker hat. BOTH wings are thrown UP and outward in a
victorious "yes!" gesture, beak open in a wide cheering quack. The
magnifying glass is briefly forgotten, dangling on a chain or simply
absent from this pose. His eyes are shut in joyful satisfaction (curved
black lines), and his cheeks have a faint cream-pink blush. A few small
GOLD (#fde054) sparkle shapes around his head as celebration confetti.
Front-facing view, head tilted slightly up. Thick black outlines. Flat
solid fills, no gradients. Soft GOLD (#fde054) glow rim halo around the
silhouette, slightly brighter than other states to emphasize victory.
Pure flat black background (#05050a). Centered, upper body visible.
1:1 square. No text.
```

### 5. ducky-lose  (the cold case)

```
Ducky the Detective in his LOSE pose — dejected after a wrong
accusation. Chunky flat-vector mascot illustration. Pure canonical
rubber-duck yellow body (#f5d147), tan trench coat with popped collar,
brown plaid deerstalker hat — but the hat is tilted forward, the brim
shadowing most of his eyes. His head and shoulders are slumped DOWN,
beak pointing toward the floor in disappointment. One wing hangs limp
at his side; the other holds the magnifying glass but loosely, almost
dropping it. A single small drop-shape sweat bead near his temple, or
a tiny grey rain-cloud shape over the hat (optional). His visible eye
is half-closed, the corner downturned — defeated but not crying. Soft
front-facing view. Thick black outlines. Flat solid fills, no gradients.
Soft GOLD (#fde054) glow rim halo around the silhouette — but THINNER
and DIMMER than other states (the hero's light is low). Pure flat black
background (#05050a). Centered, upper body visible. 1:1 square. No
text.
```

---

## NOTES FOR DALL-E 3

If outputs drift toward realistic-duck illustration or painterly texture, add to the front of the prompt:

- **"Vinyl toy aesthetic, like a Funko Pop figure or sticker design."**
- **"Iconic rubber bath-toy duck silhouette, not a real bird."**
- **"Flat 2D vector illustration, thick clean outlines, no realism."**

If the deerstalker comes out wrong (DALL-E sometimes draws a normal cap):

- **"Sherlock Holmes deerstalker hat — brown plaid with TWO ear flaps pinned UP on top, NOT a normal baseball cap."**

If the magnifying glass is misshapen:

- **"The magnifying glass is a simple circle with a brass-colored rim and a short straight handle, classic detective style."**

If the gold rim halo gets too thick/flooded:

- **"Thin gold neon outline glow, like a soft halo just outside the silhouette — not a flood of light."**

---

## CALIBRATION

Generate **ducky-investigating first**. If it lands consistent with the suspect roster style and the gold rim halo reads correctly against black, the same style lock will carry the other four states cleanly.

Once `assets/images/ducky/ducky-investigating.png` is in the folder, ping me and I'll wire it into the BETTING-phase case file panel (lower-left, idle breath animation) within minutes.

---

## RECAP — WHY DUCKY IS DIFFERENT FROM SUSPECTS

| | Suspects (8) | Ducky |
|---|---|---|
| Body color | Yellow + faint tint toward signature color | Pure canonical yellow #f5d147 |
| Glow rim color | Each suspect's signature brand color | Always GOLD (win-tier, hero) |
| Costume | Role-specific (butler tux, chef coat, etc.) | Trench coat + deerstalker (locked) |
| States | One portrait each | Five emotional states |
| Purpose | The cast you investigate | The detective you ARE |

Keeping Ducky's body untinted and his glow always gold is the visual contract that says **"this is the hero, everyone else is a suspect."**
