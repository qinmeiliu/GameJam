# QUACKDUNNIT — Image Assets

Drop PNG files here. Each subfolder corresponds to a load slot already wired up in `src/scenes/PreloadScene.js`. To activate an asset, drop the file in the matching folder AND uncomment the `this.load.image(...)` line in PreloadScene.

## Folder structure

```
assets/images/
├── ducky/         ← Ducky mascot states (idle, pointing, win, lose, etc.)
├── suspects/      ← 8 suspect portraits — butler.png, chef.png, mayor.png, janitor.png, count.png, mime.png, duchess.png, librarian.png
├── victims/       ← 10 victim portraits — victor.png, quackton.png, plumage.png, mallard.png, dabbler.png, webster.png, fowler.png, quackbert.png, featherly.png, bobsworth.png
├── ui/            ← Logos, button textures, panel ornaments
├── chips/         ← Optional chip art (currently rendered as vector circles)
└── backgrounds/   ← Optional scene backgrounds (currently rendered as vector dot matrix)
```

## File specs

| Type | Size | Background | Notes |
|---|---|---|---|
| Ducky | 256×256 | transparent | One PNG per emotional state |
| Suspect portrait | 160×180 | transparent | Vertical framing — fits inside hex |
| Victim portrait | 200×200 | transparent | Used in BETTING case-file panel |
| Background | 1280×720 | opaque | Full-screen scene background |
| UI ornament | varies | transparent | Tile/repeat-friendly when possible |

## Fall-back behavior

Every scene checks `this.textures.exists(key)` before using a sprite. If the texture isn't loaded, the scene falls back to the existing vector graphics. This means art can land incrementally without breaking the game — drop in one sprite, the rest stay vector until they're ready.
