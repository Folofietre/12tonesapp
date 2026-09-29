import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { CIRCLE_OF_FIFTHS, SPLITS, shapeKey, shuffle, type SplitId } from '@/lib/music'
import { BPM_MAX, BPM_MIN, emptyProject, type Instrument, type ProjectData, type ShapeRef } from '@/lib/project'
import {
  applyOrderPreset,
  defaultShape,
  moveLane as moveLaneIn,
  presetRhythm,
  type Lane,
  type OrderPreset,
  type RhythmPreset,
  type ShapeState,
} from '@/lib/rhythm'
import { loadSavedProject, saveProject } from '@/lib/storage'

export interface Clip extends ShapeRef {
  /** stable key for lists; not saved */
  id: number
}

/** First visit: the three squares of the circle of fifths, then a triangle. */
export function demoProject(): ProjectData {
  const p = emptyProject()
  p.row = [...CIRCLE_OF_FIFTHS]
  p.shapes[shapeKey(3, 1)] = { order: [10, 7, 4, 1], notes: presetRhythm('sequence', 4) }
  p.shapes[shapeKey(3, 2)] = { order: [2, 8, 5, 11], notes: presetRhythm('staircase', 4) }
  p.arrangement = [
    { split: 3, group: 0 },
    { split: 3, group: 1 },
    { split: 3, group: 2 },
    { split: 4, group: 0 },
  ]
  return p
}

let nextClipId = 1
const withId = (r: ShapeRef): Clip => ({ id: nextClipId++, split: r.split, group: r.group })

export const useProjectStore = defineStore('project', () => {
  const initial = loadSavedProject() ?? demoProject()

  const bpm = ref(initial.bpm)
  const instrument = ref<Instrument>(initial.instrument)
  const row = ref<number[]>(initial.row)
  const shapes = ref<Record<string, ShapeState>>(initial.shapes)
  const arrangement = ref<Clip[]>(initial.arrangement.map(withId))

  // selection (view state, not saved)
  const split = ref<SplitId>(initial.arrangement[0]?.split ?? 3)
  const group = ref(0)

  function getShape(s: SplitId, g: number): ShapeState {
    return shapes.value[shapeKey(s, g)] ?? defaultShape(s, g)
  }
  const selectedRef = computed<ShapeRef>(() => ({ split: split.value, group: group.value }))
  const selectedShape = computed(() => getShape(split.value, group.value))
  const groups = computed(() => Array.from({ length: split.value }, (_, g) => g))

  function notesOf(s: SplitId, g: number): number[] {
    return getShape(s, g).order.map((p) => row.value[p]!)
  }

  function select(s: SplitId, g: number) {
    if (!SPLITS.includes(s) || g < 0 || g >= s) return
    split.value = s
    group.value = g
  }
  function setSplit(s: SplitId) {
    select(s, 0)
  }

  // --- row
  function setRow(r: number[]) {
    row.value = [...r]
  }
  function randomRow() {
    setRow(shuffle(row.value))
  }
  function swapPositions(a: number, b: number) {
    const r = [...row.value]
    ;[r[a], r[b]] = [r[b]!, r[a]!]
    row.value = r
  }

  // --- selected shape edits
  function setSelectedShape(next: ShapeState) {
    shapes.value[shapeKey(split.value, group.value)] = next
  }
  function setLane(i: number, lane: Lane) {
    const s = selectedShape.value
    const notes = [...s.notes]
    notes[i] = lane
    setSelectedShape({ order: [...s.order], notes })
  }
  function moveLane(i: number, dir: -1 | 1) {
    setSelectedShape(moveLaneIn(selectedShape.value, i, dir))
  }
  function applyOrder(kind: OrderPreset) {
    setSelectedShape(applyOrderPreset(selectedShape.value, split.value, group.value, kind))
  }
  function applyRhythm(kind: RhythmPreset) {
    const s = selectedShape.value
    setSelectedShape({ order: [...s.order], notes: presetRhythm(kind, s.order.length) })
  }

  // --- arrangement
  function addClip(r: ShapeRef = selectedRef.value) {
    arrangement.value.push(withId(r))
  }
  function addAllShapes() {
    for (let g = 0; g < split.value; g++) addClip({ split: split.value, group: g })
  }
  function removeClip(index: number) {
    arrangement.value.splice(index, 1)
  }
  function moveClip(from: number, to: number) {
    const list = arrangement.value
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return
    const [c] = list.splice(from, 1)
    list.splice(to, 0, c!)
  }
  function clearArrangement() {
    arrangement.value = []
  }

  function setBpm(v: number) {
    if (Number.isFinite(v)) bpm.value = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(v)))
  }

  // --- whole project
  function toData(): ProjectData {
    return {
      bpm: bpm.value,
      instrument: instrument.value,
      row: [...row.value],
      shapes: JSON.parse(JSON.stringify(shapes.value)) as Record<string, ShapeState>,
      arrangement: arrangement.value.map(({ split: s, group: g }) => ({ split: s, group: g })),
    }
  }
  function load(p: ProjectData) {
    bpm.value = p.bpm
    instrument.value = p.instrument
    row.value = [...p.row]
    shapes.value = p.shapes
    arrangement.value = p.arrangement.map(withId)
    select(p.arrangement[0]?.split ?? 3, 0)
  }
  function reset() {
    load(demoProject())
  }

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  watch([bpm, instrument, row, shapes, arrangement], () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveProject(toData()), 300)
  }, { deep: true })

  return {
    bpm, instrument, row, shapes, arrangement, split, group,
    selectedRef, selectedShape, groups,
    getShape, notesOf, select, setSplit,
    setRow, randomRow, swapPositions,
    setLane, moveLane, applyOrder, applyRhythm,
    addClip, addAllShapes, removeClip, moveClip, clearArrangement,
    setBpm, toData, load, reset,
  }
})
