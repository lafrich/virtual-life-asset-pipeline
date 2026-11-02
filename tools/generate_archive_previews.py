#!/usr/bin/env python3
"""Generate preview-only archival assets for the Paint Catalog build.

Output stays in the ephemeral GitHub Actions workspace. Non-native archival
generators are best-effort; the catalog still lists their source on failures.
Native v6b NPC generation is required: the site should never use fake sprites.
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STEPS = [
    # Original game-native NPCS (18 named NPCs).
    ("native_v6b_roster", ["chars-iso/v6b/tools/npc_v6b.py"], 240, True),
    # Named characters with their own visual rig and multi-action frame sets.
    ("gfunk", ["assets/npc_gfunk/make_gfunk.py"], 120, False),
    ("yerbies", ["assets/npc_yerbies/make_yerbies.py"], 120, False),
    ("theodore", ["assets/npc_theodore/make_theodore.py"], 120, False),
    ("babeh_loak_x3", ["assets/npc_babeh_loak/make_outputs.py"], 150, False),
    ("pak_ogah", ["assets/npc_pak_ogah/make_pak_ogah.py"], 120, False),
    ("kang_parkir", ["assets/npc_kang_parkir/make_kang_parkir.py"], 120, False),
    ("manusia_silver", ["assets/npc_manusia_silver/make_manusia_silver.py"], 120, False),
    ("pemuda_golda", ["assets/npc_pemuda_golda/make_pemuda_golda.py"], 120, False),
    ("barista_famima", ["assets/barista_famima/src/barista.py"], 150, False),
    ("floating_proto_v2", ["assets/npc_preview_v2/make_npcs_v2.py"], 150, False),
]
def main():
    env = dict(os.environ, PYTHONUNBUFFERED="1", NP="4")
    errors = []
    for label, script, timeout, required in STEPS:
        print("GENERATING:", label,flush=True)
        try:
            p = subprocess.run([sys.executable,*script],cwd=ROOT,env=env,
                               capture_output=True,text=True,timeout=timeout)
            if p.returncode:
                raise RuntimeError((p.stdout+"\n"+p.stderr)[-3000:])
            print("BUILT",label, p.stdout[-240:].replace("\n"," "),flush=True)
        except Exception as exc:
            print("ARCHIVE BUILD ERROR:",label, str(exc)[-1600:],file=sys.stderr,flush=True)
            errors.append(label)
            if required: raise
    (ROOT / "_catalog_generator_failures.json").write_text(
        __import__("json").dumps(errors), encoding="utf-8")
    print("Archive generator status: failed",errors,flush=True)

if __name__ == "__main__":
    main()
