# Twelve Tone Shapes

Build shapes from a circle of 12 notes, give each shape a rhythm, and play them one after the other.

**Open the app:** https://folofietre.github.io/12tonesapp/

The idea comes from Ron Jarzombek's 12-tone study ([rj12tone](https://www.ronjarzombek.com/rj12tone.html)): place the 12 notes anywhere around a clock face, then split the circle into groups (two groups of 6, three groups of 4, four groups of 3...). Each group draws a shape and has its own sound. This app lets you hear those shapes and turn them into rhythmic phrases.

Everything runs in your browser. Nothing is sent online: your work is saved on your computer, and you can export it to a file.

## Quick start

1. Press **Play** (or the Space bar). The demo plays the three squares of the circle of fifths, then a triangle.
2. Click **Random** above the circle to get a new tone row, and press Play again.
3. Pick a split on the right (for example **4 x 3**) and click a shape card to select it.
4. In the **Rhythm** panel, drag in a lane to draw when each note starts and how long it lasts.
5. Click **+** on a shape card (or **+ Add to arrangement**) to add it as a bar, and build your sequence.

## The screen

### Tone circle

The 12 notes sit on a clock face. Position "12" is at the top.

- **Random**, **Circle of 5ths**, **Chromatic**: replace the whole row.
- **Swap two notes**: click a note, then click another one (the first one gets a dashed outline).
- **Type a row**: enter 12 different notes in the field below the circle, separated by spaces, then press Enter or **Apply row**. Sharps and flats both work: `C Db D Eb E F Gb G Ab A Bb B`.
- The selected shape is highlighted. Small numbered badges and dashed arrows show the order in which its notes are played.
- While playing, the notes you hear light up, the center shows their names, and the outer ring of 16 ticks shows the position in the bar.

### Split

Choose how the circle is divided:

| Split | Shapes | Notes per shape |
|---|---|---|
| 1 x 12 | the full circle | 12 |
| 2 x 6 | two hexagons | 6 |
| 3 x 4 | three squares | 4 |
| 4 x 3 | four triangles | 3 |
| 6 x 2 | six lines (tritones) | 2 |

Each group takes every Nth note of the circle. Shapes are named by size and letter: **4-A**, **4-B**, **4-C** are the three squares; **3-A** to **3-D** the four triangles. Click a card to edit that shape.

### Rhythm

One bar has 16 steps (sixteenth notes), grouped in 4 beats. Each note of the shape has its own lane, and plays once per bar.

- **Draw a note**: press in a lane and drag. The block shows `start+length`, for example `5+4` starts on step 5 and lasts 4 steps.
- **Move** a block by dragging it, **resize** it by dragging its right edge.
- **Rest**: double-click a block to silence that note. Click **rest +** to bring it back.
- **Octave**: the **-** and **+** buttons next to each note (octaves 1 to 7).
- **Preview**: click a note name to hear it.
- **Play order**: lanes are played in the order shown. Use the small arrows to move a note earlier or later. Its rhythm moves with it.
- **Order** buttons: **Clockwise**, **Counter-clockwise**, **Shuffle**.
- **Rhythm** buttons: **Sequence** (one note after the other), **Chord** (all together, whole bar), **Staircase** (notes enter one by one and hold), **Random**.
- **Follow playback**: when on, the editor switches to the shape being played.

### Arrangement

The arrangement is a list of bars, played one after the other, then looped (turn **Loop** off to play it once).

- Add bars with **+** on a shape card, **+ Add to arrangement**, or **Add all shapes** (every shape of the current split).
- Drag a bar to move it. Click it to edit its shape. Remove it with **x**.
- Bars that use the same shape share the same rhythm: editing it changes all of them.
- With an empty arrangement, Play loops the selected shape.

### Transport (top bar)

- **Play / Stop** (Space bar).
- **BPM**: tempo, from 30 to 300.
- **Sound**: Synth, Piano, Guitar clean, Guitar distortion. All sounds are generated in the browser.
- **Loop**, **Click** (metronome, accent on the first beat).
- The four dots show the beats, then the current bar and step.

## Saving and sharing

- **Autosave**: your project is saved in this browser automatically. It stays on this computer and in this browser only (another browser or computer will not see it, and clearing site data erases it).
- **Export config**: downloads a `.json` file with your tone row, shapes, rhythms, arrangement, tempo and sound. Keep it as a backup or send it to someone.
- **Import config**: loads such a file. It replaces the current project, so export first if you want to keep it. If the file is invalid, a message explains why and nothing is changed.
- **Export MIDI**: downloads a `.mid` file of the arrangement (or of the selected shape if the arrangement is empty), to open in a DAW or a score editor. The instrument is set to the matching General MIDI sound.
- **Load demo**: goes back to the demo project (asks for confirmation).

### Config file format

The file is plain JSON, so you can also write or edit it by hand:

```json
{
  "format": "twelve-tone-shapes",
  "version": 1,
  "bpm": 96,
  "instrument": "synth",
  "row": ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"],
  "shapes": [
    {
      "split": 3,
      "group": 1,
      "order": [10, 7, 4, 1],
      "notes": [
        { "start": 0, "length": 4, "octave": 4 },
        null,
        { "start": 8, "length": 2, "octave": 5 },
        { "start": 12, "length": 4, "octave": 3 }
      ]
    }
  ],
  "arrangement": [
    { "split": 3, "group": 0 },
    { "split": 3, "group": 1 }
  ]
}
```

- `row`: the 12 notes, starting at the top of the circle and going clockwise. All 12 must be different.
- `instrument`: `synth`, `piano`, `guitar-clean` or `guitar-dist`.
- `split`: number of groups (1, 2, 3, 4 or 6). `group`: which one, from 0.
- `order`: the circle positions of the shape (0 is the top, then clockwise), in play order. Group `g` of split `s` holds the positions `g`, `g + s`, `g + 2s`... For example split 3, group 1 holds 1, 4, 7, 10.
- `notes`: one entry per position in `order`. `start` goes from 0 to 15 (0 is the first step of the bar), `length` in steps, `octave` from 1 to 7. `null` means a rest.
- Shapes you never edited can be left out: they use the default rhythm.
- Out-of-range values are brought back within limits.

## Keyboard

| Where | Keys | Action |
|---|---|---|
| Page (outside buttons and fields) | Space | Play / Stop |
| Circle note | Enter | Select it, then select another note to swap them |
| Note block | Left / Right | Move by one step |
| Note block | Shift + Left / Right | Shorten / lengthen |
| Note block | Alt + Up / Down | Play this note earlier / later |
| Note block | Delete | Turn it into a rest |
| Arrangement bar | Enter | Edit its shape |
| Arrangement bar | Alt + Left / Right | Move the bar |
| Arrangement bar | Delete | Remove the bar |

All buttons are reachable with Tab. Animations are reduced when your system asks for less motion.

## Feedback

Report bugs or ideas in the [GitHub issues](https://github.com/Folofietre/12tonesapp/issues). Please mention the version shown at the bottom of the page.
