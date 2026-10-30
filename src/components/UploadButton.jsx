import { useState } from 'react'
import { ACCEPT, uploadMany } from '../lib/files'
import Cat from './Dog'

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

  // A fragment (<>…</>): these pieces sit directly in the parent's .add-bar.
  return (
    <>
      {failures.length > 0 && (
        <div className="card add-bar-card">
          <div className="row">
            <strong className="error small">Couldn't upload:</strong>
            <span className="spacer" />
            <button className="link" onClick={() => setFailures([])} aria-label="Dismiss">
              ✕
            </button>
          </div>
          <ul className="error small">
            {failures.map((f, i) => (
              <li key={i}>
                {f.name}: {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {progress ? (
        <div className="card add-bar-card upload-progress">
          <Cat name="walk" size={60} label="cat walking while uploading" />
          <progress value={progress.done} max={progress.total} />
          <p className="muted small">
            Uploading {progress.done} / {progress.total}… keep the app open.
          </p>
        </div>
      ) : (
        // A <label> wrapping a hidden file input: tapping the label opens the
        // picker, so it can be styled like a button.
        <label className="fab">
          ＋ Upload
          <input type="file" multiple accept={ACCEPT} onChange={handleChange} hidden />
        </label>
      )}
    </>
  )
}
