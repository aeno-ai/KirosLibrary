import { createStore, del, get, set, values } from 'idb-keyval'

// Offline upload queue, kept in IndexedDB (the browser's built-in database;
// unlike localStorage it can hold big Blobs). One store, keys are item ids.
// An item looks like:
// { id, categoryId, filename, file_type, size_bytes, storagePath, thumbPath,
//   full: Blob, thumb: Blob|null, status: 'pending'|'uploading'|'failed',
//   error: string, createdAt: number }
const store = createStore('kiros-library-queue', 'upload-queue')

// Anyone (e.g. a React hook later) can subscribe to hear about changes.
const listeners = new Set()
function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export async function addItem(item) {
  await set(item.id, item, store)
  notify()
}

// Oldest first, so files upload in the order they were picked.
export async function listItems() {
  const items = await values(store)
  return items.sort((a, b) => a.createdAt - b.createdAt)
}

// Merge a few fields into an existing item (e.g. { status: 'failed' }).
// Does nothing if the item is already gone.
export async function patchItem(id, patch) {
  const item = await get(id, store)
  if (!item) return
  await set(id, { ...item, ...patch }, store)
  notify()
}

export async function removeItem(id) {
  await del(id, store)
  notify()
}