import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectStore } from '@/stores/project'
import RhythmEditor from '../RhythmEditor.vue'

// no audio in jsdom: previews become no-ops
vi.mock('@/audio/engine', () => ({
  audioEngine: { preview: vi.fn(), resume: vi.fn(), now: () => 0, playNote: vi.fn(), click: vi.fn() },
}))

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

function mountEditor() {
  const project = useProjectStore()
  project.select(3, 0) // 4-A, default rhythm: 4 notes of 4 steps
  const wrapper = mount(RhythmEditor, { attachTo: document.body })
  return { project, wrapper }
}

describe('RhythmEditor', () => {
  it('shows one lane per note, in play order', () => {
    const { wrapper } = mountEditor()
    expect(wrapper.findAll('.lane').map((l) => l.find('.nm').text())).toEqual(['C', 'A', 'F#', 'D#'])
  })

  it('moves and resizes a note with the keyboard', async () => {
    const { project, wrapper } = mountEditor()
    const block = wrapper.find('[data-lane="0"] .block')
    await block.trigger('keydown', { key: 'ArrowRight' })
    expect(project.selectedShape.notes[0]).toEqual({ start: 1, length: 4, octave: 4 })
    await wrapper.find('[data-lane="0"] .block').trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect(project.selectedShape.notes[0]).toEqual({ start: 1, length: 5, octave: 4 })
    await wrapper.find('[data-lane="0"] .block').trigger('keydown', { key: 'Delete' })
    expect(project.selectedShape.notes[0]).toBeNull()
    expect(wrapper.find('[data-lane="0"] .add-note').exists()).toBe(true)
  })

  it('reorders lanes with Alt+Down and keeps the rhythm with its note', async () => {
    const { project, wrapper } = mountEditor()
    await wrapper.find('[data-lane="0"] .block').trigger('keydown', { key: 'ArrowDown', altKey: true })
    expect(project.selectedShape.order).toEqual([3, 0, 6, 9])
    expect(project.selectedShape.notes[1]).toEqual({ start: 0, length: 4, octave: 4 })
    expect(wrapper.findAll('.lane .nm').map((n) => n.text())).toEqual(['A', 'C', 'F#', 'D#'])
  })

  it('changes the octave from the lane buttons', async () => {
    const { project, wrapper } = mountEditor()
    await wrapper.find('[aria-label="C octave up"]').trigger('click')
    expect(project.selectedShape.notes[0]?.octave).toBe(5)
  })
})
