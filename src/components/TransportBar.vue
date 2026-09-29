<script setup lang="ts">
import { computed } from 'vue'
import { BEAT } from '@/lib/music'
import { BPM_MAX, BPM_MIN, INSTRUMENTS, INSTRUMENT_LABELS, type Instrument } from '@/lib/project'
import { useProjectStore } from '@/stores/project'
import { usePlaybackStore } from '@/stores/playback'

const project = useProjectStore()
const playback = usePlaybackStore()

const beat = computed(() => {
  const p = playback.position
  return p && p.frac < 0.6 ? Math.floor(p.step / BEAT) : -1
})
const positionText = computed(() => {
  const p = playback.position
  return p ? `bar ${p.bar + 1} . step ${p.step + 1}` : 'stopped'
})

function onBpm(e: Event) {
  project.setBpm(Number((e.target as HTMLInputElement).value))
  ;(e.target as HTMLInputElement).value = String(project.bpm)
}
function onInstrument(e: Event) {
  project.instrument = (e.target as HTMLSelectElement).value as Instrument
  const first = project.selectedShape.order[0]
  if (first !== undefined) playback.preview(project.row[first]!, 4)
}
</script>

<template>
  <header class="transport-bar">
    <div class="brand">Twelve <span>Tone</span> Shapes</div>
    <div class="controls">
      <button
        class="btn primary"
        :aria-pressed="playback.playing"
        title="Play / Stop (Space)"
        @click="playback.toggle()"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path :d="playback.playing ? 'M2 2h8v8H2z' : 'M2 1l9 5-9 5z'" fill="currentColor" />
        </svg>
        {{ playback.playing ? 'Stop' : 'Play' }}
      </button>
      <label class="field">
        BPM
        <input type="number" :min="BPM_MIN" :max="BPM_MAX" :value="project.bpm" @change="onBpm" />
      </label>
      <label class="field">
        Sound
        <select :value="project.instrument" @change="onInstrument">
          <option v-for="i in INSTRUMENTS" :key="i" :value="i">{{ INSTRUMENT_LABELS[i] }}</option>
        </select>
      </label>
      <button class="btn small" :aria-pressed="playback.loop" @click="playback.loop = !playback.loop">Loop</button>
      <button class="btn small" :aria-pressed="playback.metronome" @click="playback.metronome = !playback.metronome">
        Click
      </button>
      <div class="beats" aria-hidden="true">
        <i v-for="k in 4" :key="k" :class="{ on: beat === k - 1, down: k === 1 }" />
      </div>
      <div class="pos">{{ positionText }}</div>
    </div>
  </header>
</template>

<style scoped>
.transport-bar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 12px 20px; background: rgba(5, 7, 13, .92); backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line-2);
}
.brand { font-family: var(--mono); font-weight: 600; letter-spacing: .08em; text-transform: uppercase; font-size: 13px; }
.brand span { color: var(--accent); }
.controls { display: flex; align-items: center; gap: 10px; margin-left: auto; flex-wrap: wrap; }
.beats { display: flex; gap: 6px; }
.beats i { width: 10px; height: 10px; border-radius: 50%; background: var(--line-2); }
.beats i.on { background: var(--accent); box-shadow: 0 0 10px var(--accent); transform: scale(1.3); }
.beats i.on.down { background: #ffd25c; box-shadow: 0 0 10px #ffd25c; }
.pos { font-family: var(--mono); font-size: 12px; color: var(--muted); min-width: 110px; }
@media (prefers-reduced-motion: reduce) { .beats i.on { transform: none; box-shadow: none; } }
</style>
