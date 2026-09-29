# Twelve Tone Shapes

Build shapes from a circle of 12 notes, give each shape a rhythm, and play them one after the other.

**Open the app:** https://folofietre.github.io/12tonesapp/

The idea comes from Ron Jarzombek's 12-tone writing systems. Place the 12 notes anywhere around a clock face, then cut the circle into groups:

- [Circle Of 12 Tones](https://www.ronjarzombek.com/rj12tone.html): each group takes every Nth note (two groups of 6, three groups of 4, four groups of 3...).
- [12-Tones In Fragmented Rows](https://www.ronjarzombek.com/CretaceousChasmTab1.html): each group is a run of neighbouring notes on the clock.

Each group draws a shape and has its own sound. This app lets you hear those shapes and turn them into rhythmic phrases.

Everything runs in your browser. Nothing is sent online: your work is saved on your computer, and you can export it to a file.

## Quick start

1. Press **Play** (or the Space bar). The demo plays an excerpt of "Cretaceous Chasm" by Blotted Science (see [Credits](#credits)).
2. Click **Random** above the circle to get a new tone row, and press Play again.
3. In the **Split** panel, pick a way to group the notes and a split (for example **4 x 3**), then click a shape card to select it.
4. In the **Rhythm** panel, set the bar length and drag in a lane to draw when each note starts and how long it lasts.
5. Click **+** on a shape card (or **+ Add to arrangement**) to add it as a bar, and build your sequence.

## The screen

### Arrangement (top)

The arrangement is a list of bars, played one after the other, then looped (turn **Loop** off to play it once). Each bar is drawn with a width proportional to its length, with its time signature next to its name.

- Add bars with **+** on a shape card, **+ Add to arrangement**, or **Add all shapes** (every shape of the current split).
- Drag a bar to move it. Click it to edit its shape. Remove it with **x**.
- Bars that use the same shape share the same rhythm and bar length: editing it changes all of them.
- With an empty arrangement, Play loops the selected shape.
- The project name and its credits, when there are some, are shown in this panel.

### Tone circle

The 12 notes sit on a clock face. Position "12" is at the top.

- **Random**, **Circle of 5ths**, **Chromatic**: replace the whole row.
- **Swap two notes**: click a note, then click another one (the first one gets a dashed outline).
- **Type a row**: enter 12 different notes in the field below the circle, separated by spaces, then press Enter or **Apply row**. Sharps and flats both work: `C Db D Eb E F Gb G Ab A Bb B`. Notes are always displayed with sharps.
- The selected shape is highlighted. Small numbered badges and dashed arrows show the order in which its notes are played.
- While playing, the notes you hear light up, the center shows their names, and the outer ring shows the position in the bar (one tick per step).

### Split

First choose how to group the notes:

- **Every Nth note**: each group takes every Nth note of the circle.
- **Neighbours**: each group is a run of neighbouring notes. Use **-** and **+** to rotate where the groups start.

Then choose the split:

| Split | Every Nth note | Neighbours | Notes per shape |
|---|---|---|---|
| 1 x 12 | the full circle | the full circle, from the chosen start | 12 |
| 2 x 6 | two hexagons | two halves | 6 |
| 3 x 4 | three squares | three quarters | 4 |
| 4 x 3 | four triangles | four runs of 3 | 3 |
| 6 x 2 | six tritones | six pairs of neighbours | 2 |

Shape names:

- Every Nth note: size and letter. **4-A**, **4-B**, **4-C** are the three squares; **3-A** to **3-D** the four triangles.
- Neighbours: **R**, the size, and the clock position of the first note. **R6@10** is the run of 6 notes starting at position 10 (10, 11, 12, 1, 2, 3).

Click a card to edit that shape.

### Rhythm

Each shape has its own bar length, counted in sixteenth notes (steps), from 4 to 64. The default is 16 (4/4). Set it with the **Bar** field, or pick a common meter in the **Meter...** list (for example 20 = 5/4, 22 = 11/8, 40 = 10/4). Each note of the shape has its own lane, and plays once per bar.

- **Draw a note**: press in a lane and drag. The block shows `start+length`, for example `5+4` starts on step 5 and lasts 4 steps.
- **Move** a block by dragging it, **resize** it by dragging its right edge.
- **Rest**: double-click a block to silence that note. Click **rest +** to bring it back.
- **Octave**: the **-** and **+** buttons next to each note (octaves 1 to 7).
- **Preview**: click a note name to hear it.
- **Play order**: lanes are played in the order shown. Use the small arrows to move a note earlier or later. Its rhythm moves with it.
- **Order** buttons: **Clockwise**, **Counter-clockwise**, **Shuffle**.
- **Rhythm** buttons: **Sequence** (one note after the other), **Chord** (all together, whole bar), **Staircase** (notes enter one by one and hold), **Random**.
- **Follow playback**: when on, the editor switches to the shape being played.
- Making a bar shorter pulls the notes that no longer fit back inside it.

### Transport (top bar)

- **Play / Stop** (Space bar).
- **BPM**: tempo, from 30 to 300 (quarter notes per minute).
- **Sound**: Synth, Piano, Guitar clean, Guitar distortion. All sounds are generated in the browser.
- **Loop**, **Click** (metronome on each quarter note, accent on the first beat of each bar).
- The dots show the beats of the current bar, then the current bar and step.

## Saving and sharing

- **Autosave**: your project is saved in this browser automatically. It stays on this computer and in this browser only (another browser or computer will not see it, and clearing site data erases it).
- **Export config**: downloads a `.json` file with your tone row, shapes, rhythms, bar lengths, arrangement, tempo, sound, and the project name and credits. Keep it as a backup or send it to someone.
- **Import config**: loads such a file. It replaces the current project, so export first if you want to keep it. If the file is invalid, a message explains why and nothing is changed. Files from earlier versions of the app still load.
- **Export MIDI**: downloads a `.mid` file of the arrangement (or of the selected shape if the arrangement is empty), to open in a DAW or a score editor. Time signatures follow the bar lengths, and the instrument is set to the matching General MIDI sound.
- **Load demo...**: replaces the current project with one of the demos (asks for confirmation):
  - "Cretaceous Chasm" (Blotted Science, excerpt), in the Neighbours mode;
  - "Circle of fifths shapes", in the Every Nth note mode.

### Config file format

The file is plain JSON, so you can also write or edit it by hand:

```json
{
  "format": "twelve-tone-shapes",
  "version": 2,
  "title": "My study",
  "credits": "Optional text: authors, sources, links",
  "bpm": 96,
  "instrument": "synth",
  "row": ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"],
  "shapes": [
    {
      "split": 3,
      "group": 1,
      "steps": 16,
      "order": [10, 7, 4, 1],
      "notes": [
        { "start": 0, "length": 4, "octave": 4 },
        null,
        { "start": 8, "length": 2, "octave": 5 },
        { "start": 12, "length": 4, "octave": 3 }
      ]
    },
    {
      "run": { "start": 10, "size": 6 },
      "steps": 20,
      "order": [2, 3, 11, 10, 0, 1],
      "notes": [
        { "start": 0, "length": 3, "octave": 1 },
        { "start": 3, "length": 3, "octave": 1 },
        { "start": 6, "length": 4, "octave": 2 },
        { "start": 10, "length": 2, "octave": 2 },
        { "start": 14, "length": 4, "octave": 2 },
        { "start": 18, "length": 2, "octave": 2 }
      ]
    }
  ],
  "arrangement": [
    { "split": 3, "group": 1 },
    { "run": { "start": 10, "size": 6 } }
  ]
}
```

- `title` and `credits` are optional. Links in the credits are clickable in the app.
- `row`: the 12 notes, starting at the top of the circle and going clockwise. All 12 must be different.
- `instrument`: `synth`, `piano`, `guitar-clean` or `guitar-dist`.
- A shape (and each bar of `arrangement`) is one of:
  - every Nth note: `split` is the number of groups (1, 2, 3, 4 or 6) and `group` which one, from 0. Group `g` of split `s` holds the positions `g`, `g + s`, `g + 2s`... For example split 3, group 1 holds 1, 4, 7, 10.
  - neighbours: `run` with `start` (circle position of the first note, 0 to 11) and `size` (2, 3, 4, 6 or 12). For example start 10, size 6 holds 10, 11, 0, 1, 2, 3.
- Circle positions are numbered from 0 (the top, shown as "12") to 11, clockwise.
- `steps`: bar length in sixteenth notes, from 4 to 64. Optional, 16 by default.
- `order`: the circle positions of the shape, in play order.
- `notes`: one entry per position in `order`. `start` goes from 0 to `steps - 1` (0 is the first step of the bar), `length` in steps, `octave` from 1 to 7. `null` means a rest.
- Shapes you never edited can be left out: they use the default rhythm.
- Out-of-range values are brought back within limits.
- Files with `"version": 1` (from the first release) are still accepted: their bars are 16 steps long.

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

## Credits

The 12-tone writing systems used by this app ("Circle Of 12 Tones" and "12-Tones In Fragmented Rows") were created and described by Ron Jarzombek: https://www.ronjarzombek.com

The default demo is an excerpt of **"Cretaceous Chasm"** by **Blotted Science**, from the EP **"The Animation Of Entomology"**. Music by Jarzombek, Webster and Grossmann. © Spastic Music (BMI). All rights belong to their owners.

- The circle (the song's "key": E F A# B F# G Eb D A G# Db C), the note groups and the riffs (worms, cricket on back) come from Ron Jarzombek's transcription and explanation: https://www.ronjarzombek.com/CretaceousChasmTab1.html (tab: https://www.ronjarzombek.com/CretaceousChasmTab2.pdf).
- Video: https://www.youtube.com/watch?v=IVyUHFl0iB8
- The excerpt is included as a study example of the system. Octaves are a reading of the tab (7-string guitar tuned A E A D G B E), and the sounds are synthesized, so it is an approximation of the recording.

This app is an independent project and is not affiliated with Ron Jarzombek or Blotted Science.

## Feedback

Report bugs or ideas in the [GitHub issues](https://github.com/Folofietre/12tonesapp/issues). Please mention the version shown at the bottom of the page.
