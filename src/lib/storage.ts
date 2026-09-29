import { fromConfig, toConfig } from './config'
import type { ProjectData } from './project'

/**
 * Autosave in the browser. The key is prefixed because every repository of a GitHub
 * account shares the same origin (<user>.github.io), hence the same localStorage.
 * Every access is guarded: storage can be disabled or full (private mode, quotas).
 */
export const STORAGE_KEY = 'toneapp.project.v1'

export function loadSavedProject(storage: Storage | undefined = globalThis.localStorage): ProjectData | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return raw ? fromConfig(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveProject(p: ProjectData, storage: Storage | undefined = globalThis.localStorage): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(toConfig(p)))
    return true
  } catch {
    return false
  }
}

export function downloadFile(content: BlobPart, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
