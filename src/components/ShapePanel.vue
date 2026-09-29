<script setup lang="ts">
import { SPLITS, groupPositions, noteName, shapeColor, shapeLabel, type SplitId } from '@/lib/music'
import { useProjectStore } from '@/stores/project'
import { usePlaybackStore } from '@/stores/playback'

const project = useProjectStore()
const playback = usePlaybackStore()

const thumbPoints = (split: SplitId, g: number) =>
  groupPositions(split, g)
    .map((p) => {
      const a = (p / 12) * Math.PI * 2 - Math.PI / 2
      return `${Math.cos(a) * 50},${Math.sin(a) * 50}`
    })
    .join(' ')

const splitLabel = (n: SplitId) => (n === 1 ? 'Full circle, 12 notes' : `${n} groups of ${12 / n} notes`)
</script>

<template>
  <section class="panel" aria-labelledby="h-split">
    <h2 id="h-split">Split</h2>
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
            :is="12 / n === 2 ? 'polyline' : 'polygon'"
            v-for="g in n"
            :key="g"
            :points="thumbPoints(n, g - 1)"
            fill="none"
            :stroke="shapeColor(n, g - 1)"
            stroke-width="3"
          />
        </svg>
        <small>{{ n }} x {{ 12 / n }}</small>
      </button>
    </div>

    <div class="shapes">
      <div
        v-for="g in project.groups"
        :key="g"
        class="shape-card"
        :class="{ playing: playback.isPlayingShape({ split: project.split, group: g }) }"
        :style="{ '--col': shapeColor(project.split, g) }"
        role="button"
        tabindex="0"
        :aria-pressed="g === project.group"
        :aria-label="`Shape ${shapeLabel(project.split, g)}: ${project.notesOf(project.split, g).map(noteName).join(' ')}`"
        @click="project.select(project.split, g)"
        @keydown.enter.prevent="project.select(project.split, g)"
        @keydown.space.prevent="project.select(project.split, g)"
      >
        <div class="tag">{{ shapeLabel(project.split, g) }}</div>
        <div class="notes">{{ project.notesOf(project.split, g).map(noteName).join(' ') }}</div>
        <button
          class="btn small add"
          title="Add to arrangement"
          :aria-label="`Add ${shapeLabel(project.split, g)} to arrangement`"
          @click.stop="project.addClip({ split: project.split, group: g })"
          @keydown.enter.stop
          @keydown.space.stop
        >
          +
        </button>
      </div>
    </div>
    <p class="hint">
      Each group takes every Nth note of the circle (Jarzombek: two 6-note, three 4-note, four 3-note groups).
      Notes are listed in the shape's play order.
    </p>
  </section>
</template>

<style scoped>
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
