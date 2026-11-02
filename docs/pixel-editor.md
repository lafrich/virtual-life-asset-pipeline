# Otis Pixel Editor — 64×112 original source frames

The owner asked to manually correct pixel positioning after repeated automated helmet errors. This is a **real pixel editor**, not a new game mode and not another Rig Studio. It is available at:

- https://lafrich.github.io/virtual-life-asset-pipeline/pixel-editor.html
- Or **Characters → Otis → EDIT OTIS PIXELS**.

## Editing

- Choose any Otis **source motion action**, direction **SE/SW/NE/NW**, and frame.
- Paint with pencil (B), erase (E), sample from the sprite (I), or flood-fill inside the allowed head rectangle (G). Brush sizes 1–4 original pixels.
- The screen view zooms 4×, 6×, 8× or 10× using nearest-neighbor pixels. Grid is optional. A 2× preview shows the exact output.
- Undo/Redo work on previous edit gestures, including after switching directions or frames. `Ctrl/Cmd+Z` reverses the most recent gesture.
- Your **head pixels** are editable within [x8..55, y18..71]. Body, hands, shoes, shadows and pivot elsewhere are locked for Theodore fidelity. To edit the body intentionally, extend the protected editing design in source rather than silently modifying approved artwork.
- The browser stores a local draft via `localStorage` for convenience. **Drafts are device/browser-local** and are not automatically uploaded to GitHub. Clearing your browser data may erase them.
- **CURRENT FRAME.PNG** downloads the selected rendered 64×112 RGBA frame. For a permanent change, use **SAVE PIXEL EDITS.JSON**, not only the PNG.
- **LOAD PIXEL EDITS.JSON** loads existing patches from a file. Drafts may also restore on reopening the page.

## Publishing changes to the pipeline

This website is hosted on static GitHub Pages: it does not have a GitHub write API or a server database, and therefore **cannot auto-commit changes**. The editor never asks for your GitHub password or token.

1. Finish editing any Otis directions / animation frames.
2. Click **SAVE PIXEL EDITS.JSON**, producing `otis_pixel_edits.json`.
3. Upload that JSON here in our ChatGPT conversation, and ask me to apply it to Otis.
4. I will commit it to `assets/npc_otis/pixel_overrides.json`, run validation and the character asset pipeline. The generator reads that same file every build and patches each matched frame *before* its sprite atlas and GIF files are assembled.
5. The finished committed changes then appear on the public Characters page after GitHub Pages deployment.

No future animation rig status is fabricated: pixel patches only affect the **specific actual source action/direction/frame** you edited; they do not automatically retarget every other action or NPC.

## Stable format

```json
{
  "format": "virtual-life-pixel-patch-v1",
  "version": 1,
  "actor": "legacy_otis",
  "frame_size": [64,112],
  "region": [8,18,56,72],
  "frames": [
    {"action":"walk","direction":"se","frame":0,"png":"data:image/png;base64,..."}
  ]
}
```

The PNG data URL holds a complete 64×112 RGBA sprite for accurate edit re-import. The generator copies **only the bounded head rectangle** out of that frame. Files with invalid action IDs, directions, indexes, image dimensions, actor ID or missing PNG pixels fail validation. Thus an old/suspicious patch cannot overwrite Theodore's approved body.
