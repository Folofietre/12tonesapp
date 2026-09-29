import { BEAT, STEPS, midiOf } from '@/lib/music'
import type { ShapeRef } from '@/lib/project'
import type { ShapeState } from '@/lib/rhythm'

/** What the transport needs from the app. Read on every step, so edits apply while playing. */
export interface TransportHost {
  now(): number
  sequence(): ShapeRef[]
  shape(ref: ShapeRef): ShapeState
  row(): number[]
  bpm(): number
  loop(): boolean
  metronome(): boolean
  playNote(midi: number, time: number, duration: number): void
  click(time: number, accent: boolean): void
}

export interface PlayPosition {
  bar: number
  step: number
  /** progress inside the current step, 0..1 */
  frac: number
  ref: ShapeRef
}

interface ScheduledStep {
  time: number
  bar: number
  step: number
  ref: ShapeRef
}

export interface TransportOptions {
  /** how far ahead notes are scheduled, in seconds */
  lookahead?: number
  /** scheduler period, in ms */
  interval?: number
  setInterval?: (fn: () => void, ms: number) => unknown
  clearInterval?: (id: unknown) => void
  requestFrame?: (fn: () => void) => unknown
  cancelFrame?: (id: unknown) => void
}

/**
 * Lookahead scheduler: a timer regularly schedules the notes of the next ~120 ms on the
 * audio clock, which is sample-accurate. The display follows the audio clock on each
 * animation frame, so sound and visuals cannot drift apart.
 */
export class Transport {
  private timer: unknown = null
  private frameId: unknown = null
  private nextTime = 0
  private stepIndex = 0
  private queue: ScheduledStep[] = []
  private current: ScheduledStep | null = null
  private endTime: number | null = null
  private readonly opts: Required<TransportOptions>

  constructor(
    private host: TransportHost,
    private onPosition: (p: PlayPosition | null) => void,
    private onEnd: () => void = () => {},
    options: TransportOptions = {},
  ) {
    this.opts = {
      lookahead: 0.12,
      interval: 25,
      setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
      clearInterval: (id) => globalThis.clearInterval(id as ReturnType<typeof setInterval>),
      requestFrame: (fn) => globalThis.requestAnimationFrame(fn),
      cancelFrame: (id) => globalThis.cancelAnimationFrame(id as number),
      ...options,
    }
  }

  get playing(): boolean {
    return this.timer !== null || this.endTime !== null
  }

  stepDuration(): number {
    return 60 / this.host.bpm() / BEAT
  }

  start(): void {
    this.stop()
    this.stepIndex = 0
    this.queue = []
    this.current = null
    this.endTime = null
    this.nextTime = this.host.now() + 0.06
    this.timer = this.opts.setInterval(() => this.schedule(), this.opts.interval)
    this.schedule()
    this.frameId = this.opts.requestFrame(() => this.frame())
  }

  stop(): void {
    if (this.timer !== null) this.opts.clearInterval(this.timer)
    if (this.frameId !== null) this.opts.cancelFrame(this.frameId)
    this.timer = null
    this.frameId = null
    this.endTime = null
    this.current = null
    this.onPosition(null)
  }

  /** Schedules every step that starts before now + lookahead. Public for tests. */
  schedule(): void {
    const horizon = this.host.now() + this.opts.lookahead
    while (this.timer !== null && this.nextTime < horizon) {
      const sequence = this.host.sequence()
      const total = sequence.length * STEPS
      if (total === 0 || (!this.host.loop() && this.stepIndex >= total)) {
        this.opts.clearInterval(this.timer)
        this.timer = null
        this.endTime = this.nextTime
        return
      }
      const g = this.stepIndex % total
      const bar = Math.floor(g / STEPS)
      const step = g % STEPS
      const ref = sequence[bar]!
      const shape = this.host.shape(ref)
      const row = this.host.row()
      const dur = this.stepDuration()
      shape.notes.forEach((n, i) => {
        const pos = shape.order[i]
        if (n && n.start === step && pos !== undefined) this.host.playNote(midiOf(row[pos]!, n.octave), this.nextTime, n.length * dur)
      })
      if (this.host.metronome() && step % BEAT === 0) this.host.click(this.nextTime, step === 0)
      this.queue.push({ time: this.nextTime, bar, step, ref })
      this.nextTime += dur
      this.stepIndex++
    }
  }

  /** Publishes the step currently heard. Public for tests. */
  frame(): void {
    const now = this.host.now()
    while (this.queue.length && this.queue[0]!.time <= now) this.current = this.queue.shift()!
    if (this.endTime !== null && now >= this.endTime) {
      this.stop()
      this.onEnd()
      return
    }
    if (this.current) {
      const frac = Math.min(1, Math.max(0, (now - this.current.time) / this.stepDuration()))
      this.onPosition({ bar: this.current.bar, step: this.current.step, frac, ref: this.current.ref })
    }
    this.frameId = this.opts.requestFrame(() => this.frame())
  }
}
