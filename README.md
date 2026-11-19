[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?ref=7nvvsk82)
[![rank](https://make.fun/badge/gta6-cover-art-01/Sepsdeod/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/Sepsdeod/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Coast Cover Studio

Entry for the [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01) bounty on [make.fun](https://make.fun).

An offline web app that turns any photo and a caption into GTA-style multi-panel cover art, exported as a PNG to share. Photos never leave the machine — everything runs in the browser from static files, with no network request.

## What it does

- **6 layouts**: Full Bleed, Hero + Three, Four Panel, Nine Panel, Tilted Snapshot, Story Strips — each works in every export size.
- **5 gradient-map grades**: Vice Sunset, Neon Night, Teal Heat, Palm Gold, Mono Noir.
- **Lettering**: Anton display title with a sunset gradient and dark ink outline, a Pacifico neon-script subtitle, a halftone title block, a diagonal badge ribbon, and a 5-star heat meter.
- **Any photo**: add your own photos (FileReader, never uploaded) or use the two bundled samples; click a panel to select it, then crop with zoom and pan sliders or drag the photo inside the panel; fill all panels with one photo or shuffle several across them.
- **Fast and easy**: live preview, one click exports a PNG in 1080 × 1080, 1080 × 1350, or 1920 × 1080 — or all three at once.
- **Polish**: film grain, vignette, inked poster gutters, undo/redo (Ctrl+Z / Ctrl+Y).

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## Originality

All art, lettering, and code are original. No Rockstar Games logo, wordmark, artwork, or font is used. Anton and Pacifico ship under the SIL Open Font License (see `app/fonts/OFL.txt`). The two sample photos under `app/samples/` were made for make.fun with an image model and are free to use.

## License

MIT — see [LICENSE](LICENSE).
