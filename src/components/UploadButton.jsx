import { useState } from 'react'
import { ACCEPT, uploadMany } from '../lib/files'

export default function UploadButton({ categoryId, onUploaded }) {
  const [progress, setProgress] = useState(null) // { done, total } while busy
  const [failures, setFailures] = useState([])

  async function handleChange(e) {
    const files = [...e.target.files] // FileList isn't a real array; spread it
    // Clear the input, otherwise picking the same file again fires no change.
    e.target.value = ''
    if (files.length === 0) return

    setFailures([])
    setProgress({ done: 0, total: files.length })
    const failed = await uploadMany(files, categoryId, (done, total) => setProgress({ done, total }))
    setProgress(null)
    setFailures(failed)
    if (failed.length < files.length) onUploaded()
  }

  return (
    <div className="stack">
      {progress ? (
        <div>
          <progress value={progress.done} max={progress.total} />
          <p className="muted small">
            Uploading {progress.done} / {progress.total}… keep the app open.
          </p>
        </div>
      ) : (
        // A <label> wrapping a hidden file input: tapping the label opens the
        // picker, so it can be styled like a normal button.
        <label className="row">
          <span className="primary-button">Upload files</span>
          <input type="file" multiple accept={ACCEPT} onChange={handleChange} hidden />
        </label>
      )}

      {failures.length > 0 && (
        <ul className="error small">
          {failures.map((f, i) => (
            <li key={i}>
              {f.name}: {f.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
