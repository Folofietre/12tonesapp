# Twelve Tone Shapes: technical notes

For how to use the app, see [README.md](README.md).

Single-page app, fully static: no server, no account, no network calls at runtime (fonts are bundled). The build output is a folder of files that any static host can serve.

## Stack

- Vue 3 (Composition API, `<script setup>`), TypeScript, Pinia
- Vite for dev server and build
- Vitest + Vue Test Utils + jsdom for tests
- Web Audio API for sound (no audio library, no samples)
- Fonts: Inter and JetBrains Mono via Fontsource (self-hosted, so no request to Google Fonts)

Exact versions are in `package.json` / `package-lock.json`.

## Requirements

- Node.js `^22.18.0` or `>=24.12.0` (see `engines` in `package.json`)
- npm 10 or later

Note: the npm 9.2.0 shipped by some Debian/Ubuntu packages crashes on this dependency tree (`Cannot read properties of null (reading 'edgesOut')`). If that happens, use a current npm, for example:

```sh
npm exec --package=npm@11 -- npm install
```

## Commands

```sh
npm install            # install dependencies
npm run dev            # dev server with hot reload (http://localhost:5173/)
npm test               # run all unit tests once
npm run test:unit      # tests in watch mode
npm run type-check     # vue-tsc on app and tests
npm run build          # type-check + production build into dist/ (base "/")
npm run build:pages    # same, with base "/12tonesapp/" for GitHub Pages
npm run preview        # serve dist/ locally
```

To preview the Pages build under its real path:

```sh
npm run build:pages
BASE_PATH=/12tonesapp/ npx vite preview    # then open http://localhost:4173/12tonesapp/
```

## Project layout

```
src/
  lib/                  pure logic, no DOM, no audio (fully unit-tested)
    music.ts            notes, rows, shape references (every Nth / runs), layouts, names, colors, pitch
    rhythm.ts           note events, bar length and meters, presets, lane reordering, order presets
    project.ts          ProjectData type, instruments, tempo limits
    config.ts           JSON config file: toConfig / fromConfig (validation, reads v1 and v2)
    midi.ts             Standard MIDI File writer, sequence to notes and time signatures
    demos.ts            demo projects (Cretaceous Chasm excerpt with its credits, circle of fifths)
    storage.ts          localStorage autosave, file download helper
  audio/
    pluck.ts            Karplus-Strong string synthesis (pure, tested)
    engine.ts           Web Audio output and the 4 instruments
    transport.ts        lookahead scheduler + playback position (tested with a fake clock)
  stores/
    project.ts          project data + current selection, autosave
    playback.ts         play/stop, loop, metronome, follow, current position
  composables/useToast.ts
  components/           TransportBar, ToneCircle, ShapePanel, RhythmEditor, ArrangementPanel
  assets/main.css       design tokens and shared styles
mockup/index.html       original single-file prototype (reference only, not built)
```

## Key design points

**Data model.** The circle is `row: number[]` (position to pitch class, 12 distinct values). A shape is identified by a `ShapeRef`, independent of the screen layout:
- `{ kind: 'nth', split, group }`: every Nth note. Split `s` (1, 2, 3, 4, 6) has `s` groups; group `g` holds positions `g, g+s, g+2s...`. Key `"3:1"`.
- `{ kind: 'run', size, start }`: `size` neighbouring positions from `start`, wrapping at 12 ("fragmented rows"). Key `"run6@10"`.

`layoutRefs(mode, split, offset)` gives the shapes shown for a split; in run mode the offset (0 to size - 1) rotates the cut, and `layoutOf(ref)` goes back from a shape to its layout. Each shape stores `steps` (bar length in sixteenths, 4 to 64), `order` (its positions in play order) and `notes` (one `{start, length, octave}` or `null` per entry of `order`). `order` and `notes` always move together, so reordering keeps each note's rhythm. Shapes never edited are not stored; `defaultShape()` provides them (clockwise, 16 steps).

**Selection vs data.** The grouping mode, split, rotation and selected shape are view state in the project store; they are not saved. Everything in `ProjectData` is saved, including the optional `title` and `credits`.

**Autosave.** The project store watches its data and writes it to `localStorage` (key `toneapp.project.v1`) 300 ms after the last change, in the same format as the exported config file, and re-validates it on load. All GitHub Pages sites of an account share the origin `folofietre.github.io`, hence the prefixed key. Data saved on one origin (localhost, github.io, a future domain) is not visible on another: users move it with Export / Import config.

**Config file.** `format: "twelve-tone-shapes"`, written as `version: 2`; `version: 1` files (no `steps`, `run`, `title`, `credits`) are still read, with 16-step bars. A shape or bar is `{split, group}` or `{run: {start, size}}`. `fromConfig()` rejects wrong format or version, an invalid row, unknown shapes and `order` values that are not a permutation of the shape's positions, with a readable `ConfigError`. Out-of-range numbers are clamped instead of rejected. Any future breaking change must bump `version` and keep reading older versions in `fromConfig()`. The user-facing description is in README.md.

**Audio timing.** `Transport` is a lookahead scheduler: every 25 ms it schedules the steps starting in the next 120 ms on `AudioContext.currentTime`. The display reads the audio clock on each animation frame and shows the last step whose time has passed, so sound and visuals stay in sync regardless of timer jitter. The host (tempo, sequence, shapes, row) is read on every step, so edits apply while playing. Bars can have different lengths: the transport keeps a bar index and a step within the bar, and reads the length of each bar from its shape (if a bar is shortened while playing, it moves on to the next bar). Clock and timers are injectable, which is how the tests drive it.

**Instruments.** All synthesized in `engine.ts`:
- Synth: triangle + detuned sawtooth, low-pass filter
- Piano: 5 additive partials with slight inharmonicity, pitch-dependent decay
- Guitar clean: Karplus-Strong buffer (rendered once per pitch, cached)
- Guitar distortion: same buffer, driven into a tanh waveshaper, then low-pass
Sample-based instruments are a possible later step; embedded samples must have a license that allows redistribution.

**MIDI export.** Format 0, 480 ticks per quarter note (1 step = 120 ticks), a tempo event, a time signature event at the start and at every change of bar length (20 steps = 5/4, 22 = 11/8, 13 = 13/16), one General MIDI program change (80 synth lead, 0 piano, 27 clean guitar, 30 distortion guitar), note-offs sorted before note-ons at equal ticks.

**Version display.** `vite.config.ts` injects `__APP_VERSION__` (from `package.json`) and `__APP_COMMIT__` (`GITHUB_SHA` in CI, else `git rev-parse --short HEAD`, else empty). Both appear in the footer, so testers can report which build they used.

**Accessibility.** Every action works with the keyboard (see README.md). Circle notes, shape cards, note blocks and arrangement bars are focusable with labels describing their state; toasts use `role="status"`. `prefers-reduced-motion` removes glows and transitions.

## Tests

```sh
npm test
```

Covers the pure modules (notes and rows, both grouping modes and rotations, presets, bar lengths and meters, reordering, config validation and version 1 compatibility, MIDI bytes read back by a small parser including time signature changes, pluck pitch via autocorrelation, the demos), the transport with a fake clock (timing, order, rests, bars of different lengths, loop / no loop, metronome, empty sequence), the project store (edits, modes and rotation, bar length, reordering, autosave and restore) and the rhythm editor interactions (keyboard, bar length).

Not covered automatically: actual sound output, pointer drag in the grid, drag and drop in the arrangement. Check these by hand in a browser.

## Deployment

### GitHub Pages (testing)

Site: https://folofietre.github.io/12tonesapp/, repository: https://github.com/Folofietre/12tonesapp

The workflow `.github/workflows/deploy-pages.yml` runs on every push to `main` (and manually from the Actions tab): `npm ci`, `npm test`, `npm run build:pages`, then publishes `dist/`.

One-time setup in the repository: **Settings > Pages > Build and deployment > Source: GitHub Actions**.

The base path `/12tonesapp/` comes from `BASE_PATH` (set by `build:pages`). If the repository is renamed, update that script and the URLs in both READMEs.

### Own server (later, for example an OVH instance)

Run `npm run build` (base `/`) and serve `dist/` with any web server, for example nginx:

```nginx
server {
    server_name example.org;
    root /var/www/12tonesapp;

    location /assets/ {
        # file names contain a content hash
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ /index.html;
    }
}
```

Use HTTPS (for example with Let's Encrypt). It is required if the app ever becomes an installable PWA. To serve it from a sub-path instead of a domain root, build with `BASE_PATH=/sub-path/ npm run build`.

## Demo content and credits

`src/lib/demos.ts` holds the demos. The default one is an excerpt of "Cretaceous Chasm" by Blotted Science (music by Jarzombek, Webster and Grossmann, (c) Spastic Music (BMI)), transcribed from Ron Jarzombek's page https://www.ronjarzombek.com/CretaceousChasmTab1.html and its PDF tab. Its `credits` text travels with the project (autosave and config files) and is shown in the app; README.md has the full credits. Keep them intact when changing the demo, and keep `demos.spec.ts` (which checks the credits and the transcribed notes) passing.
