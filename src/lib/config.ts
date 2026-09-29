import {
  groupPositions,
  isGroupSize,
  isSplitId,
  isValidRef,
  isValidRow,
  noteName,
  parseNote,
  parseShapeKey,
  shapeKey,
  shapeLabel,
  type GroupSize,
  type ShapeRef,
  type SplitId,
} from './music'
import { BPM_MAX, BPM_MIN, INSTRUMENTS, type Instrument, type ProjectData } from './project'
import { DEFAULT_STEPS, clampEvent, clampSteps, type Lane, type ShapeState } from './rhythm'

export const CONFIG_FORMAT = 'twelve-tone-shapes'
/** Version written by this app. Older versions are still read (see fromConfig). */
export const CONFIG_VERSION = 2
const READABLE_VERSIONS = [1, 2]

const TITLE_MAX = 200
const CREDITS_MAX = 2000

/** A shape reference as written in the file. */
export type RefJson = { split: SplitId; group: number } | { run: { start: number; size: GroupSize } }

/**
 * On-disk format, version 2. See README.md for a description aimed at users.
 * Version 1 had no `title`, `credits`, `steps` or `run` shapes.
 */
export interface ConfigV2 {
  format: typeof CONFIG_FORMAT
  version: 2
  title?: string
  credits?: string
  bpm: number
  instrument: Instrument
  row: string[]
  shapes: (RefJson & {
    steps: number
    order: number[]
    notes: ({ start: number; length: number; octave: number } | null)[]
  })[]
  arrangement: RefJson[]
}

export class ConfigError extends Error {
  override name = 'ConfigError'
}

export function refToJson(ref: ShapeRef): RefJson {
  return ref.kind === 'nth' ? { split: ref.split, group: ref.group } : { run: { start: ref.start, size: ref.size } }
}

export function toConfig(p: ProjectData): ConfigV2 {
  const cfg: ConfigV2 = {
    format: CONFIG_FORMAT,
    version: CONFIG_VERSION,
    bpm: p.bpm,
    instrument: p.instrument,
    row: p.row.map(noteName),
    shapes: Object.entries(p.shapes).flatMap(([key, s]) => {
      const ref = parseShapeKey(key)
      if (!ref) return []
      return [{ ...refToJson(ref), steps: s.steps, order: [...s.order], notes: s.notes.map((n) => (n ? { ...n } : null)) }]
    }),
    arrangement: p.arrangement.map(refToJson),
  }
  if (p.title) cfg.title = p.title
  if (p.credits) cfg.credits = p.credits
  return cfg
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Reads `{split, group}` or `{run: {start, size}}`. Returns null when invalid. */
export function refFromJson(v: unknown): ShapeRef | null {
  if (!isObject(v)) return null
  let ref: ShapeRef | null = null
  if (isObject(v.run)) {
    const { start, size } = v.run
    if (isGroupSize(size) && typeof start === 'number') ref = { kind: 'run', size, start }
  } else if (isSplitId(v.split) && typeof v.group === 'number') {
    ref = { kind: 'nth', split: v.split, group: v.group }
  }
  return ref && isValidRef(ref) ? ref : null
}

const describe = (v: unknown) => JSON.stringify(v)?.slice(0, 80) ?? String(v)

/**
 * Validates and converts a parsed config file. Throws ConfigError with a readable message.
 * Out-of-range note values are clamped rather than rejected.
 */
export function fromConfig(raw: unknown): ProjectData {
  if (!isObject(raw) || raw.format !== CONFIG_FORMAT) throw new ConfigError('This is not a Twelve Tone Shapes config file')
  if (!READABLE_VERSIONS.includes(raw.version as number)) throw new ConfigError(`Unsupported config version: ${String(raw.version)}`)

  const rowIn = Array.isArray(raw.row) ? raw.row : []
  const row = rowIn.map((n) => parseNote(String(n)))
  if (row.some((p) => p === undefined) || !isValidRow(row as number[])) {
    throw new ConfigError('"row" must contain 12 distinct notes (for example "C", "F#", "Bb")')
  }

  const shapes: Record<string, ShapeState> = {}
  for (const s of Array.isArray(raw.shapes) ? raw.shapes : []) {
    const ref = refFromJson(s)
    if (!ref || !isObject(s)) throw new ConfigError(`Invalid shape: ${describe(s)}`)
    const expected = groupPositions(ref)
    const order = s.order
    if (
      !Array.isArray(order) ||
      order.length !== expected.length ||
      [...order].sort((a, b) => a - b).join() !== [...expected].sort((a, b) => a - b).join()
    ) {
      throw new ConfigError(
        `Shape ${shapeLabel(ref)}: "order" must list the positions ${[...expected].sort((a, b) => a - b).join(', ')} in any order`,
      )
    }
    const steps = s.steps === undefined ? DEFAULT_STEPS : clampSteps(s.steps)
    const notesIn = Array.isArray(s.notes) ? s.notes : []
    const notes: Lane[] = order.map((_, i) => {
      const n = notesIn[i]
      return isObject(n) ? clampEvent(n, steps) : null
    })
    shapes[shapeKey(ref)] = { order: [...(order as number[])], notes, steps }
  }

  const arrangement = (Array.isArray(raw.arrangement) ? raw.arrangement : [])
    .map(refFromJson)
    .filter((r): r is ShapeRef => r !== null)

  const bpm = typeof raw.bpm === 'number' && Number.isFinite(raw.bpm) ? Math.round(raw.bpm) : 96
  const instrument = INSTRUMENTS.includes(raw.instrument as Instrument) ? (raw.instrument as Instrument) : 'synth'
  const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)

  const project: ProjectData = {
    bpm: Math.max(BPM_MIN, Math.min(BPM_MAX, bpm)),
    instrument,
    row: row as number[],
    shapes,
    arrangement,
  }
  const title = text(raw.title, TITLE_MAX)
  const credits = text(raw.credits, CREDITS_MAX)
  if (title) project.title = title
  if (credits) project.credits = credits
  return project
}

/** Parses the text of a config file. */
export function parseConfigText(text: string): ProjectData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ConfigError('The file is not valid JSON')
  }
  return fromConfig(raw)
}
