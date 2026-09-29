<script setup lang="ts">
import { computed } from 'vue'
import {
  SPLITS,
  groupPositions,
  layoutRefs,
  noteName,
  positionLabel,
  sameRef,
  shapeColor,
  shapeLabel,
  type GroupMode,
  type ShapeRef,
  type SplitId,
} from '@/lib/music'
import { useProjectStore } from '@/stores/project'
import { usePlaybackStore } from '@/stores/playback'

const project = useProjectStore()
const playback = usePlaybackStore()

const pt = (p: number) => {
  const a = (p / 12) * Math.PI * 2 - Math.PI / 2
  return `${Math.cos(a) * 50},${Math.sin(a) * 50}`
}
const thumbPoints = (r: ShapeRef) => groupPositions(r).map(pt).join(' ')
/** Thumbnails follow the current mode and rotation. */
const thumbRefs = (n: SplitId) => layoutRefs(project.mode, n, project.mode === 'run' ? project.offset % (12 / n) : 0)

const modes: { id: GroupMode; label: string; hint: string }[] = [
  { id: 'nth', label: 'Every Nth note', hint: 'Circle of 12 Tones: each group takes every Nth note of the circle.' },
  { id: 'run', label: 'Neighbours', hint: '12-Tones In Fragmented Rows: each group is a run of neighbouring notes on the clock.' },
]
const modeHint = computed(() => modes.find((m) => m.id === project.mode)!.hint)

const splitLabel = (n: SplitId) => (n === 1 ? 'Full circle, 12 notes' : `${n} groups of ${12 / n} notes`)
const notes = (r: ShapeRef) => project.notesOf(r).map(noteName).join(' ')
const firstStart = computed(() => {
  const r = project.layout[0]
  return r && r.kind === 'run' ? positionLabel(r.start) : ''
})
</script>

<template>
  <section class="panel" aria-labelledby="h-split">
    <h2 id="h-split">Split</h2>

    <div class="toolbar modes">
      <div class="segmented" role="radiogroup" aria-label="How to group the notes">
        <button
          v-for="m in modes"
          :key="m.id"
          role="radio"
          :aria-checked="project.mode === m.id"
          @click="project.setMode(m.id)"
        >
          {{ m.label }}
        </button>
      </div>
      <div v-if="project.mode === 'run'" class="rotate" role="group" aria-label="Rotate the groups">
        <button class="btn small" aria-label="Rotate counter-clockwise" @click="project.rotate(-1)">-</button>
        <span class="field">first group starts at <strong>{{ firstStart }}</strong></span>
        <button class="btn small" aria-label="Rotate clockwise" @click="project.rotate(1)">+</button>
      </div>
    </div>

    <div class="splits" role="radiogroup" aria-label="Split the circle">
      <button
        v-for="n in SPLITS"
        :key="n"
        class="split-btn"
        role="radio"
        :aria-checked="n === project.split"
        :aria-label="splitLabel(n)"
        @click="project.setSplit(n)"
      >
        <svg viewBox="-60 -60 120 120" aria-hidden="true">
          <circle r="50" fill="none" stroke="var(--line-2)" />
          <component
            :is="12 / n === 2 && project.mode === 'nth' ? 'polyline' : 'polygon'"
            v-for="r in thumbRefs(n)"
            :key="r.kind === 'nth' ? r.group : r.start"
            :points="thumbPoints(r)"
            fill="none"
            :stroke="shapeColor(r)"
            stroke-width="3"
            stroke-linejoin="round"
          />
        </svg>
        <small>{{ n }} x {{ 12 / n }}</small>
      </button>
    </div>

    <div class="shapes">
      <div
        v-for="(r, g) in project.layout"
        :key="g"
        class="shape-card"
        :class="{ playing: playback.isPlayingShape(r) }"
        :style="{ '--col': shapeColor(r) }"
        role="button"
        tabindex="0"
        :aria-pressed="sameRef(r, project.selectedRef)"
        :aria-label="`Shape ${shapeLabel(r)}: ${notes(r)}`"
        @click="project.select(r)"
        @keydown.enter.prevent="project.select(r)"
        @keydown.space.prevent="project.select(r)"
      >
        <div class="tag">{{ shapeLabel(r) }}</div>
        <div class="notes">{{ notes(r) }}</div>
        <button
          class="btn small add"
          title="Add to arrangement"
          :aria-label="`Add ${shapeLabel(r)} to arrangement`"
          @click.stop="project.addClip(r)"
          @keydown.enter.stop
          @keydown.space.stop
        >
          +
        </button>
      </div>
    </div>
    <p class="hint">
      {{ modeHint }} Notes are listed in the shape's play order.
      <template v-if="project.mode === 'run'">Shape names give the size and the first position, for example R6@10.</template>
    </p>
  </section>
</template>

<style scoped>
.modes { margin-bottom: 10px; }
.segmented { display: inline-flex; border: 1px solid var(--line-2); border-radius: 8px; overflow: hidden; }
.segmented button { background: var(--panel-2); border: 0; padding: 5px 10px; font-size: 12px; cursor: pointer; }
.segmented button + button { border-left: 1px solid var(--line-2); }
.segmented button[aria-checked='true'] { background: color-mix(in srgb, var(--accent) 18%, var(--panel-2)); color: var(--accent); }
.rotate { display: inline-flex; align-items: center; gap: 6px; }
.rotate strong { color: var(--text); }
.splits { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.split-btn { background: var(--panel-2); border: 1px solid var(--line-2); border-radius: 10px; padding: 6px 4px 8px; cursor: pointer; text-align: center; }
.split-btn[aria-checked='true'] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.split-btn svg { width: 100%; max-width: 70px; display: block; margin: 0 auto 2px; }
.split-btn small { font-family: var(--mono); font-size: 10px; color: var(--muted); }
.shapes { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 12px; }
.shape-card { position: relative; background: var(--panel-2); border: 1px solid var(--line-2); border-radius: 10px; padding: 8px 36px 8px 10px; cursor: pointer; }
.shape-card[aria-pressed='true'] { border-color: var(--col); box-shadow: 0 0 0 1px var(--col) inset; }
.shape-card.playing { box-shadow: 0 0 16px -2px var(--col); }
.tag { font-family: var(--mono); font-weight: 600; color: var(--col); }
.notes { font-family: var(--mono); font-size: 12px; margin-top: 4px; word-spacing: 2px; }
.add { position: absolute; top: 6px; right: 6px; }
</style>
