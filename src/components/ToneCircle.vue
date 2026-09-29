<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CHROMATIC,
  CIRCLE_OF_FIFTHS,
  STEPS,
  BEAT,
  groupPositions,
  noteName,
  parseRow,
  positionLabel,
  shapeColor,
  shapeLabel,
} from '@/lib/music'
import { useProjectStore } from '@/stores/project'
import { usePlaybackStore } from '@/stores/playback'
import { useToast } from '@/composables/useToast'

const project = useProjectStore()
const playback = usePlaybackStore()
const toast = useToast()

const R = 150
const pt = (pos: number, r = R): [number, number] => {
  const a = (pos / 12) * Math.PI * 2 - Math.PI / 2
  return [Math.cos(a) * r, Math.sin(a) * r]
}
const pts = (positions: number[], r = R) => positions.map((p) => pt(p, r).join(',')).join(' ')

const shapes = computed(() =>
  project.groups.map((g) => ({
    group: g,
    positions: groupPositions(project.split, g),
    color: shapeColor(project.split, g),
  })),
)

/** Shape highlighted: the one playing if it belongs to this split, else the selected one. */
const activeGroup = computed(() => {
  const r = playback.playingRef
  if (r) return r.split === project.split ? r.group : -1
  return project.group
})

const selectedColor = computed(() => shapeColor(project.split, project.group))
const orderIndex = computed(() => new Map(project.selectedShape.order.map((p, i) => [p, i])))

/** Dashed arrows between consecutive notes of the selected shape, stopping at the badges. */
const orderArrows = computed(() => {
  const order = project.selectedShape.order
  const out: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i < order.length - 1; i++) {
    const [x1, y1] = pt(order[i]!, R - 30)
    const [x2, y2] = pt(order[i + 1]!, R - 30)
    const d = Math.hypot(x2 - x1, y2 - y1) || 1
    const k = 11 / d
    out.push({ x1: x1 + (x2 - x1) * k, y1: y1 + (y2 - y1) * k, x2: x2 - (x2 - x1) * k, y2: y2 - (y2 - y1) * k })
  }
  return out
})

const sounding = computed(() => new Set(playback.soundingPositions))
const playColor = computed(() => {
  const r = playback.playingRef
  return r ? shapeColor(r.split, r.group) : ''
})

const ticks = Array.from({ length: STEPS }, (_, i) => {
  const a = (i / STEPS) * Math.PI * 2 - Math.PI / 2
  return { i, x: Math.cos(a) * 188, y: Math.sin(a) * 188, rot: (i / STEPS) * 360, beat: i % BEAT === 0 }
})
const currentStep = computed(() => playback.position?.step ?? -1)

const centerMain = computed(() => {
  const r = playback.playingRef
  if (r && playback.soundingPositions.length) return playback.soundingPositions.map((p) => noteName(project.row[p]!)).join(' ')
  return shapeLabel(project.split, project.group)
})
const centerSub = computed(() => {
  const r = playback.playingRef
  if (r && playback.soundingPositions.length) return shapeLabel(r.split, r.group)
  return project.notesOf(project.split, project.group).map(noteName).join(' ')
})

// --- swapping two notes
const swapPick = ref<number | null>(null)
function pick(p: number) {
  playback.preview(project.row[p]!, 4)
  if (swapPick.value === null) {
    swapPick.value = p
    return
  }
  if (swapPick.value !== p) project.swapPositions(swapPick.value, p)
  swapPick.value = null
}

// --- typed row
const rowText = ref('')
const rowInvalid = ref(false)
const rowDisplay = computed(() => project.row.map(noteName).join(' '))
function applyRow() {
  const row = parseRow(rowText.value || rowDisplay.value)
  if (!row) {
    rowInvalid.value = true
    toast.show('A tone row needs 12 distinct notes, for example: C G D A E B F# C# G# D# A# F', true)
    return
  }
  rowInvalid.value = false
  rowText.value = ''
  project.setRow(row)
}
</script>

<template>
  <section class="panel" aria-labelledby="h-circle">
    <h2 id="h-circle">
      <span class="grow">Tone circle</span>
      <button class="btn small" @click="project.randomRow()">Random</button>
      <button class="btn small" @click="project.setRow(CIRCLE_OF_FIFTHS)">Circle of 5ths</button>
      <button class="btn small" @click="project.setRow(CHROMATIC)">Chromatic</button>
    </h2>

    <svg class="circle" viewBox="-210 -210 420 420" role="group" aria-label="Circle of twelve tones">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="context-stroke" />
        </marker>
      </defs>

      <g aria-hidden="true">
        <rect
          v-for="t in ticks"
          :key="t.i"
          :x="t.beat ? -2.5 : -1.5"
          y="-8"
          :width="t.beat ? 5 : 3"
          height="16"
          rx="1.5"
          class="tick"
          :class="{ beat: t.beat, done: t.i < currentStep, now: t.i === currentStep }"
          :transform="`translate(${t.x} ${t.y}) rotate(${t.rot})`"
        />
      </g>
      <circle :r="R" fill="none" stroke="var(--line)" />

      <g>
        <component
          :is="s.positions.length === 2 ? 'polyline' : 'polygon'"
          v-for="s in shapes"
          :key="s.group"
          :points="pts(s.positions)"
          class="shape"
          :class="{ active: s.group === activeGroup, dim: s.group !== activeGroup }"
          :stroke="s.color"
          :fill="s.color"
          @click="project.select(project.split, s.group)"
        />
      </g>

      <g aria-hidden="true">
        <line
          v-for="(a, i) in orderArrows"
          :key="i"
          v-bind="a"
          class="order-path"
          :stroke="selectedColor"
          marker-end="url(#arrow)"
        />
      </g>

      <g
        v-for="(pc, p) in project.row"
        :key="p"
        class="node"
        :class="{ selected: swapPick === p, sounding: sounding.has(p) }"
        tabindex="0"
        role="button"
        :aria-label="`Position ${positionLabel(p)}: ${noteName(pc)}${swapPick === p ? ', selected for swap' : ''}`"
        @click="pick(p)"
        @keydown.enter.prevent="pick(p)"
        @keydown.space.prevent="pick(p)"
      >
        <circle
          class="dot"
          :cx="pt(p)[0]"
          :cy="pt(p)[1]"
          :r="sounding.has(p) ? 22 : 17"
          :style="{ stroke: shapeColor(project.split, p % project.split), fill: sounding.has(p) ? playColor + '44' : undefined }"
        />
        <text :x="pt(p)[0]" :y="pt(p)[1]">{{ noteName(pc) }}</text>
        <text class="pos-label" :x="pt(p, R + 26)[0]" :y="pt(p, R + 26)[1]">{{ positionLabel(p) }}</text>
        <g v-if="orderIndex.has(p)" class="badge" :transform="`translate(${pt(p, R - 30).join(' ')})`">
          <circle r="8" :fill="selectedColor" />
          <text>{{ orderIndex.get(p)! + 1 }}</text>
        </g>
      </g>

      <text class="center-main" y="0">{{ centerMain }}</text>
      <text class="center-sub" y="26">{{ centerSub }}</text>
    </svg>

    <div class="toolbar row-tools">
      <label class="sr-only" for="row-input">Tone row: 12 distinct notes separated by spaces</label>
      <input
        id="row-input"
        v-model="rowText"
        :placeholder="rowDisplay"
        :class="{ invalid: rowInvalid }"
        :aria-invalid="rowInvalid"
        spellcheck="false"
        autocomplete="off"
        @keydown.enter="applyRow"
      />
      <button class="btn small" @click="applyRow">Apply row</button>
    </div>
    <p class="hint">
      Click two notes to swap them, or type a row of 12 distinct notes. Numbered badges and dashed arrows show the
      play order of the selected shape. Click a shape to select it.
    </p>
  </section>
</template>

<style scoped>
.circle { width: 100%; max-width: 560px; display: block; margin: 0 auto; }
.tick { fill: var(--line-2); }
.tick.beat { fill: var(--muted); }
.tick.done { fill: var(--accent); opacity: .5; }
.tick.now { fill: var(--accent); opacity: 1; }
.shape { fill-opacity: .08; stroke-width: 2; stroke-linejoin: round; cursor: pointer; transition: opacity .15s, fill-opacity .15s; }
.shape.dim { opacity: .18; }
.shape.active { fill-opacity: .18; stroke-width: 2.5; }
.order-path { fill: none; stroke-width: 1.5; stroke-dasharray: 5 4; opacity: .85; }
.node { cursor: pointer; }
.node:focus { outline: none; }
.node .dot { fill: var(--panel); stroke-width: 1.5; }
.node:focus-visible .dot { stroke: var(--focus) !important; stroke-width: 3; }
.node.selected .dot { stroke: #fff !important; stroke-dasharray: 3 3; stroke-width: 2; }
.node.sounding .dot { stroke-width: 3; filter: url(#glow); }
.node text { font-family: var(--mono); font-size: 13px; fill: var(--text); text-anchor: middle; dominant-baseline: central; pointer-events: none; }
.node .pos-label { font-size: 9px; fill: var(--muted); }
.badge text { font-size: 10px; font-weight: 600; fill: #05070d; }
.center-main { font-family: var(--mono); font-size: 26px; fill: var(--text); text-anchor: middle; dominant-baseline: central; }
.center-sub { font-family: var(--mono); font-size: 10px; fill: var(--muted); text-anchor: middle; }
.row-tools { margin-top: 8px; }
#row-input {
  flex: 1; min-width: 200px; background: var(--panel-2); border: 1px solid var(--line-2); border-radius: 8px;
  padding: 6px 10px; font-family: var(--mono); font-size: 12px;
}
#row-input::placeholder { color: var(--muted); }
#row-input.invalid { border-color: var(--danger); }
@media (prefers-reduced-motion: reduce) { .node.sounding .dot { filter: none; } }
</style>
