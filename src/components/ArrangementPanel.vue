<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { noteName, shapeColor, shapeLabel, type ShapeRef } from '@/lib/music'
import { ConfigError, parseConfigText, toConfig } from '@/lib/config'
import { DEMOS } from '@/lib/demos'
import { GM_PROGRAM, buildMidi, sequenceToMidi } from '@/lib/midi'
import { filledSteps, meterLabel } from '@/lib/rhythm'
import { downloadFile } from '@/lib/storage'
import { useProjectStore } from '@/stores/project'
import { usePlaybackStore } from '@/stores/playback'
import { useToast } from '@/composables/useToast'

const project = useProjectStore()
const playback = usePlaybackStore()
const toast = useToast()

const currentBar = computed(() => (project.arrangement.length && playback.position ? playback.position.bar : -1))
const progress = computed(() => {
  const p = playback.position
  return p ? ((p.step + p.frac) / p.steps) * 100 : 0
})
const totalSteps = computed(() => project.arrangement.reduce((sum, c) => sum + project.getShape(c).steps, 0))
const totalSeconds = computed(() => Math.round((totalSteps.value * 15) / project.bpm))

/** Credits text split into plain text and links. */
const creditParts = computed(() =>
  project.credits.split(/(https?:\/\/\S+)/).filter(Boolean).map((t) => ({ text: t, url: /^https?:\/\//.test(t) })),
)

// --- reordering: drag and drop, or Alt+Left/Right on a focused bar
const dragFrom = ref<number | null>(null)
const listEl = ref<HTMLElement | null>(null)
function onDrop(to: number) {
  if (dragFrom.value !== null) project.moveClip(dragFrom.value, to)
  dragFrom.value = null
}
async function onClipKey(e: KeyboardEvent, i: number) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    project.removeClip(i)
  } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const to = i + (e.key === 'ArrowLeft' ? -1 : 1)
    if (to < 0 || to >= project.arrangement.length) return
    project.moveClip(i, to)
    await nextTick()
    listEl.value?.querySelector<HTMLElement>(`[data-index="${to}"]`)?.focus()
  } else {
    return
  }
  e.preventDefault()
}

const clipWidth = (r: ShapeRef) => `${Math.max(110, project.getShape(r).steps * 7)}px`

// --- files
const fileInput = ref<HTMLInputElement | null>(null)
const stamp = () => new Date().toISOString().slice(0, 10)
const fileBase = () =>
  (project.title || 'twelve-tone-shapes').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'twelve-tone-shapes'

function exportConfig() {
  downloadFile(JSON.stringify(toConfig(project.toData()), null, 2), 'application/json', `${fileBase()}-${stamp()}.json`)
  toast.show('Config file exported')
}
async function importConfig(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const data = parseConfigText(await file.text())
    playback.stop()
    project.load(data)
    toast.show(`Imported ${file.name}`)
  } catch (err) {
    toast.show(`Import failed: ${err instanceof ConfigError ? err.message : 'the file could not be read'}`, true)
  }
}
function exportMidi() {
  const seq = playback.sequence()
  const { notes, meters } = sequenceToMidi(project, seq, (r) => project.getShape(r))
  const bytes = buildMidi(notes, project.bpm, GM_PROGRAM[project.instrument], project.title || 'Twelve Tone Shapes', meters)
  downloadFile(bytes as Uint8Array<ArrayBuffer>, 'audio/midi', `${fileBase()}-${stamp()}.mid`)
  toast.show(`MIDI exported: ${seq.length} bar(s), ${notes.length} notes`)
}
function loadDemo(e: Event) {
  const select = e.target as HTMLSelectElement
  const demo = DEMOS.find((d) => d.id === select.value)
  select.value = ''
  if (!demo) return
  if (!window.confirm(`Replace the current project with the demo "${demo.name}"? Export it first if you want to keep it.`)) return
  playback.stop()
  project.load(demo.create())
  toast.show(`Loaded demo: ${demo.name}`)
}
</script>

<template>
  <section class="panel span-2" aria-labelledby="h-arr">
    <h2 id="h-arr">
      <span class="grow">Arrangement<template v-if="project.title">: <span class="title">{{ project.title }}</span></template></span>
      <button class="btn small" @click="project.addAllShapes()">Add all shapes</button>
      <button class="btn small" :disabled="!project.arrangement.length" @click="project.clearArrangement()">Clear</button>
    </h2>

    <ol ref="listEl" class="timeline" aria-label="Bars, played one after the other">
      <li
        v-for="(c, i) in project.arrangement"
        :key="c.id"
        class="clip"
        :class="{ now: i === currentBar, dragging: dragFrom === i }"
        :style="{ '--col': shapeColor(c), flexBasis: clipWidth(c) }"
        :data-index="i"
        tabindex="0"
        draggable="true"
        :aria-label="`Bar ${i + 1}: shape ${shapeLabel(c)}, ${meterLabel(project.getShape(c).steps)}. Enter to edit, Alt+Left/Right to move, Delete to remove.`"
        @click="project.select(c)"
        @keydown.enter.prevent="project.select(c)"
        @keydown="onClipKey($event, i)"
        @dragstart="dragFrom = i"
        @dragend="dragFrom = null"
        @dragover.prevent
        @drop.prevent="onDrop(i)"
      >
        <div class="tag">
          {{ i + 1 }}. {{ shapeLabel(c) }} <span class="meter">{{ meterLabel(project.getShape(c).steps) }}</span>
        </div>
        <div class="cn">{{ project.notesOf(c).map(noteName).join(' ') }}</div>
        <div class="mini" aria-hidden="true" :style="{ gridTemplateColumns: `repeat(${project.getShape(c).steps}, 1fr)` }">
          <i v-for="(f, s) in filledSteps(project.getShape(c))" :key="s" :class="{ f }" />
        </div>
        <button class="x" :aria-label="`Remove bar ${i + 1}`" tabindex="-1" @click.stop="project.removeClip(i)">x</button>
        <div class="prog" :style="{ width: i === currentBar ? progress + '%' : '0' }" />
      </li>
      <li v-if="!project.arrangement.length" class="empty">
        Empty: Play loops the selected shape. Use "+" on a shape or "Add to arrangement" to build a sequence.
      </li>
    </ol>
    <p v-if="project.arrangement.length" class="hint">
      {{ project.arrangement.length }} bar(s), about {{ totalSeconds }} s at {{ project.bpm }} BPM, played one after the
      other. Drag a bar to move it. Click a bar to edit its shape; bars using the same shape share its rhythm.
    </p>

    <div class="toolbar files">
      <button class="btn small" @click="fileInput?.click()">Import config</button>
      <button class="btn small" @click="exportConfig">Export config</button>
      <button class="btn small" @click="exportMidi">Export MIDI</button>
      <span class="spacer" />
      <label class="sr-only" for="demo-select">Load a demo</label>
      <select id="demo-select" class="demo" value="" @change="loadDemo">
        <option value="" disabled>Load demo...</option>
        <option v-for="d in DEMOS" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importConfig" />
    </div>

    <p v-if="project.credits" class="credits" aria-label="Credits">
      <template v-for="(part, k) in creditParts" :key="k">
        <a v-if="part.url" :href="part.text" target="_blank" rel="noopener">{{ part.text }}</a>
        <template v-else>{{ part.text }}</template>
      </template>
    </p>
    <p class="hint">
      Everything stays on this computer: the project is saved in this browser, and config files are plain JSON you
      can keep, edit and share.
    </p>
  </section>
</template>

<style scoped>
.title { color: var(--text); text-transform: none; letter-spacing: 0; }
.timeline { display: flex; gap: 6px; overflow-x: auto; padding: 4px 2px 8px; margin: 0; min-height: 80px; list-style: none; align-items: stretch; }
.clip { position: relative; flex: 0 0 auto; background: var(--panel-2); border: 1px solid var(--col); border-radius: 8px; padding: 6px 8px 8px; overflow: hidden; cursor: grab; }
.clip.now { box-shadow: 0 0 16px -2px var(--col); }
.clip.dragging { opacity: .4; }
.tag { font-family: var(--mono); font-weight: 600; color: var(--col); font-size: 12px; padding-right: 14px; white-space: nowrap; }
.tag .meter { color: var(--muted); font-weight: 400; }
.cn { font-family: var(--mono); font-size: 11px; color: var(--muted); white-space: nowrap; }
.mini { display: grid; gap: 1px; margin-top: 6px; }
.mini i { height: 4px; background: var(--line-2); border-radius: 1px; }
.mini i.f { background: var(--col); }
.x { position: absolute; top: 3px; right: 3px; background: none; border: 0; color: var(--muted); cursor: pointer; font-size: 13px; }
.prog { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--col); }
.empty { color: var(--muted); font-size: 12px; align-self: center; }
.files { margin-top: 10px; }
.demo { background: var(--panel-2); border: 1px solid var(--line-2); border-radius: 8px; padding: 3px 8px; font-size: 12px; }
.credits {
  white-space: pre-line; font-size: 12px; line-height: 1.55; color: var(--text); margin: 12px 0 0;
  padding: 8px 10px; border-left: 2px solid var(--accent); background: rgba(255, 255, 255, .02); border-radius: 0 6px 6px 0;
}
.credits a { color: var(--focus); word-break: break-all; }
</style>
