# V6B Generator Studio (local app prototype)

A standalone Windows XP-style web application that **calls the original** `chars-iso/v6b/tools/live_v6b.py`. It does not substitute its own drawing engine, and it does not change the Mahluk Hidup site, original source sprites, gameplay, or approved art.

## Windows portable app (no Python installation)

The Windows build is created by the separate **V6B Generator Studio — Windows Portable EXE** GitHub Actions workflow:

1. Open the [Windows EXE workflow](https://github.com/lafrich/virtual-life-asset-pipeline/actions/workflows/build-v6b-windows.yml).
2. Open the latest **successful** run for `feature/v6b-generator-studio-app`.
3. Under **Artifacts**, download **V6B-Generator-Studio-Windows** (ZIP).
4. Extract the ZIP to a folder on your Windows PC/laptop. Keep `_internal` beside the EXE.
5. Double-click **V6B Generator Studio.exe**. It starts the bundled original Python engine on `127.0.0.1` and automatically opens the Studio in your browser.
6. Leave the small launcher window open while generating. Click **EXIT** in the launcher to stop the local engine.

The build contains Python 3.11 runtime, Pillow, NumPy, native engine, source references and site UI. No PowerShell, pip, Render or network connection is required to generate. Windows 10/11 x64 only; macOS and Linux require a separate build. The executable is currently unsigned, so Windows may show SmartScreen—verify it is the artifact built from your own GitHub repository before opening it.

This is a desktop **launcher with local browser UI**, not an embedded WebView. Generated PNGs and JSON configurations can be exported from the Studio.

## Run (Python source / development)

From the repository root, with Python 3.11+:

```sh
python -m pip install -r requirements.txt
python apps/v6b_studio/server.py
```

Open **http://127.0.0.1:8766** in your browser. Keep the Python process running during use. The server binds to loopback only when launched locally without the Render `PORT` variable.

## Current features

- Start from the actual V6B Ichsan or Noor character source configuration.
- Choose native long / mid / wavy hair and curtain / swept / bangs fringe.
- Recolor skin, hair, top, outer, trousers and shoes via the V6B palette ramp system.
- Toggle glasses, lashes, mustache, stubble, ripped pants and cardigan print.
- Generate with the real Python NumPy/Pillow engine, isolated in a temporary folder.
- Preview **SE, SW, NE, NW** for all 11 source expressions and all 11 native actions.
- Pause / play sprite frames and jump between frames.
- Export the native full **384×4928 PNG** spritesheet and engine-compatible source JSON.
- Import an exported JSON config to edit again.

## Boundaries

This is a **local Python-backed app**, *not yet a hosted GitHub Pages generator*. GitHub Pages is static and cannot run the V6B Python engine. The main Mahluk Hidup site has not been modified. There is no server-side asset publishing, persistent asset database, automatic save to Semesta, or launcher link.

Preview face selection is recomposited from real native V6B layers; export of the full sheet uses the source engine's baked face sequence, not the selected preview expression. This is intentional and is not a custom face replacement.

V6B's native `live_v6b.py` does not yet expose an independent male/female anatomical slider. The starting reference can be Ichsan or Noor, but **changing a reference is not equivalent to a universally rigged male/female base**. Rig editing and per-limb bone transformations are out of scope and should remain separate from this generator.

Build outputs are temporary and deleted when the local server closes (up to two recent characters are cached). Export PNG and JSON if you need to keep them.

## Validation

```sh
python -m unittest discover -s apps/v6b_studio -p 'test_*.py' -v
node --check apps/v6b_studio/app.js
```

Source of truth: `chars-iso/v6b/tools/live_v6b.py`, `chars-iso/v6b/live/chars/*.json`. Review generated visual results before any integration/deploy, per `AGENTS.md`.
