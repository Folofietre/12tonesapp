<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { STEPS, noteName, shapeColor, shapeLabel } from '@/lib/music'
import { ConfigError, parseConfigText, toConfig } from '@/lib/config'
import { GM_PROGRAM, buildMidi, sequenceToNotes } from '@/lib/midi'
import { filledSteps } from '@/lib/rhythm'
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
  return p ? ((p.step + p.frac) / STEPS) * 100 : 0
})

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

// --- files
const fileInput = ref<HTMLInputElement | null>(null)
const stamp = () => new Date().toISOString().slice(0, 10)

function exportConfig() {
  downloadFile(JSON.stringify(toConfig(project.toData()), null, 2), 'application/json', `twelve-tone-shapes-${stamp()}.json`)
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
  const notes = sequenceToNotes(project, seq, (r) => project.getShape(r.split, r.group))
  const bytes = buildMidi(notes, project.bpm, GM_PROGRAM[project.instrument], 'Twelve Tone Shapes')
  downloadFile(bytes as Uint8Array<ArrayBuffer>, 'audio/midi', `twelve-tone-shapes-${stamp()}.mid`)
  toast.show(`MIDI exported: ${seq.length} bar(s), ${notes.length} notes`)
}
function resetDemo() {
  if (!window.confirm('Replace the current project with the demo? Export it first if you want to keep it.')) return
  playback.stop()
  project.reset()
}
</script>

<template>
  <section class="panel span-2" aria-labelledby="h-arr">
    <h2 id="h-arr">
      <span class="grow">Arrangement</span>
      <button class="btn small" @click="project.addAllShapes()">Add all shapes</button>
      <button class="btn small" :disabled="!project.arrangement.length" @click="project.clearArrangement()">Clear</button>
    </h2>

    <ol ref="listEl" class="timeline" aria-label="Bars, played one after the other">
      <li
        v-for="(c, i) in project.arrangement"
        :key="c.id"
        class="clip"
        :class="{ now: i === currentBar, dragging: dragFrom === i }"
        :style="{ '--col': shapeColor(c.split, c.group) }"
        :data-index="i"
        tabindex="0"
        draggable="true"
        :aria-label="`Bar ${i + 1}: shape ${shapeLabel(c.split, c.group)}. Enter to edit, Alt+Left/Right to move, Delete to remove.`"
        @click="project.select(c.split, c.group)"
        @keydown.enter.prevent="project.select(c.split, c.group)"
        @keydown="onClipKey($event, i)"
        @dragstart="dragFrom = i"
        @dragend="dragFrom = null"
        @dragover.prevent
        @drop.prevent="onDrop(i)"
      >
        <div class="tag">{{ i + 1 }}. {{ shapeLabel(c.split, c.group) }}</div>
        <div class="cn">{{ project.notesOf(c.split, c.group).map(noteName).join(' ') }}</div>
        <div class="mini" aria-hidden="true">
          <i v-for="(f, s) in filledSteps(project.getShape(c.split, c.group))" :key="s" :class="{ f }" />
        </div>
        <button class="x" :aria-label="`Remove bar ${i + 1}`" tabindex="-1" @click.stop="project.removeClip(i)">x</button>
        <div class="prog" :style="{ width: i === currentBar ? progress + '%' : '0' }" />
      </li>
      <li v-if="!project.arrangement.length" class="empty">
        Empty: Play loops the selected shape. Use "+" on a shape or "Add to arrangement" to build a sequence.
      </li>
    </ol>
    <p v-if="project.arrangement.length" class="hint">
      {{ project.arrangement.length }} bar(s) played one after the other. Drag a bar to move it. Click a bar to edit
      its shape; bars using the same shape share its rhythm.
    </p>

    <div class="toolbar files">
      <button class="btn small" @click="fileInput?.click()">Import config</button>
      <button class="btn small" @click="exportConfig">Export config</button>
      <button class="btn small" @click="exportMidi">Export MIDI</button>
      <span class="spacer" />
      <button class="btn small" @click="resetDemo">Load demo</button>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importConfig" />
    </div>
    <p class="hint">
      Everything stays on this computer: the project is saved in this browser, and config files are plain JSON you
      can keep, edit and share.
    </p>
  </section>
</template>

<style scoped>
.timeline { display: flex; gap: 6px; overflow-x: auto; padding: 4px 2px 8px; margin: 0; min-height: 80px; list-style: none; align-items: stretch; }
.clip { position: relative; flex: 0 0 120px; background: var(--panel-2); border: 1px solid var(--col); border-radius: 8px; padding: 6px 8px 8px; overflow: hidden; cursor: grab; }
.clip.now { box-shadow: 0 0 16px -2px var(--col); }
.clip.dragging { opacity: .4; }
.tag { font-family: var(--mono); font-weight: 600; color: var(--col); font-size: 12px; padding-right: 14px; }
.cn { font-family: var(--mono); font-size: 11px; color: var(--muted); }
.mini { display: grid; grid-template-columns: repeat(16, 1fr); gap: 1px; margin-top: 6px; }
.mini i { height: 4px; background: var(--line-2); border-radius: 1px; }
.mini i.f { background: var(--col); }
.x { position: absolute; top: 3px; right: 3px; background: none; border: 0; color: var(--muted); cursor: pointer; font-size: 13px; }
.prog { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--col); }
.empty { color: var(--muted); font-size: 12px; align-self: center; }
.files { margin-top: 10px; }
</style>
