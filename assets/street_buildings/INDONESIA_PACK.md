# Indonesia City Pack — Semesta (v1)

20 original Indonesian city and streetscape assets generated with the canonical Virtual Life v6b pixel-art engine.

## Asset catalog

| Category | Asset ID | Name |
|---|---|---|
| Building | `id_warteg_sederhana` | Warteg pinggir jalan |
| Building | `id_bengkel_motor` | Bengkel motor |
| Building | `id_laundry_kiloan` | Laundry kiloan |
| Building | `id_apotek` | Apotek |
| Building | `id_toko_kelontong` | Toko kelontong |
| Building | `id_sekolah_sd` | Sekolah dasar negeri |
| Building | `id_puskesmas` | Puskesmas |
| Building | `id_pasar_rakyat` | Pasar rakyat |
| Building | `id_rumah_betawi` | Rumah Betawi |
| Building | `id_kantor_kelurahan` | Kantor kelurahan |
| Street | `id_gerobak_bakso` | Gerobak bakso |
| Street | `id_gerobak_nasgor` | Gerobak nasi goreng |
| Street | `id_halte_angkot` | Halte angkot |
| Street | `id_pos_satpam` | Pos satpam |
| Street | `id_portal_gang` | Portal gang |
| Street | `id_papan_nama_jalan` | Papan nama jalan |
| Street | `id_bendera_merah_putih` | Bendera Merah Putih |
| Street | `id_umbul_umbul` | Umbul-umbul 17 Agustus |
| Street | `id_gardu_listrik` | Gardu listrik |
| Street | `id_rambu_sekolah` | Rambu zona sekolah |

## Architecture

- Canonical generator: `assets/street_buildings/_work/indonesia.py`.
- Renderer: `assets/street_buildings/_work/lib.py` and `engine.py`.
- Color/art direction: v6b, 2:1 isometric, 64x32 tile, existing material ramps.
- PNG and per-pixel native `__depth.png` for every authored angle. 58 color sprites and 58 matching depth sprites total; some also have optional glow layers.
- Metadata: `assets/street_buildings/indonesia_catalog.json` (one source of truth for sizes, pivots, valid views, and footprint).
- Contact sheet: `assets/street_buildings/indonesia_contact_sheet.png`.
- GitHub Actions: `.github/workflows/publish-indonesia-assets.yml` renders and validates all artifacts.

## Rebuild

From the repository root with Python 3.11+ and `numpy pillow` installed:

```sh
python assets/street_buildings/_work/indonesia.py
```

The Actions workflow checks real PNGs, alpha constraints, per-asset pivots, and depth geometry, then publishes new outputs.

## How Semesta uses it

The editor `lafrich/virtual-office/world-builder/` loads this pack only once the **published manifest exists**. It inserts the published assets into `VLAssetCatalog` and routes sprite PNGs via `VLPipelineAssets.building()` to the canonical repository. It uses the existing 3D pipeline native depth compositor and asset-thumbnails logic rather than fake placeholder geometry. In **FILES / ASSETS**, select **INDONESIA / CITY PACK** to choose and place one asset. Existing maps are not changed automatically.

Not a production game update: this creates content for the Semesta authoring app only. Owner visual sign-off is still pending; the generated contact sheet is the preview for review. Nothing here represents a hand-reviewed visual approval or gameplay-complete building interior.
