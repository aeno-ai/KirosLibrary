import { BUCKET, SUPABASE_URL, supabase } from './supabase'
import { escapeLike, unwrap } from './db'
import { prepareFile } from './images'
import { Upload } from 'tus-js-client'

// Validates and compresses a picked file, and reserves its storage paths.
// Returns a queue item (see queue.js). Nothing is uploaded yet.
export async function prepareUpload(file, categoryId) {
  const problem = validate(file)
  if (problem) throw new Error(problem)

  const { full, thumb } = await prepareFile(file)
  const id = newId()
  return {
    id,
    categoryId,
    filename: file.name,
    file_type: full.type,
    size_bytes: full.size,
    storagePath: `${id}.${EXTENSIONS[full.type]}`,
    thumbPath: thumb ? `thumbs/${id}.${EXTENSIONS[thumb.type]}` : null,
    full,
    thumb,
    status: 'pending',
    error: '',
    createdAt: Date.now(),
  }
}

// TUS = a resumable upload protocol. The file is sent in chunks; if the
// connection drops, the next attempt asks the server how much arrived and
// continues from there. The resume info is kept in localStorage under the
// fingerprint, so we use the item id (Blobs have no name to fingerprint).
async function tusUpload(item, onProgress) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in.')

  await new Promise((resolve, reject) => {
    const upload = new Upload(item.full, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${token}`, 'x-upsert': 'true' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // Supabase requires exactly 6 MB chunks
      fingerprint: async () => `kiros-${item.id}`,
      metadata: {
        bucketName: BUCKET,
        objectName: item.storagePath,
        contentType: item.file_type,
        cacheControl: '3600',
      },
      onError: reject,
      onProgress: (sent, total) => onProgress?.(sent, total),
      onSuccess: resolve,
    })
    upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0])
      upload.start()
    }, reject)
  })
}

// Uploads one queue item: full file, thumbnail, then the database row.
// Safe to call again after a failure: every step can be repeated.
export async function uploadItem(item, onProgress) {
  await tusUpload(item, onProgress)

  if (item.thumb) {
    unwrap(
      await storage().upload(item.thumbPath, item.thumb, {
        contentType: item.thumb.type,
        upsert: true,
      }),
    )
  }

  const { error } = await supabase.from('files').insert({
    category_id: item.categoryId,
    filename: item.filename,
    storage_path: item.storagePath,
    thumb_path: item.thumbPath,
    file_type: item.file_type,
    size_bytes: item.size_bytes,
  })
  // 23505 = this storage_path already has a row, so an earlier attempt got
  // as far as the insert. Nothing left to do.
  if (error && error.code !== '23505') throw new Error(error.message)
}

// Must match file_size_limit and allowed_mime_types in supabase/schema.sql.
// The bucket enforces these on the server; checking here too just gives a
// friendlier message before wasting the upload.
export const MAX_BYTES = 25 * 1024 * 1024
const EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
}
export const ACCEPT = Object.keys(EXTENSIONS).join(',')
export const PAGE_SIZE = 48

const storage = () => supabase.storage.from(BUCKET)

export function validate(file) {
  if (!EXTENSIONS[file.type]) return "This file type isn't allowed."
  if (file.size > MAX_BYTES) return 'Bigger than 25 MB.'
  return null
}

export const isImage = (file) => file.file_type.startsWith('image/')

// crypto.randomUUID only exists on HTTPS or localhost. Opening the dev server
// from a phone (http://192.168...) isn't either, so fall back to
// getRandomValues, which works everywhere, and format it as a v4 UUID.
function newId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// One page of files, newest first. Asking for PAGE_SIZE + 1 rows is a cheap
// way to know if there's another page without a separate count query.
export async function listFiles(categoryId, page) {
  const from = page * PAGE_SIZE
  const rows = unwrap(
    await supabase
      .from('files')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE), // range is inclusive: PAGE_SIZE + 1 rows
  )
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE }
}

// Offline, nothing can be signed. This builds the same URL without a token.
// Supabase itself would reject it, but it never gets that far: the service
// worker (public/sw.js) caches files by path and ignores the token, so it
// answers from its cache for anything viewed before.
const offlineUrl = (path) => `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`

// The bucket is private, so <img src> needs a signed URL: a link with a
// token that expires (here after 1 hour). One request signs the whole batch.
export async function signedUrls(paths) {
  const wanted = paths.filter(Boolean)
  if (wanted.length === 0) return new Map()
  const { data, error } = await storage().createSignedUrls(wanted, 3600)
  if (error) {
    if (!navigator.onLine) return new Map(wanted.map((p) => [p, offlineUrl(p)]))
    throw new Error(error.message)
  }
  return new Map(data.filter((r) => r.signedUrl).map((r) => [r.path, r.signedUrl]))
}

// { download } makes the link save the file under its original name.
// Returns null for a download link while offline.
export async function fileUrl(file, { download = false } = {}) {
  const options = download ? { download: file.filename } : undefined
  const { data, error } = await storage().createSignedUrl(file.storage_path, 3600, options)
  if (error) {
    if (!navigator.onLine) return download ? null : offlineUrl(file.storage_path)
    throw new Error(error.message)
  }
  return data.signedUrl
}

export async function deleteFile(file) {
  // Row first, then storage. If the storage step fails we only leave unused
  // bytes behind, instead of a row pointing at a file that no longer exists.
  unwrap(await supabase.from('files').delete().eq('id', file.id))
  await storage().remove([file.storage_path, file.thumb_path].filter(Boolean))
}

// Moving is only a database update: the stored file's path has no category in it.
export async function moveFile(file, categoryId) {
  unwrap(await supabase.from('files').update({ category_id: categoryId }).eq('id', file.id))
}

export async function searchFiles(term) {
  const escaped = escapeLike(term) // see db.js: makes % and _ literal
  return unwrap(
    await supabase
      .from('files')
      // "categories(id, name)" is a join done for us: Supabase follows the
      // category_id foreign key and nests the category inside each row.
      .select('*, categories(id, name)')
      .ilike('filename', `%${escaped}%`) // ilike = case-insensitive LIKE
      .order('created_at', { ascending: false })
      .limit(100),
  )
}
