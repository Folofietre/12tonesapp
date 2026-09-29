<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { BEAT, STEPS, noteName, shapeColor, shapeLabel } from '@/lib/music'
import { DEFAULT_OCTAVE, OCTAVE_MAX, OCTAVE_MIN, type NoteEvent, type OrderPreset, type RhythmPreset } from '@/lib/rhythm'
import { useProjectStore } from '@/stores/project'
import { usePlaybackStore } from '@/stores/playback'

const project = useProjectStore()
const playback = usePlaybackStore()

const shape = computed(() => project.selectedShape)
const color = computed(() => shapeColor(project.split, project.group))
const title = computed(
  () => `${shapeLabel(project.split, project.group)} (${project.notesOf(project.split, project.group).map(noteName).join(' ')})`,
)
const steps = Array.from({ length: STEPS }, (_, i) => i)

const isMine = computed(() => playback.isPlayingShape(project.selectedRef))
const sounding = computed(() => new Set(isMine.value ? playback.soundingLanes : []))
const playheadLeft = computed(() => {
  const p = playback.position
  return p && isMine.value ? `${((p.step + p.frac) / STEPS) * 100}%` : null
})

const pcOf = (i: number) => project.row[shape.value.order[i]!]!

// --- pointer editing: a draft is shown while dragging, committed on release
const draft = ref<{ lane: number; event: NoteEvent } | null>(null)
const laneEvent = (i: number): NoteEvent | null =>
  draft.value?.lane === i ? draft.value.event : (shape.value.notes[i] ?? null)

function onPointerDown(e: PointerEvent, i: number) {
  if (e.button !== 0) return
  const cells = e.currentTarget as HTMLElement
  const rect = cells.getBoundingClientRect()
  const cellAt = (x: number) => Math.max(0, Math.min(STEPS - 1, Math.floor(((x - rect.left) / rect.width) * STEPS)))
  const target = e.target as HTMLElement
  const c0 = cellAt(e.clientX)
  const existing = shape.value.notes[i] ?? null
  const mode = target.classList.contains('handle') ? 'resize' : target.closest('.block') && existing ? 'move' : 'create'
  const orig: NoteEvent =
    mode === 'create' ? { start: c0, length: 1, octave: existing?.octave ?? DEFAULT_OCTAVE } : { ...existing! }
  draft.value = { lane: i, event: { ...orig } }
  cells.setPointerCapture(e.pointerId)
  e.preventDefault()

  const move = (ev: PointerEvent) => {
    const c = cellAt(ev.clientX)
    const n = { ...orig }
    if (mode === 'create') {
      n.start = Math.min(c0, c)
      n.length = Math.abs(c - c0) + 1
    } else if (mode === 'resize') {
      n.length = Math.max(1, Math.min(STEPS - n.start, c - n.start + 1))
    } else {
      n.start = Math.max(0, Math.min(STEPS - n.length, orig.start + (c - c0)))
    }
    draft.value = { lane: i, event: n }
  }
  const up = () => {
    cells.removeEventListener('pointermove', move)
    cells.removeEventListener('pointerup', up)
    cells.removeEventListener('pointercancel', up)
    const d = draft.value
    draft.value = null
    if (d) {
      project.setLane(i, d.event)
      playback.preview(pcOf(i), d.event.octave)
      void focusBlock(i)
    }
  }
  cells.addEventListener('pointermove', move)
  cells.addEventListener('pointerup', up)
  cells.addEventListener('pointercancel', up)
}

// --- keyboard editing
const gridEl = ref<HTMLElement | null>(null)
async function focusBlock(i: number) {
  await nextTick()
  gridEl.value?.querySelector<HTMLElement>(`[data-lane="${i}"] .block`)?.focus()
}

function onBlockKey(e: KeyboardEvent, i: number) {
  const n = shape.value.notes[i]
  if (!n) return
  let focus = i
  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    const dir = e.key === 'ArrowUp' ? -1 : 1
    if (i + dir < 0 || i + dir >= shape.value.order.length) return
    project.moveLane(i, dir)
    focus = i + dir
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    project.setLane(i, null)
    e.preventDefault()
    return
  } else if (e.key === 'ArrowRight' && e.shiftKey) {
    project.setLane(i, { ...n, length: Math.min(STEPS - n.start, n.length + 1) })
  } else if (e.key === 'ArrowLeft' && e.shiftKey) {
    project.setLane(i, { ...n, length: Math.max(1, n.length - 1) })
  } else if (e.key === 'ArrowRight') {
    project.setLane(i, { ...n, start: Math.min(STEPS - n.length, n.start + 1) })
  } else if (e.key === 'ArrowLeft') {
    project.setLane(i, { ...n, start: Math.max(0, n.start - 1) })
  } else {
    return
  }
  e.preventDefault()
  void focusBlock(focus)
}

function addNote(i: number) {
  project.setLane(i, { start: 0, length: BEAT, octave: DEFAULT_OCTAVE })
  void focusBlock(i)
}
function shiftOctave(i: number, delta: number) {
  const n = shape.value.notes[i]
  if (!n) return
  const octave = Math.max(OCTAVE_MIN, Math.min(OCTAVE_MAX, n.octave + delta))
  project.setLane(i, { ...n, octave })
  playback.preview(pcOf(i), octave)
}
function moveLane(i: number, dir: -1 | 1) {
  project.moveLane(i, dir)
}

const orderPresets: [OrderPreset, string][] = [
  ['clockwise', 'Clockwise'],
  ['counterclockwise', 'Counter-clockwise'],
  ['shuffle', 'Shuffle'],
]
const rhythmPresets: [RhythmPreset, string][] = [
  ['sequence', 'Sequence'],
  ['chord', 'Chord'],
  ['staircase', 'Staircase'],
  ['random', 'Random'],
]

const blockStyle = (n: NoteEvent) => ({
  left: `calc(${n.start} / ${STEPS} * 100% + 2px)`,
  width: `calc(${n.length} / ${STEPS} * 100% - 4px)`,
})
</script>

<template>
  <section class="panel span-2 editor" aria-labelledby="h-rhythm" :style="{ '--col': color }">
    <h2 id="h-rhythm">Rhythm <span class="sub">1 bar = 16 sixteenth notes</span></h2>
    <div class="toolbar head">
      <span class="title">{{ title }}</span>
      <span class="spacer" />
      <button class="btn small" :aria-pressed="playback.follow" @click="playback.follow = !playback.follow">
        Follow playback
      </button>
    </div>

    <div ref="gridEl" class="grid">
      <div class="ruler" aria-hidden="true">
        <div />
        <div class="cells">
          <span v-for="s in steps" :key="s" :class="{ beat: s % BEAT === 0 }">{{ s % BEAT === 0 ? s / BEAT + 1 : '.' }}</span>
        </div>
      </div>

      <div
        v-for="(pos, i) in shape.order"
        :key="pos"
        class="lane"
        :class="{ sounding: sounding.has(i) }"
        :data-lane="i"
      >
        <div class="label">
          <span class="ord" aria-hidden="true">{{ i + 1 }}</span>
          <span class="mv">
            <button :disabled="i === 0" :aria-label="`Play ${noteName(pcOf(i))} earlier`" @click="moveLane(i, -1)">
              <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true"><path d="M0 6L4 1L8 6" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
            </button>
            <button
              :disabled="i === shape.order.length - 1"
              :aria-label="`Play ${noteName(pcOf(i))} later`"
              @click="moveLane(i, 1)"
            >
              <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden="true"><path d="M0 0L4 5L8 0" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
            </button>
          </span>
          <button class="nm" :aria-label="`Preview ${noteName(pcOf(i))}`" @click="playback.preview(pcOf(i), shape.notes[i]?.octave ?? DEFAULT_OCTAVE)">
            {{ noteName(pcOf(i)) }}
          </button>
          <span v-if="shape.notes[i]" class="oct">
            <button :aria-label="`${noteName(pcOf(i))} octave down`" @click="shiftOctave(i, -1)">-</button>
            <span :aria-label="`octave ${shape.notes[i]!.octave}`">{{ shape.notes[i]!.octave }}</span>
            <button :aria-label="`${noteName(pcOf(i))} octave up`" @click="shiftOctave(i, 1)">+</button>
          </span>
          <button v-else class="add-note" :aria-label="`Add a note for ${noteName(pcOf(i))}`" @click="addNote(i)">rest +</button>
        </div>

        <div class="cells" @pointerdown="onPointerDown($event, i)">
          <div v-for="s in steps" :key="s" class="cell" :class="{ beat: s % BEAT === 0 }" />
          <div
            v-if="laneEvent(i)"
            class="block"
            :class="{ on: sounding.has(i) }"
            :style="blockStyle(laneEvent(i)!)"
            tabindex="0"
            role="button"
            aria-roledescription="note"
            :aria-label="`${noteName(pcOf(i))}, note ${i + 1}: starts at step ${laneEvent(i)!.start + 1}, lasts ${laneEvent(i)!.length} steps, octave ${laneEvent(i)!.octave}`"
            aria-describedby="rhythm-keys"
            @keydown="onBlockKey($event, i)"
            @dblclick.stop="project.setLane(i, null)"
          >
            {{ laneEvent(i)!.start + 1 }}+{{ laneEvent(i)!.length }}
            <span class="handle" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div class="playhead-track" aria-hidden="true">
        <div v-if="playheadLeft" class="playhead" :style="{ left: playheadLeft }" />
      </div>
    </div>

    <div class="toolbar foot">
      <span class="field">Order</span>
      <button v-for="[k, label] in orderPresets" :key="k" class="btn small" @click="project.applyOrder(k)">{{ label }}</button>
      <span class="field sep">Rhythm</span>
      <button v-for="[k, label] in rhythmPresets" :key="k" class="btn small" @click="project.applyRhythm(k)">{{ label }}</button>
      <span class="spacer" />
      <button class="btn small" @click="project.addClip()">+ Add to arrangement</button>
    </div>
    <p id="rhythm-keys" class="hint">
      Lanes play in the order shown: use the arrows to reorder (or Alt+Up/Down on a note). Drag in a lane to draw a
      note, drag a note to move it, drag its right edge to resize, double-click to turn it into a rest. Keyboard on a
      note: Left/Right move, Shift+Left/Right resize, Delete makes it a rest.
    </p>
  </section>
</template>

<style scoped>
.sub { text-transform: none; letter-spacing: 0; font-weight: 400; }
.head { margin-bottom: 8px; }
.title { font-family: var(--mono); font-weight: 600; color: var(--col); }
.grid { --label: 176px; position: relative; user-select: none; touch-action: none; }
.ruler, .lane { display: grid; grid-template-columns: var(--label) 1fr; align-items: center; }
.cells { position: relative; display: grid; grid-template-columns: repeat(16, 1fr); height: 100%; }
.ruler { height: 22px; font-family: var(--mono); font-size: 10px; color: var(--muted); }
.ruler .cells span { padding-left: 3px; border-left: 1px solid transparent; }
.ruler .cells span.beat { color: var(--text); border-left-color: var(--line-2); }
.lane { height: 40px; border-top: 1px solid var(--line); }
.lane:last-of-type { border-bottom: 1px solid var(--line); }
.label { display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 12px; padding-right: 8px; }
.ord { width: 18px; height: 18px; border-radius: 50%; background: var(--col); color: #05070d; font-size: 10px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; flex: none; }
.mv { display: inline-flex; flex-direction: column; gap: 1px; }
.mv button { width: 18px; height: 14px; padding: 0; border-radius: 3px; background: var(--panel-2); border: 1px solid var(--line-2); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.mv button:disabled { opacity: .3; cursor: default; }
.nm { width: 34px; font-weight: 600; cursor: pointer; background: none; border: 0; padding: 2px 0; text-align: left; font-family: var(--mono); }
.oct { display: inline-flex; align-items: center; gap: 3px; color: var(--muted); }
.oct button, .add-note { height: 20px; border-radius: 4px; background: var(--panel-2); border: 1px solid var(--line-2); cursor: pointer; font-size: 12px; line-height: 1; }
.oct button { width: 20px; padding: 0; }
.add-note { padding: 0 6px; color: var(--muted); font-family: var(--mono); }
.lane .cell { border-left: 1px solid var(--line); height: 100%; cursor: crosshair; }
.lane .cell.beat { border-left-color: var(--line-2); background: rgba(255, 255, 255, .015); }
.lane.sounding .nm { color: var(--col); text-shadow: 0 0 8px var(--col); }
.block {
  position: absolute; top: 5px; bottom: 5px; border-radius: 6px;
  background: color-mix(in srgb, var(--col) 30%, transparent); border: 1.5px solid var(--col);
  cursor: grab; display: flex; align-items: center; padding-left: 6px;
  font-family: var(--mono); font-size: 11px; overflow: hidden; white-space: nowrap;
}
.block:focus-visible { outline: 2px solid #fff; }
.block.on { background: var(--col); color: #05070d; box-shadow: 0 0 14px var(--col); }
.handle { position: absolute; right: 0; top: 0; bottom: 0; width: 10px; cursor: ew-resize; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--col) 60%, transparent)); }
.playhead-track { position: absolute; top: 22px; bottom: 0; left: var(--label); right: 0; pointer-events: none; }
.playhead { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 8px #fff; }
.foot { margin-top: 10px; }
.sep { margin-left: 12px; }
@media (max-width: 640px) { .grid { --label: 124px; } .label { gap: 4px; } .ord { display: none; } }
@media (prefers-reduced-motion: reduce) { .block.on { box-shadow: none; } }
</style>
