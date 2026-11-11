# Reviewed releases and audit follow-up

Every source or generated asset change follows: separate branch → tests → pull
request → review → merge. Tests alone are not owner approval of new artwork.

## Release gate

Character Stock now validates the full build on every PR to main. Its build and
Pages deployment depend on the reusable Genesis QA jobs, including browser smoke.
PRs never run the deploy job. Each PR has its own concurrency group. The artifact
that passed validation is the artifact used for deployment.

The eleven canonical asset publisher workflows retain their original generators,
validation, and selected output paths. They upload a tar.gz of staged generated
changes instead of committing or pushing to main. Download and inspect the
artifact, extract it into a fresh feature branch at the generating commit, run
family-specific palette/alpha/pixel regression checks, then open a PR with owner
visual sign-off. An empty archive means no generated change; never force a stock
rewrite just to produce a diff. Artifacts expire after seven days; merged stock
files remain in Git as before.

`make verify` and `make chars` now propagate diff/palette audit failures. Historical
visual exceptions require a documented, specific accepted baseline; they must
not be suppressed with `|| true`. Running the broad verification target generates
ignored files, so use an isolated checkout for verification-only work.

## Repository settings

Branch protection is a GitHub setting, not applied by these YAML files. Require
a PR and passing Genesis syntax-contract/browser-smoke plus catalog build checks
for the current head, resolve review conversations, prohibit force pushes and
deletion, and require owner review. Select check names from an actual green PR
run after rollout. An approving reviewer must be a different GitHub author; the
repository owner's OAuth identity cannot approve its own PR. Do not fabricate an
approval or bypass a required review.

## Preserved boundaries and follow-up

The approved stock remains index official-4 (Male official-3 / Female official-4).
No package, sprite, palette, motion registry, legacy user data, or gameplay master
is replaced by these infrastructure fixes. The LGR storage and renderer fixes
are independent PRs. The existing published Emosi snapshot remains the explicit
Mainkan release source; preview refresh never promotes user artwork silently.

Remaining work requires separate evidence and review:

- Classify retired V6P tests and output-dependent tests without reactivating the
  retired editors. Fresh-clone build-output tests require a generated `_site`.
- Capture an approved renderer baseline before locking/upgrading Pillow/NumPy;
  avoid changing image dependencies and approved pixels together without proof.
- Preserve the truncated legacy `assets/street_vehicles/_work/colours.json` until
  its missing source is recovered; do not invent audit data.
- Author missing gameplay motions only with a character-specific brief and
  four-view visual approval. Existing explicit stand-ins stay available.
- Full Emosi release synchronization across virtual-office and this repository
  needs a reviewed cross-repository release contract and real-account acceptance.

No reusable art learning is promoted by the storage/CI fixes: there is no new
owner-approved visual technique. Existing learning records remain untouched.
