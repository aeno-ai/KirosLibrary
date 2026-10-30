const FULL_MAX_SIDE = 2560
const THUMB_MAX_SIDE = 400

// Only these get re-encoded. GIFs would lose their animation, and PDFs/text
// aren't images at all.
const RESIZABLE = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif']

// Returns { full, thumb }: the Blob to store and a small preview (or null).
export async function prepareFile(file) {
  if (!RESIZABLE.includes(file.type)) return { full: file, thumb: null }

  let bitmap
  try {
    // Decodes the file into raw pixels off the main thread, and applies the
    // photo's EXIF rotation so phone pictures aren't sideways.
    bitmap = await createImageBitmap(file)
  } catch {
    // The browser can't decode it (e.g. HEIC outside Safari). Store the
    // original untouched; it just won't have a thumbnail.
    return { full: file, thumb: null }
  }

  try {
    const thumb = await encode(bitmap, THUMB_MAX_SIDE, 0.8)
    const compressed = await encode(bitmap, FULL_MAX_SIDE, 0.9)
    // Re-encoding an already-compressed JPEG can make it bigger, so keep
    // whichever is smaller. HEIC is always converted: most browsers can't
    // display it, so storing the original would be useless.
    const keepOriginal = compressed.size >= file.size && !file.type.startsWith('image/hei')
    return { full: keepOriginal ? file : compressed, thumb }
  } finally {
    bitmap.close() // free the decoded pixels now instead of waiting for GC
  }
}

// Draws the bitmap onto a canvas no bigger than maxSide and encodes it.
async function encode(bitmap, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const webp = await draw(bitmap, width, height, 'image/webp', quality)
  // Safari can't encode WebP: toBlob silently hands back a PNG instead, which
  // would be huge. Check what we actually got and fall back to JPEG.
  if (webp.type === 'image/webp') return webp
  return draw(bitmap, width, height, 'image/jpeg', quality)
}

function draw(bitmap, width, height, type, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // JPEG has no transparency; transparent pixels would turn black.
  // Paint white underneath first.
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  // toBlob is callback-based; wrapping it in a Promise lets us await it.
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), type, quality),
  )
}
