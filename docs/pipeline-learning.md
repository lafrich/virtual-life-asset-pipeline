# Approved Asset → Pipeline Learning (v1)

**Rule: every approved asset contributes a documented learning decision.**
This is cumulative **code and test coverage**, **not machine-learning weight
training**. An AI agent does not acquire new learned weights from GitHub. It
reuses versioned generators, shared geometry, style rules, and regression tests.

## The contract

1. **Explore** a character, prop, building, UI element or animation using
   `STYLE.md` and the relevant existing generator. Keep experimental code local
   to the new asset until it passes the owner's visual review.
2. **Review** actual 1× sprites, 4× previews, relevant directions, states and
   a gameplay context mock. Do not infer approval from a successful build.
3. **Record** what the owner approved, what was rejected, what changed
   technically, and what is genuinely generalizable.
4. **Promote** general techniques to existing shared code or
   `tools/iso_asset_primitives.py` (for 1× pixel geometry) with tests.
   If a technique applies only to this asset, record it as `documented` with
   a substantive rationale. Don't force a useless abstraction.
5. **Regress**: regenerate the approved asset, compare against committed
   masters pixel-for-pixel unless the owner specifically approved visual
   changes. Audit palette/alpha/shadow, pivot, silhouette and all facing
   directions. Keep old assets stable by default.
6. **Merge** the asset and its learning decision in the same pull request
   after owner approval. Live game integration is always a separate task.

Each family that changes its generator or manifest needs
`docs/asset-lessons/<family>.json`. The family is the name after `assets/`,
e.g. `npc_milk_mascot`, `kamar_cove_kosong`, or `environment`.

### Learning record schema

```json
{
  "asset_family": "npc_example",
  "asset_path": "assets/npc_example",
  "status": "candidate",
  "approval_context": "Awaiting owner's visual approval",
  "reusable_insights": ["An actual, testable observation, not generic praise"],
  "promotion": "documented",
  "promotion_rationale": "Technique is local to this design and not yet stable enough for reuse",
  "source": ["assets/npc_example/src/make_example.py"]
}
```

* `status: candidate` means **not yet approved**. Never mark `approved`
  merely because an automated test or an assistant says it looks good.
* `status: approved` means **owner-approved**. Record the visual decision
  in `approval_context`.
* `promotion: shared` needs `reusable_code: [paths...]` and
  `regression_tests: [paths...]`; actual files must exist.
* `promotion: documented` needs `promotion_rationale` and records the
  negative finding, limitation or reason not to generalize.

During a feature branch a candidate record may exist, but before completing
an approved-asset deliverable it should be approved with tests. A CI script
cannot verify human approval; agents must ask the actual owner when unclear.
Never turn a revision the owner rejected into a style or geometry rule.

## Current promoted techniques

**Milk Mascot (approved):**
`docs/asset-lessons/npc_milk_mascot.json`

Reusable in `tools/iso_asset_primitives.py`:

- Isometric text: keep pixel glyph stems vertical, project each glyph column
  onto the actual panel slope (and reverse slope for a mirrored face).
- Rear barcode: keep each bar vertical, compute the overall descending pitch
  from **final-view** NE/NW coordinates. Do not mirror an already skewed
  barcode blindly.
- Attachments: anchor costume sleeves or prop handles *inside* a narrow side
  face, with visible seams, not on the far/back corner.
- Verify using `tests/test_iso_asset_primitives.py` and
  `tools/check_generated_pixels.py` to protect the approved sprite sheet.

**Scope:** these are geometry principles; don't copy Milk Mascot's exact
carton palette or 41–50px dimensions to unrelated props.

## Local commands

```bash
python3 tools/check_asset_lessons.py
python3 tools/check_asset_lessons.py --base origin/main --require-approved
python3 -m unittest discover -s tests -p 'test_iso_asset_primitives.py' -v
python3 assets/npc_milk_mascot/src/make_milk_mascot.py
python3 tools/check_generated_pixels.py 'assets/npc_milk_mascot/sprites/*.png'
python3 tools/audit_colors.py assets/npc_milk_mascot/sprites
./run_all.sh verify
```

The `asset-learning.yml` GitHub Action checks the promoted techniques,
records, rebuilt approved Milk Mascot pixels and color audit. It does not
automatically approve images. If you deliberately change approved pixels,
ask for visual approval and update the committed golden sprites and learning
record together, then adapt the regression comparison for that reviewed
change.

## Future props and catalog

A prop can carry learning about footprint, camera orientation, depth sort,
slice occlusion, collision anchor, animation state, etc. Reuse the shared
`street_buildings/_work/engine.py` and `lib.py` for 2:1 isometric props;
extend generic helpers instead of copying whole generators. Adding props
to an online catalog is a separate display feature, not part of learning.
