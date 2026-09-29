<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import TransportBar from '@/components/TransportBar.vue'
import ToneCircle from '@/components/ToneCircle.vue'
import ShapePanel from '@/components/ShapePanel.vue'
import RhythmEditor from '@/components/RhythmEditor.vue'
import ArrangementPanel from '@/components/ArrangementPanel.vue'
import { useToast } from '@/composables/useToast'
import { usePlaybackStore } from '@/stores/playback'

const playback = usePlaybackStore()
const toast = useToast()
const version = `${__APP_VERSION__}${__APP_COMMIT__ ? ` (${__APP_COMMIT__})` : ''}`

/** Space toggles playback, unless the focus is on something Space already activates. */
function onKey(e: KeyboardEvent) {
  if (e.code !== 'Space') return
  const t = e.target as HTMLElement | null
  if (t?.closest('input, textarea, select, button, [role="button"], [tabindex]')) return
  e.preventDefault()
  playback.toggle()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <TransportBar />
  <main class="layout">
    <ArrangementPanel />
    <ToneCircle />
    <ShapePanel />
    <RhythmEditor />
  </main>
  <footer class="app-footer">
    Twelve Tone Shapes {{ version }}. Based on Ron Jarzombek's 12-tone circle.
    <a href="https://github.com/Folofietre/12tonesapp" rel="noopener">Source and feedback</a>
  </footer>
  <div class="toast" :class="{ show: toast.state.visible, err: toast.state.error }" role="status" aria-live="polite">
    {{ toast.state.message }}
  </div>
</template>
