import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { audioEngine } from '@/audio/engine'
import { Transport, type PlayPosition } from '@/audio/transport'
import { midiOf, sameRef, shapeKey, type ShapeRef } from '@/lib/music'
import { soundingAt } from '@/lib/rhythm'
import { useProjectStore } from './project'

export const usePlaybackStore = defineStore('playback', () => {
  const project = useProjectStore()

  const playing = ref(false)
  const loop = ref(true)
  const metronome = ref(false)
  const follow = ref(true)
  const position = shallowRef<PlayPosition | null>(null)

  /** With an empty arrangement, the shape selected when Play was pressed loops. */
  let solo: ShapeRef | null = null
  const sequence = (): ShapeRef[] =>
    project.arrangement.length ? project.arrangement : [solo ?? project.selectedRef]

  const transport = new Transport(
    {
      now: () => audioEngine.now(),
      sequence,
      shape: (r) => project.getShape(r),
      row: () => project.row,
      bpm: () => project.bpm,
      loop: () => loop.value,
      metronome: () => metronome.value,
      playNote: (midi, time, duration) => audioEngine.playNote(project.instrument, midi, time, duration),
      click: (time, accent) => audioEngine.click(time, accent),
    },
    (p) => (position.value = p),
    () => (playing.value = false),
  )

  async function play() {
    await audioEngine.resume()
    solo = { ...project.selectedRef }
    transport.start()
    playing.value = true
  }
  function stop() {
    transport.stop()
    playing.value = false
  }
  function toggle() {
    if (playing.value) stop()
    else void play()
  }

  const playingRef = computed<ShapeRef | null>(() => position.value?.ref ?? null)
  const playingKey = computed(() => (playingRef.value ? shapeKey(playingRef.value) : ''))

  /** Lane indices of the playing shape that sound right now. */
  const soundingLanes = computed<number[]>(() => {
    const p = position.value
    return p ? soundingAt(project.getShape(p.ref), p.step) : []
  })
  /** Circle positions sounding right now. */
  const soundingPositions = computed<number[]>(() => {
    const r = playingRef.value
    if (!r) return []
    const order = project.getShape(r).order
    return soundingLanes.value.map((i) => order[i]!)
  })

  function isPlayingShape(r: ShapeRef): boolean {
    return sameRef(playingRef.value, r)
  }

  // "Follow playback": show the shape being played
  watch(playingKey, () => {
    const r = playingRef.value
    if (follow.value && r) project.select(r)
  })

  function preview(pc: number, octave: number) {
    audioEngine.preview(project.instrument, midiOf(pc, octave))
  }

  return {
    playing, loop, metronome, follow, position,
    play, stop, toggle, preview,
    playingRef, soundingLanes, soundingPositions, isPlayingShape,
    sequence,
  }
})
