import { midiToHz } from '@/lib/music'
import type { Instrument } from '@/lib/project'
import { renderPluck } from './pluck'

/**
 * Web Audio output. The context is created lazily, on the first user gesture,
 * because browsers refuse to start audio before one.
 * All instruments are synthesized: nothing is downloaded.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private distCurve: Float32Array<ArrayBuffer> | null = null
  private pluckCache = new Map<string, AudioBuffer>()

  private ensure(): { ctx: AudioContext; master: GainNode } {
    if (!this.ctx || !this.master) {
      const ctx = new AudioContext()
      const comp = ctx.createDynamicsCompressor()
      const master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(comp).connect(ctx.destination)
      const curve = new Float32Array(2048)
      for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / 1024 - 1) * 6)
      this.ctx = ctx
      this.master = master
      this.distCurve = curve
    }
    return { ctx: this.ctx, master: this.master }
  }

  /** Must be called from a user gesture before playback. */
  async resume(): Promise<void> {
    const { ctx } = this.ensure()
    if (ctx.state !== 'running') await ctx.resume()
  }

  now(): number {
    return this.ensure().ctx.currentTime
  }

  preview(instrument: Instrument, midi: number): void {
    void this.resume()
    this.playNote(instrument, midi, this.now() + 0.01, 0.3)
  }

  click(time: number, accent: boolean): void {
    const { ctx, master } = this.ensure()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = accent ? 1600 : 1000
    g.gain.setValueAtTime(0.18, time)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04)
    o.connect(g).connect(master)
    o.start(time)
    o.stop(time + 0.05)
  }

  playNote(instrument: Instrument, midi: number, time: number, duration: number): void {
    const { ctx, master } = this.ensure()
    const out = ctx.createGain()
    out.connect(master)
    const end = time + duration
    const stopAt = end + 0.4
    const f = midiToHz(midi)

    switch (instrument) {
      case 'synth': {
        const o1 = ctx.createOscillator()
        const o2 = ctx.createOscillator()
        const o2g = ctx.createGain()
        const lp = ctx.createBiquadFilter()
        o1.type = 'triangle'
        o2.type = 'sawtooth'
        o1.frequency.value = f
        o2.frequency.value = f * 1.003
        o2g.gain.value = 0.25
        lp.type = 'lowpass'
        lp.frequency.setValueAtTime(3200, time)
        lp.frequency.setTargetAtTime(900, time, 0.15)
        o1.connect(lp)
        o2.connect(o2g).connect(lp)
        lp.connect(out)
        envelope(out.gain, time, end, 0.28, 0.16, 0.08)
        for (const o of [o1, o2]) {
          o.start(time)
          o.stop(stopAt)
        }
        break
      }
      case 'piano': {
        const decay = Math.max(0.35, 1.4 * Math.sqrt(262 / f))
        const partials: [number, number][] = [[1, 1], [2, 0.45], [3, 0.25], [4, 0.12], [5, 0.06]]
        for (const [h, amp] of partials) {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.frequency.value = f * h * Math.sqrt(1 + 0.0004 * h * h) // slight inharmonicity
          g.gain.value = (amp * 0.3) / h
          g.gain.setTargetAtTime(0, time, decay / h)
          o.connect(g).connect(out)
          o.start(time)
          o.stop(stopAt)
        }
        envelope(out.gain, time, end, 1, 0.7, decay)
        break
      }
      case 'guitar-clean':
      case 'guitar-dist': {
        const dist = instrument === 'guitar-dist'
        const src = ctx.createBufferSource()
        src.buffer = this.pluck(ctx, midi, dist ? 0.999 : 0.996)
        if (dist) {
          const pre = ctx.createGain()
          const shaper = ctx.createWaveShaper()
          const lp = ctx.createBiquadFilter()
          pre.gain.value = 5
          shaper.curve = this.distCurve
          shaper.oversample = '4x'
          lp.type = 'lowpass'
          lp.frequency.value = 3500
          src.connect(pre).connect(shaper).connect(lp).connect(out)
          envelope(out.gain, time, end, 0.12, 0.1, 0.5)
        } else {
          src.connect(out)
          envelope(out.gain, time, end, 0.6, 0.6, 1)
        }
        src.start(time)
        src.stop(stopAt)
        break
      }
    }
  }

  private pluck(ctx: AudioContext, midi: number, sustain: number): AudioBuffer {
    const key = `${midi}:${sustain}`
    let buf = this.pluckCache.get(key)
    if (!buf) {
      const data = renderPluck(ctx.sampleRate, midiToHz(midi), 3, sustain)
      buf = ctx.createBuffer(1, data.length, ctx.sampleRate)
      buf.getChannelData(0).set(data)
      this.pluckCache.set(key, buf)
    }
    return buf
  }
}

/** Attack, decay towards a sustain level, then release when the note ends. */
function envelope(p: AudioParam, time: number, end: number, peak: number, sustain: number, decay: number) {
  p.setValueAtTime(0, time)
  p.linearRampToValueAtTime(peak, time + 0.006)
  p.setTargetAtTime(sustain, time + 0.006, decay)
  p.setTargetAtTime(0, end, 0.05)
}

export const audioEngine = new AudioEngine()
