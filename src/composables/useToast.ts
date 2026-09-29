import { reactive } from 'vue'

const state = reactive({ message: '', error: false, visible: false })
let timer: ReturnType<typeof setTimeout> | undefined

/** One status message at a time, announced to screen readers by the host element. */
export function useToast() {
  function show(message: string, error = false) {
    state.message = message
    state.error = error
    state.visible = true
    clearTimeout(timer)
    timer = setTimeout(() => (state.visible = false), error ? 5000 : 2600)
  }
  return { state, show }
}
