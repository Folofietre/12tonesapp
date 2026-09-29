import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { CHROMATIC, shapeKey, type ShapeRef } from '@/lib/music'
import { STORAGE_KEY, loadSavedProject } from '@/lib/storage'
import { useProjectStore } from '../project'

const nth = (split: 1 | 2 | 3 | 4 | 6, group: number): ShapeRef => ({ kind: 'nth', split, group })

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('project store', () => {
  it('starts with the Cretaceous Chasm demo on a first visit, showing its first bar', () => {
    const p = useProjectStore()
    expect(p.title).toBe('Cretaceous Chasm (excerpt)')
    expect(p.arrangement).toHaveLength(6)
    expect(p.mode).toBe('run')
    expect(shapeKey(p.selectedRef)).toBe('run6@2')
    expect(p.selectedShape.steps).toBe(40)
  })

  it('edits only the selected shape', () => {
    const p = useProjectStore()
    p.select(nth(4, 2))
    p.setLane(0, null)
    expect(p.getShape(nth(4, 2)).notes[0]).toBeNull()
    expect(p.getShape(nth(4, 1)).notes[0]).not.toBeNull()
  })

  it('switches mode and rotates the groups', () => {
    const p = useProjectStore()
    p.setMode('run')
    p.setSplit(2)
    expect(p.layout.map(shapeKey)).toEqual(['run6@0', 'run6@6'])
    p.rotate(4)
    expect(p.layout.map(shapeKey)).toEqual(['run6@4', 'run6@10'])
    p.rotate(-5)
    expect(p.layout.map(shapeKey)).toEqual(['run6@5', 'run6@11'])
    p.setMode('nth')
    expect(p.layout.map(shapeKey)).toEqual(['2:0', '2:1'])
  })

  it('changes the bar length of the selected shape only', () => {
    const p = useProjectStore()
    p.select(nth(3, 0))
    p.setSteps(20)
    expect(p.selectedShape.steps).toBe(20)
    expect(p.getShape(nth(3, 1)).steps).toBe(16)
  })

  it('reorders lanes and bars', () => {
    const p = useProjectStore()
    p.select(nth(3, 0))
    p.moveLane(0, 1)
    expect(p.selectedShape.order).toEqual([3, 0, 6, 9])
    const ids = p.arrangement.map((c) => c.id)
    p.moveClip(0, 2)
    expect(p.arrangement.map((c) => c.id)).toEqual([ids[1], ids[2], ids[0], ...ids.slice(3)])
  })

  it('swaps two notes of the circle', () => {
    const p = useProjectStore()
    p.setRow(CHROMATIC)
    p.swapPositions(0, 11)
    expect(p.row[0]).toBe(11)
    expect(p.row[11]).toBe(0)
  })

  it('autosaves to localStorage and restores on the next visit', async () => {
    vi.useFakeTimers()
    const p = useProjectStore()
    p.setBpm(140)
    p.setRow(CHROMATIC)
    await nextTick()
    vi.advanceTimersByTime(400)
    vi.useRealTimers()
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"bpm":140')
    expect(loadSavedProject()?.row).toEqual(CHROMATIC)

    setActivePinia(createPinia())
    const again = useProjectStore()
    expect(again.bpm).toBe(140)
    expect(again.row).toEqual(CHROMATIC)
    expect(again.credits).toContain('Blotted Science')
  })

  it('ignores a corrupted save', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    const p = useProjectStore()
    expect(p.arrangement).toHaveLength(6)
  })

  it('clamps the tempo', () => {
    const p = useProjectStore()
    p.setBpm(1000)
    expect(p.bpm).toBe(300)
    p.setBpm(Number.NaN)
    expect(p.bpm).toBe(300)
  })
})
