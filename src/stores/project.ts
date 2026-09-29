import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { DEMOS } from '@/lib/demos'
import {
  SPLITS,
  isValidRef,
  layoutOf,
  layoutRefs,
  shapeKey,
  shuffle,
  type GroupMode,
  type ShapeRef,
  type SplitId,
} from '@/lib/music'
import { BPM_MAX, BPM_MIN, type Instrument, type ProjectData } from '@/lib/project'
import {
  applyOrderPreset,
  defaultShape,
  moveLane as moveLaneIn,
  presetRhythm,
  setShapeSteps,
  type Lane,
  type OrderPreset,
  type RhythmPreset,
  type ShapeState,
} from '@/lib/rhythm'
import { loadSavedProject, saveProject } from '@/lib/storage'

/** A bar of the arrangement. The id is a stable key for lists; it is not saved. */
export type Clip = ShapeRef & { id: number }

let nextClipId = 1
const withId = (r: ShapeRef): Clip => ({ ...r, id: nextClipId++ })
const stripId = (c: Clip): ShapeRef => {
  const { id: _id, ...ref } = c
  return ref as ShapeRef
}

export const useProjectStore = defineStore('project', () => {
  const initial = loadSavedProject() ?? DEMOS[0]!.create()

  const title = ref(initial.title ?? '')
  const credits = ref(initial.credits ?? '')
  const bpm = ref(initial.bpm)
  const instrument = ref<Instrument>(initial.instrument)
  const row = ref<number[]>(initial.row)
  const shapes = ref<Record<string, ShapeState>>(initial.shapes)
  const arrangement = ref<Clip[]>(initial.arrangement.map(withId))

  // --- layout and selection (view state, not saved)
  const mode = ref<GroupMode>('nth')
  const split = ref<SplitId>(3)
  const offset = ref(0)
  const group = ref(0)

  const layout = computed(() => layoutRefs(mode.value, split.value, offset.value))
  const selectedRef = computed<ShapeRef>(() => layout.value[group.value] ?? layout.value[0]!)

  function getShape(r: ShapeRef): ShapeState {
    return shapes.value[shapeKey(r)] ?? defaultShape(r)
  }
  const selectedShape = computed(() => getShape(selectedRef.value))

  function notesOf(r: ShapeRef): number[] {
    return getShape(r).order.map((p) => row.value[p]!)
  }

  /** Shows the layout a shape belongs to and selects it. */
  function select(r: ShapeRef) {
    if (!isValidRef(r)) return
    const l = layoutOf(r)
    mode.value = l.mode
    split.value = l.split
    offset.value = l.offset
    group.value = l.group
  }
  function setMode(m: GroupMode) {
    mode.value = m
    offset.value = 0
    group.value = 0
  }
  function setSplit(s: SplitId) {
    if (!SPLITS.includes(s)) return
    split.value = s
    offset.value = 0
    group.value = 0
  }
  /** Rotates the cut of the circle in "run" mode, one position at a time. */
  function rotate(delta: number) {
    const size = 12 / split.value
    offset.value = (((offset.value + delta) % size) + size) % size
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
    shapes.value[shapeKey(selectedRef.value)] = next
  }
  function setLane(i: number, lane: Lane) {
    const s = selectedShape.value
    const notes = [...s.notes]
    notes[i] = lane
    setSelectedShape({ ...s, order: [...s.order], notes })
  }
  function moveLane(i: number, dir: -1 | 1) {
    setSelectedShape(moveLaneIn(selectedShape.value, i, dir))
  }
  function applyOrder(kind: OrderPreset) {
    setSelectedShape(applyOrderPreset(selectedShape.value, selectedRef.value, kind))
  }
  function applyRhythm(kind: RhythmPreset) {
    const s = selectedShape.value
    setSelectedShape({ ...s, order: [...s.order], notes: presetRhythm(kind, s.order.length, s.steps) })
  }
  function setSteps(steps: number) {
    setSelectedShape(setShapeSteps(selectedShape.value, steps))
  }

  // --- arrangement
  function addClip(r: ShapeRef = selectedRef.value) {
    arrangement.value.push(withId(r))
  }
  function addAllShapes() {
    for (const r of layout.value) addClip(r)
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
    const p: ProjectData = {
      bpm: bpm.value,
      instrument: instrument.value,
      row: [...row.value],
      shapes: JSON.parse(JSON.stringify(shapes.value)) as Record<string, ShapeState>,
      arrangement: arrangement.value.map(stripId),
    }
    if (title.value.trim()) p.title = title.value.trim()
    if (credits.value.trim()) p.credits = credits.value.trim()
    return p
  }
  function load(p: ProjectData) {
    title.value = p.title ?? ''
    credits.value = p.credits ?? ''
    bpm.value = p.bpm
    instrument.value = p.instrument
    row.value = [...p.row]
    shapes.value = p.shapes
    arrangement.value = p.arrangement.map(withId)
    showFirstBar()
  }
  function showFirstBar() {
    const first = arrangement.value[0]
    if (first) select(stripId(first))
    else {
      setMode('nth')
      setSplit(3)
    }
  }
  showFirstBar()

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  watch([title, credits, bpm, instrument, row, shapes, arrangement], () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveProject(toData()), 300)
  }, { deep: true })

  return {
    title, credits, bpm, instrument, row, shapes, arrangement,
    mode, split, offset, group, layout, selectedRef, selectedShape,
    getShape, notesOf, select, setMode, setSplit, rotate,
    setRow, randomRow, swapPositions,
    setLane, moveLane, applyOrder, applyRhythm, setSteps,
    addClip, addAllShapes, removeClip, moveClip, clearArrangement,
    setBpm, toData, load,
  }
})
