import { supabase } from './supabase'
import { uploadItem } from './files'
import { listItems, patchItem, removeItem } from './queue'

// The runner: drains the upload queue one file at a time.
// "running" is a lock. Triggers can fire together (app open + online event),
// and without it two runs would upload the same file twice.
let running = false
let runAgain = false

export async function processQueue() {
  if (running) {
    runAgain = true
    return
  }
  if (!navigator.onLine) return
  running = true
  try {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return // logged out: leave the queue alone

    for (const item of await listItems()) {
      if (item.status === 'failed') continue
      await patchItem(item.id, { status: 'uploading', error: '' })
      try {
        await uploadItem(item)
        await removeItem(item.id)
      } catch (e) {
        if (!navigator.onLine) {
          // Connection dropped: not the file's fault. Try again later.
          await patchItem(item.id, { status: 'pending' })
          return
        }
        await patchItem(item.id, { status: 'failed', error: e.message })
      }
    }
  } finally {
    running = false
    if (runAgain) {
      runAgain = false
      await processQueue()
    }
  }
}

// Puts failed items back in line and runs the queue (a "Retry" button).
export async function retryFailed() {
  for (const item of await listItems()) {
    if (item.status === 'failed') await patchItem(item.id, { status: 'pending', error: '' })
  }
  await processQueue()
}

// Call once when the app opens. Runs now, and again whenever the browser
// regains its connection. Returns a function that stops listening.
export function startSync() {
  window.addEventListener('online', processQueue)
  processQueue()
  return () => window.removeEventListener('online', processQueue)
}