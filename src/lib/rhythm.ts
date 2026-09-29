import { BEAT, groupPositions, shuffle, type Position, type ShapeRef } from './music'

export const OCTAVE_MIN = 1
export const OCTAVE_MAX = 7
export const DEFAULT_OCTAVE = 4

/** Bar length in sixteenth notes */
export const DEFAULT_STEPS = 16
export const STEPS_MIN = 4
export const STEPS_MAX = 64

/** One note of a shape inside a bar: starts at `start` (0-based step) and lasts `length` steps. */
export interface NoteEvent {
  start: number
  length: number
  octave: number
}

/** null = the note is silent in this bar */
export type Lane = NoteEvent | null

/**
 * A shape with its play order, rhythm and bar length.
 * `notes[i]` belongs to the position `order[i]`; both arrays always move together.
 */
export interface ShapeState {
  order: Position[]
  notes: Lane[]
  /** bar length in sixteenth notes */
  steps: number
}

export type RhythmPreset = 'sequence' | 'chord' | 'staircase' | 'random'
export type OrderPreset = 'clockwise' | 'counterclockwise' | 'shuffle'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function clampSteps(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), STEPS_MIN, STEPS_MAX) : DEFAULT_STEPS
}

/** Forces an event inside the bar and the octave range. */
export function clampEvent(e: { start?: unknown; length?: unknown; octave?: unknown }, steps = DEFAULT_STEPS): NoteEvent {
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback)
  const start = clamp(num(e.start, 0), 0, steps - 1)
  const length = clamp(num(e.length, 1), 1, steps - start)
  const octave = clamp(num(e.octave, DEFAULT_OCTAVE), OCTAVE_MIN, OCTAVE_MAX)
  return { start, length, octave }
}

export function presetRhythm(kind: RhythmPreset, count: number, steps = DEFAULT_STEPS, rand: () => number = Math.random): Lane[] {
  const len = Math.max(1, Math.floor(steps / count))
  const make = (i: number): Lane => {
    switch (kind) {
      case 'chord':
        return { start: 0, length: steps, octave: DEFAULT_OCTAVE }
      case 'staircase': {
        const start = Math.min(steps - 1, i * len)
        return { start, length: steps - start, octave: DEFAULT_OCTAVE }
      }
      case 'random': {
        if (rand() < 0.15) return null
        const start = Math.floor(rand() * steps)
        return { start, length: 1 + Math.floor(rand() * Math.min(6, steps - start)), octave: 3 + Math.floor(rand() * 2) }
      }
      default: {
        const start = Math.min(steps - 1, i * len)
        return { start, length: Math.min(len, steps - start), octave: DEFAULT_OCTAVE }
      }
    }
  }
  return Array.from({ length: count }, (_, i) => make(i))
}

export function defaultShape(ref: ShapeRef): ShapeState {
  const order = groupPositions(ref)
  return { order, notes: presetRhythm('sequence', order.length), steps: DEFAULT_STEPS }
}

/** Swaps lane i with its neighbour (dir = -1 earlier, +1 later). Returns a new shape. */
export function moveLane(shape: ShapeState, i: number, dir: -1 | 1): ShapeState {
  const j = i + dir
  if (i < 0 || j < 0 || i >= shape.order.length || j >= shape.order.length) return shape
  const order = [...shape.order]
  const notes = [...shape.notes]
  ;[order[i], order[j]] = [order[j]!, order[i]!]
  ;[notes[i], notes[j]] = [notes[j] ?? null, notes[i] ?? null]
  return { ...shape, order, notes }
}

/** Reorders the notes of a shape; each note keeps its own rhythm. */
export function applyOrderPreset(shape: ShapeState, ref: ShapeRef, kind: OrderPreset, rand: () => number = Math.random): ShapeState {
  const base = groupPositions(ref)
  const byPos = new Map(shape.order.map((p, i) => [p, shape.notes[i] ?? null]))
  const order =
    kind === 'clockwise' ? base : kind === 'counterclockwise' ? [base[0]!, ...base.slice(1).reverse()] : shuffle(base, rand)
  return { ...shape, order, notes: order.map((p) => byPos.get(p) ?? null) }
}

/** Changes the bar length; notes that no longer fit are shortened or moved to the last step. */
export function setShapeSteps(shape: ShapeState, steps: number): ShapeState {
  const s = clampSteps(steps)
  return { ...shape, steps: s, notes: shape.notes.map((n) => (n ? clampEvent(n, s) : null)) }
}

/** Indices of the lanes sounding at a given step. */
export function soundingAt(shape: ShapeState, step: number): number[] {
  const out: number[] = []
  shape.notes.forEach((n, i) => {
    if (n && step >= n.start && step < n.start + n.length) out.push(i)
  })
  return out
}

/** Steps covered by at least one note (for thumbnails). */
export function filledSteps(shape: ShapeState): boolean[] {
  const filled = Array.from({ length: shape.steps }, () => false)
  for (const n of shape.notes) if (n) for (let s = n.start; s < n.start + n.length && s < shape.steps; s++) filled[s] = true
  return filled
}

/** Time signature of a bar of `steps` sixteenths, in the simplest form: 20 -> 5/4, 22 -> 11/8, 13 -> 13/16. */
export function meterOf(steps: number): { numerator: number; denominator: 4 | 8 | 16 } {
  if (steps % BEAT === 0) return { numerator: steps / BEAT, denominator: 4 }
  if (steps % 2 === 0) return { numerator: steps / 2, denominator: 8 }
  return { numerator: steps, denominator: 16 }
}

export function meterLabel(steps: number): string {
  const m = meterOf(steps)
  return `${m.numerator}/${m.denominator}`
}
