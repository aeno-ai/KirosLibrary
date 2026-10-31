import { useState } from 'react'
import { ACCEPT, prepareUpload } from '../lib/files'
import { addItem } from '../lib/queue'
import { processQueue } from '../lib/sync'
import Icon from './Icon'
import KiroMascot from './KiroMascot'

// onPick (optional) runs once files are chosen, e.g. to fold up the add menu.
export default function UploadButton({ categoryId, onUploaded, onPick }) {
  const [progress, setProgress] = useState(null)
  const [failures, setFailures] = useState([])

  async function handleChange(e) {
    const files = [...e.target.files] // FileList isn't a real array; spread it
    // Clear the input, otherwise picking the same file again fires no change.
    e.target.value = ''
    if (files.length === 0) return
    onPick?.()

    setFailures([])
    setProgress({ done: 0, total: files.length })
    const failed = []
    let queued = 0

    for (const [index, file] of files.entries()) {
      try {
        await addItem(await prepareUpload(file, categoryId))
        queued += 1
      } catch (error) {
        failed.push({ name: file.name, message: error.message })
      }
      setProgress({ done: index + 1, total: files.length })
    }

    setProgress(null)
    setFailures(failed)
    if (queued) {
      onUploaded()
      try {
        await processQueue()
      } catch (error) {
        setFailures((current) => [...current, { name: 'Queue sync', message: error.message }])
      }
    }
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
              <Icon name="close" />
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
          <KiroMascot mood="happy" size={60} label="Kiro happily preparing uploads" />
          <progress value={progress.done} max={progress.total} />
          <p className="muted small">
            Preparing {progress.done} / {progress.total}…
          </p>
        </div>
      ) : (
        // A <label> wrapping a hidden file input: tapping the label opens the
        // picker, so it can be styled like a button.
        <label className="fab add-option">
          <Icon name="plus" /> Upload
          <input type="file" multiple accept={ACCEPT} onChange={handleChange} hidden />
        </label>
      )}
    </>
  )
}
